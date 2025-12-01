/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub status for details.
 */

import { LogEntry } from './statisticalAnalysis';

export interface PatternDetectionConfig {
  minLogCount: number;
  timeWindowMs: number;
  confidenceThreshold: number;
  severityThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface DetectedPattern {
  type: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeRange: { start: number; end: number };
  affectedLogs: number;
  metadata: any;
}

export interface PatternDetectionResult {
  patterns: DetectedPattern[];
  summary: {
    totalPatterns: number;
    severityBreakdown: Record<string, number>;
    timeRange: { start: number; end: number };
  };
}

/**
 * Advanced pattern detection for log analysis
 */
export class LogPatternDetector {
  private config: PatternDetectionConfig;

  constructor(config?: Partial<PatternDetectionConfig>) {
    this.config = {
      minLogCount: 10,
      timeWindowMs: 300000, // 5 minutes
      confidenceThreshold: 0.6,
      severityThresholds: {
        low: 0.6,
        medium: 0.7,
        high: 0.8,
        critical: 0.9
      },
      ...config
    };
  }

  /**
   * Detect all patterns in logs
   */
  detectPatterns(logs: LogEntry[]): PatternDetectionResult {
    const patterns: DetectedPattern[] = [];
    
    if (logs.length < this.config.minLogCount) {
      return {
        patterns: [],
        summary: {
          totalPatterns: 0,
          severityBreakdown: {},
          timeRange: { start: 0, end: 0 }
        }
      };
    }

    // Sort logs by timestamp
    const sortedLogs = logs.sort((a, b) => a.timestamp - b.timestamp);
    const timeRange = {
      start: sortedLogs[0].timestamp,
      end: sortedLogs[sortedLogs.length - 1].timestamp
    };

    // Detect different types of patterns
    patterns.push(...this.detectRepeatingPatterns(sortedLogs));
    patterns.push(...this.detectSequentialPatterns(sortedLogs));
    patterns.push(...this.detectAnomalousValues(sortedLogs));
    patterns.push(...this.detectFrequencyPatterns(sortedLogs));
    patterns.push(...this.detectCorrelationPatterns(sortedLogs));
    patterns.push(...this.detectTemporalPatterns(sortedLogs));

    // Filter by confidence threshold
    const filteredPatterns = patterns.filter(p => p.confidence >= this.config.confidenceThreshold);

    // Calculate severity breakdown
    const severityBreakdown = filteredPatterns.reduce((acc, pattern) => {
      acc[pattern.severity] = (acc[pattern.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      patterns: filteredPatterns,
      summary: {
        totalPatterns: filteredPatterns.length,
        severityBreakdown,
        timeRange
      }
    };
  }

  /**
   * Detect repeating patterns in logs
   */
  private detectRepeatingPatterns(logs: LogEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Group logs by message content
    const messageGroups = new Map<string, LogEntry[]>();
    logs.forEach(log => {
      const message = this.extractMessage(log);
      if (message) {
        if (!messageGroups.has(message)) {
          messageGroups.set(message, []);
        }
        messageGroups.get(message)!.push(log);
      }
    });

    // Find frequently repeating messages
    messageGroups.forEach((groupLogs, message) => {
      if (groupLogs.length >= 5) {
        const timeSpan = Math.max(...groupLogs.map(l => l.timestamp)) - 
                        Math.min(...groupLogs.map(l => l.timestamp));
        const frequency = groupLogs.length / (timeSpan / 1000); // occurrences per second
        
        if (frequency > 0.1) { // More than 1 occurrence per 10 seconds
          const confidence = Math.min(0.95, groupLogs.length / 50);
          const severity = this.calculateSeverity(confidence);
          
          patterns.push({
            type: 'repeating_message',
            description: `Message "${message.substring(0, 50)}..." repeated ${groupLogs.length} times`,
            confidence,
            severity,
            timeRange: {
              start: Math.min(...groupLogs.map(l => l.timestamp)),
              end: Math.max(...groupLogs.map(l => l.timestamp))
            },
            affectedLogs: groupLogs.length,
            metadata: { message, frequency, timeSpan }
          });
        }
      }
    });

    return patterns;
  }

  /**
   * Detect sequential patterns (e.g., error sequences)
   */
  private detectSequentialPatterns(logs: LogEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Look for error sequences
    const errorSequences = this.findErrorSequences(logs);
    
    errorSequences.forEach(sequence => {
      if (sequence.length >= 3) {
        const confidence = Math.min(0.9, sequence.length / 10);
        const severity = this.calculateSeverity(confidence);
        
        patterns.push({
          type: 'error_sequence',
          description: `Error sequence detected: ${sequence.length} consecutive errors`,
          confidence,
          severity,
          timeRange: {
            start: sequence[0].timestamp,
            end: sequence[sequence.length - 1].timestamp
          },
          affectedLogs: sequence.length,
          metadata: { sequenceLength: sequence.length, errors: sequence.map(s => this.extractMessage(s)) }
        });
      }
    });

    return patterns;
  }

  /**
   * Detect anomalous values in numeric fields
   */
  private detectAnomalousValues(logs: LogEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Extract numeric fields
    const numericFields = this.extractNumericFields(logs);
    
    numericFields.forEach(field => {
      const values = logs.map(log => log[field]).filter(v => typeof v === 'number' && !isNaN(v));
      
      if (values.length >= 10) {
        const stats = this.calculateStats(values);
        const outliers = values.filter(v => Math.abs(v - stats.mean) > 2 * stats.stdDev);
        
        if (outliers.length > 0) {
          const confidence = Math.min(0.9, outliers.length / values.length);
          const severity = this.calculateSeverity(confidence);
          
          patterns.push({
            type: 'anomalous_values',
            description: `Anomalous values detected in field "${field}": ${outliers.length} outliers`,
            confidence,
            severity,
            timeRange: {
              start: Math.min(...logs.map(l => l.timestamp)),
              end: Math.max(...logs.map(l => l.timestamp))
            },
            affectedLogs: outliers.length,
            metadata: { field, stats, outliers: outliers.slice(0, 10) }
          });
        }
      }
    });

    return patterns;
  }

  /**
   * Detect frequency patterns
   */
  private detectFrequencyPatterns(logs: LogEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Group logs by time windows
    const windowSize = 60000; // 1 minute
    const windows = new Map<number, LogEntry[]>();
    
    logs.forEach(log => {
      const window = Math.floor(log.timestamp / windowSize) * windowSize;
      if (!windows.has(window)) {
        windows.set(window, []);
      }
      windows.get(window)!.push(log);
    });

    const volumes = Array.from(windows.values()).map(logs => logs.length);
    
    if (volumes.length >= 5) {
      const stats = this.calculateStats(volumes);
      const spikes = volumes.filter(v => v > stats.mean + 2 * stats.stdDev);
      const drops = volumes.filter(v => v < stats.mean - 2 * stats.stdDev);
      
      if (spikes.length > 0) {
        const confidence = Math.min(0.9, spikes.length / volumes.length);
        const severity = this.calculateSeverity(confidence);
        
        patterns.push({
          type: 'volume_spikes',
          description: `Volume spikes detected: ${spikes.length} spikes above normal`,
          confidence,
          severity,
          timeRange: {
            start: Math.min(...logs.map(l => l.timestamp)),
            end: Math.max(...logs.map(l => l.timestamp))
          },
          affectedLogs: spikes.reduce((sum, spike) => sum + spike, 0),
          metadata: { spikes, stats }
        });
      }
      
      if (drops.length > 0) {
        const confidence = Math.min(0.9, drops.length / volumes.length);
        const severity = this.calculateSeverity(confidence);
        
        patterns.push({
          type: 'volume_drops',
          description: `Volume drops detected: ${drops.length} drops below normal`,
          confidence,
          severity,
          timeRange: {
            start: Math.min(...logs.map(l => l.timestamp)),
            end: Math.max(...logs.map(l => l.timestamp))
          },
          affectedLogs: drops.reduce((sum, drop) => sum + drop, 0),
          metadata: { drops, stats }
        });
      }
    }

    return patterns;
  }

  /**
   * Detect correlation patterns between fields
   */
  private detectCorrelationPatterns(logs: LogEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    const fields = this.extractRelevantFields(logs);
    
    // Check for field correlations
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const field1 = fields[i];
        const field2 = fields[j];
        
        const correlation = this.calculateCorrelation(logs, field1, field2);
        
        if (Math.abs(correlation) > 0.7) {
          const confidence = Math.abs(correlation);
          const severity = this.calculateSeverity(confidence);
          
          patterns.push({
            type: 'field_correlation',
            description: `Strong correlation between "${field1}" and "${field2}": ${correlation.toFixed(2)}`,
            confidence,
            severity,
            timeRange: {
              start: Math.min(...logs.map(l => l.timestamp)),
              end: Math.max(...logs.map(l => l.timestamp))
            },
            affectedLogs: logs.length,
            metadata: { field1, field2, correlation }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect temporal patterns
   */
  private detectTemporalPatterns(logs: LogEntry[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Group by hour of day
    const hourlyCounts = new Array(24).fill(0);
    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourlyCounts[hour]++;
    });
    
    // Detect peak hours
    const maxCount = Math.max(...hourlyCounts);
    const avgCount = hourlyCounts.reduce((sum, count) => sum + count, 0) / 24;
    
    if (maxCount > avgCount * 2) {
      const peakHours = hourlyCounts.map((count, hour) => ({ hour, count }))
        .filter(h => h.count > avgCount * 1.5)
        .sort((a, b) => b.count - a.count);
      
      const confidence = Math.min(0.9, peakHours.length / 24);
      const severity = this.calculateSeverity(confidence);
      
      patterns.push({
        type: 'temporal_pattern',
        description: `Peak activity detected during hours: ${peakHours.slice(0, 3).map(h => h.hour).join(', ')}`,
        confidence,
        severity,
        timeRange: {
          start: Math.min(...logs.map(l => l.timestamp)),
          end: Math.max(...logs.map(l => l.timestamp))
        },
        affectedLogs: peakHours.reduce((sum, h) => sum + h.count, 0),
        metadata: { peakHours, hourlyCounts }
      });
    }

    return patterns;
  }

  // Helper methods

  private extractMessage(log: LogEntry): string | null {
    const messageFields = ['message', 'msg', 'log', 'text', 'content'];
    
    for (const field of messageFields) {
      if (log[field] && typeof log[field] === 'string') {
        return log[field];
      }
    }
    
    // Fallback to JSON string
    return JSON.stringify(log);
  }

  private extractNumericFields(logs: LogEntry[]): string[] {
    const fields = new Set<string>();
    
    logs.forEach(log => {
      Object.keys(log).forEach(key => {
        const value = log[key];
        if (typeof value === 'number' && !isNaN(value)) {
          fields.add(key);
        }
      });
    });
    
    return Array.from(fields);
  }

  private extractRelevantFields(logs: LogEntry[]): string[] {
    const fields = new Set<string>();
    
    logs.forEach(log => {
      Object.keys(log).forEach(key => {
        const value = log[key];
        if (typeof value === 'string' || typeof value === 'number') {
          fields.add(key);
        }
      });
    });
    
    return Array.from(fields);
  }

  private findErrorSequences(logs: LogEntry[]): LogEntry[][] {
    const sequences: LogEntry[][] = [];
    let currentSequence: LogEntry[] = [];
    
    logs.forEach(log => {
      const message = this.extractMessage(log);
      const isError = message && this.isErrorMessage(message);
      
      if (isError) {
        currentSequence.push(log);
      } else {
        if (currentSequence.length >= 3) {
          sequences.push([...currentSequence]);
        }
        currentSequence = [];
      }
    });
    
    if (currentSequence.length >= 3) {
      sequences.push(currentSequence);
    }
    
    return sequences;
  }

  private isErrorMessage(message: string): boolean {
    const errorKeywords = ['error', 'exception', 'failed', 'timeout', 'denied', 'unauthorized'];
    return errorKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  private calculateStats(values: number[]): { mean: number; stdDev: number; min: number; max: number } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  private calculateCorrelation(logs: LogEntry[], field1: string, field2: string): number {
    const values1: number[] = [];
    const values2: number[] = [];
    
    logs.forEach(log => {
      const val1 = this.getNumericValue(log[field1]);
      const val2 = this.getNumericValue(log[field2]);
      
      if (val1 !== null && val2 !== null) {
        values1.push(val1);
        values2.push(val2);
      }
    });
    
    if (values1.length < 10) return 0;
    
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getNumericValue(value: any): number | null {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    
    return null;
  }

  private calculateSeverity(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= this.config.severityThresholds.critical) return 'critical';
    if (confidence >= this.config.severityThresholds.high) return 'high';
    if (confidence >= this.config.severityThresholds.medium) return 'medium';
    return 'low';
  }
}
