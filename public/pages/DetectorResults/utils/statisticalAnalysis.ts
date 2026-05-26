/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { AnomalyData } from '../../../models/interfaces';
import { AdvancedStatisticalAnalysis } from './advancedStatisticalAnalysis';

export interface LogAnalysisInsight {
  type: 'pattern' | 'statistical' | 'temporal' | 'correlation' | 'recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number; // 0-1
  data?: any; // Supporting data for the insight
  question?: 'what_happened' | 'root_cause' | 'patterns' | 'recommendations'; // Which question this insight answers
}

export interface StatisticalAnalysisResult {
  insights: LogAnalysisInsight[];
  summary: {
    totalLogs: number;
    anomalyDuration: number;
    timeRange: { start: number; end: number };
    keyMetrics: {
      errorRate?: number;
      responseTime?: number;
      throughput?: number;
      uniqueUsers?: number;
    };
  };
}

export interface LogEntry {
  timestamp: number;
  level?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Main function to analyze logs and generate insights without LLM
 */
export async function analyzeLogsStatistically(
  logs: LogEntry[],
  anomalyContext: AnomalyData,
  detectorConfig?: any
): Promise<StatisticalAnalysisResult> {
  const insights: LogAnalysisInsight[] = [];
  
  // Sort logs by timestamp
  const sortedLogs = logs.sort((a, b) => a.timestamp - b.timestamp);
  
  // Generate basic insights
  insights.push(...analyzeTemporalPatterns(sortedLogs, anomalyContext));
  insights.push(...analyzeErrorPatterns(sortedLogs, anomalyContext));
  insights.push(...analyzePerformancePatterns(sortedLogs, anomalyContext));
  insights.push(...analyzeCorrelationPatterns(sortedLogs, anomalyContext));
  insights.push(...analyzeVolumePatterns(sortedLogs, anomalyContext));
  
  const advancedAnalysis = new AdvancedStatisticalAnalysis();
  
  try {
    // Always run advanced analysis, even with minimal fields
    
    // Add synthetic fields if we don't have enough numeric fields
    const enhancedLogs = enhanceLogsWithSyntheticFields(sortedLogs);
    const enhancedNumericFields = extractNumericFields(enhancedLogs);
    const enhancedCategoricalFields = extractCategoricalFields(enhancedLogs);
    const enhancedAllFields = [...enhancedNumericFields, ...enhancedCategoricalFields];
    
    // Correlation analysis
    const correlations = advancedAnalysis.calculateFieldCorrelations(enhancedLogs, enhancedNumericFields);
    
    // Time series analysis
    const timeSeriesPatterns = enhancedNumericFields.flatMap(field =>
      advancedAnalysis.detectTimeSeriesPatterns(enhancedLogs, field)
    );
    
    // Causal analysis
    const causalRelationships = advancedAnalysis.performCausalAnalysis(enhancedLogs, enhancedAllFields);
    
    // Anomaly clustering (if we have multiple anomalies)
    const anomalies = [anomalyContext]; // In real implementation, this would be multiple anomalies
    const clusters = advancedAnalysis.clusterAnomalies(anomalies);
    
    // Statistical significance testing
    const significanceTests = advancedAnalysis.performSignificanceTests(
      enhancedLogs, 
      anomalyContext.startTime, 
      3600000 // 1 hour window
    );
    
    // Generate advanced insights
    const advancedInsights = advancedAnalysis.generateAdvancedInsights(
      enhancedLogs,
      anomalyContext,
      correlations,
      timeSeriesPatterns,
      causalRelationships,
      clusters,
      significanceTests
    );
    
    insights.push(...advancedInsights);
  } catch (error) {
    console.error('Advanced statistical analysis failed:', error);
    // Continue with basic analysis
  }
  
  // Generate recommendations based on all insights
  insights.push(...generateRecommendations(sortedLogs, anomalyContext, insights));
  
  // Sort insights by severity and confidence
  insights.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return b.confidence - a.confidence;
  });
  
  return {
    insights,
    summary: generateSummary(sortedLogs, anomalyContext)
  };
}

/**
 * Extract numeric fields from logs
 */
function extractNumericFields(logs: LogEntry[]): string[] {
  const fields = new Set<string>();
  
  logs.forEach(log => {
    Object.keys(log).forEach(key => {
      const value = (log as any)[key];
      if (typeof value === 'number' || !isNaN(parseFloat(String(value)))) {
        fields.add(key);
      }
    });
  });
  
  return Array.from(fields);
}

/**
 * Extract categorical fields from logs
 */
function extractCategoricalFields(logs: LogEntry[]): string[] {
  const fields = new Set<string>();
  
  logs.forEach(log => {
    Object.keys(log).forEach(key => {
      const value = (log as any)[key];
      if (typeof value === 'string' && value.length > 0) {
        fields.add(key);
      }
    });
  });
  
  return Array.from(fields);
}

/**
 * Enhance logs with synthetic fields for better analysis
 */
function enhanceLogsWithSyntheticFields(logs: LogEntry[]): LogEntry[] {
  return logs.map((log, index) => {
    const enhanced = { ...log };
    
    // Add synthetic numeric fields
    enhanced.log_index = index;
    enhanced.message_length = log.message?.length || 0;
    enhanced.timestamp_hour = new Date(log.timestamp).getHours();
    enhanced.timestamp_minute = new Date(log.timestamp).getMinutes();
    enhanced.timestamp_day_of_week = new Date(log.timestamp).getDay();
    
    // Add level as numeric
    const levelMap = { 'error': 4, 'warn': 3, 'info': 2, 'debug': 1 };
    enhanced.level_numeric = levelMap[log.level as keyof typeof levelMap] || 0;
    
    // Add synthetic categorical fields
    const message = log.message || '';
    enhanced.message_type = message.includes('error') ? 'error' : 
                           message.includes('warn') ? 'warning' : 
                           message.includes('timeout') ? 'timeout' : 'info';
    
    enhanced.time_period = log.timestamp % 86400000 < 43200000 ? 'morning' : 'afternoon';
    
    return enhanced;
  });
}

/**
 * Analyze temporal patterns in logs
 */
function analyzeTemporalPatterns(logs: LogEntry[], anomaly: AnomalyData): LogAnalysisInsight[] {
  const insights: LogAnalysisInsight[] = [];
  
  // Define time windows
  const anomalyStart = anomaly.startTime;
  const anomalyEnd = anomaly.endTime;
  const beforeWindow = anomalyStart - (10 * 60 * 1000); // 10 minutes before
  const afterWindow = anomalyEnd + (10 * 60 * 1000); // 10 minutes after
  
  const beforeLogs = logs.filter(log => log.timestamp >= beforeWindow && log.timestamp < anomalyStart);
  const duringLogs = logs.filter(log => log.timestamp >= anomalyStart && log.timestamp <= anomalyEnd);
  const afterLogs = logs.filter(log => log.timestamp > anomalyEnd && log.timestamp <= afterWindow);
  
  // Check for sudden spikes in log volume
  const beforeVolume = beforeLogs.length;
  const duringVolume = duringLogs.length;
  const afterVolume = afterLogs.length;
  
  if (duringVolume > 0) {
    const volumeIncrease = beforeVolume > 0 ? (duringVolume / beforeVolume) : duringVolume;
    
    if (volumeIncrease > 3) {
      insights.push({
        type: 'temporal',
        severity: 'high',
        title: 'Log Volume Spike Detected',
        description: `Log volume increased ${volumeIncrease.toFixed(1)}x during the anomaly period (${beforeVolume} → ${duringVolume} logs)`,
        confidence: Math.min(0.9, volumeIncrease / 10),
        data: { beforeVolume, duringVolume, afterVolume, volumeIncrease },
        question: 'what_happened'
      });
    } else if (volumeIncrease > 1.5) {
      insights.push({
        type: 'temporal',
        severity: 'medium',
        title: 'Moderate Log Volume Increase',
        description: `Log volume increased ${volumeIncrease.toFixed(1)}x during the anomaly period`,
        confidence: Math.min(0.7, volumeIncrease / 5),
        data: { beforeVolume, duringVolume, afterVolume, volumeIncrease },
        question: 'what_happened'
      });
    }
  }
  
  // Check for log volume drop
  if (beforeVolume > 0 && duringVolume < beforeVolume * 0.5) {
    insights.push({
      type: 'temporal',
      severity: 'high',
      title: 'Log Volume Drop Detected',
      description: `Log volume dropped significantly during anomaly (${beforeVolume} → ${duringVolume} logs)`,
      confidence: 0.8,
      data: { beforeVolume, duringVolume, afterVolume },
      question: 'what_happened'
    });
  }
  
  return insights;
}

/**
 * Analyze error patterns in logs
 */
function analyzeErrorPatterns(logs: LogEntry[], anomaly: AnomalyData): LogAnalysisInsight[] {
  const insights: LogAnalysisInsight[] = [];
  
  const anomalyStart = anomaly.startTime;
  const anomalyEnd = anomaly.endTime;
  const beforeWindow = anomalyStart - (10 * 60 * 1000);
  
  const beforeLogs = logs.filter(log => log.timestamp >= beforeWindow && log.timestamp < anomalyStart);
  const duringLogs = logs.filter(log => log.timestamp >= anomalyStart && log.timestamp <= anomalyEnd);
  
  // Extract error logs (common patterns)
  const errorPatterns = ['error', 'exception', 'failed', 'timeout', 'denied', 'unauthorized', '500', '502', '503', '504'];
  
  const beforeErrors = beforeLogs.filter(log => 
    errorPatterns.some(pattern => 
      JSON.stringify(log).toLowerCase().includes(pattern)
    )
  );
  
  const duringErrors = duringLogs.filter(log => 
    errorPatterns.some(pattern => 
      JSON.stringify(log).toLowerCase().includes(pattern)
    )
  );
  
  const beforeErrorRate = beforeLogs.length > 0 ? beforeErrors.length / beforeLogs.length : 0;
  const duringErrorRate = duringLogs.length > 0 ? duringErrors.length / duringLogs.length : 0;
  
  if (duringErrorRate > 0.1) { // More than 10% error rate
    insights.push({
      type: 'pattern',
      severity: 'critical',
      title: 'High Error Rate During Anomaly',
      description: `${(duringErrorRate * 100).toFixed(1)}% of logs during anomaly period contained errors (${duringErrors.length}/${duringLogs.length})`,
      confidence: Math.min(0.95, duringErrorRate * 2),
      data: { beforeErrorRate, duringErrorRate, errorCount: duringErrors.length },
      question: 'what_happened'
    });
    
    // Also add as potential root cause
    insights.push({
      type: 'pattern',
      severity: 'critical',
      title: 'Error Spike as Root Cause',
      description: `The high error rate (${(duringErrorRate * 100).toFixed(1)}%) during the anomaly period suggests system errors may be the root cause of the detected anomaly`,
      confidence: Math.min(0.9, duringErrorRate * 1.5),
      data: { beforeErrorRate, duringErrorRate, errorCount: duringErrors.length },
      question: 'root_cause'
    });
  } else if (duringErrorRate > beforeErrorRate * 2 && duringErrorRate > 0.05) {
    insights.push({
      type: 'pattern',
      severity: 'high',
      title: 'Error Rate Increase',
      description: `Error rate increased from ${(beforeErrorRate * 100).toFixed(1)}% to ${(duringErrorRate * 100).toFixed(1)}% during anomaly`,
      confidence: 0.8,
      data: { beforeErrorRate, duringErrorRate, errorCount: duringErrors.length },
      question: 'what_happened'
    });
    
    insights.push({
      type: 'pattern',
      severity: 'high',
      title: 'Error Increase as Contributing Factor',
      description: `The ${(duringErrorRate / beforeErrorRate).toFixed(1)}x increase in error rate may be contributing to the anomaly`,
      confidence: 0.7,
      data: { beforeErrorRate, duringErrorRate, errorCount: duringErrors.length },
      question: 'root_cause'
    });
  }
  
  // Analyze specific error types
  const errorTypes = analyzeErrorTypes(duringErrors);
  if (errorTypes.length > 0) {
    insights.push({
      type: 'pattern',
      severity: 'medium',
      title: 'Common Error Types Detected',
      description: `Most frequent errors: ${errorTypes.slice(0, 3).map(e => e.type).join(', ')}`,
      confidence: 0.7,
      data: { errorTypes: errorTypes.slice(0, 5) },
      question: 'patterns'
    });
  }
  
  return insights;
}

/**
 * Analyze performance patterns
 */
function analyzePerformancePatterns(logs: LogEntry[], anomaly: AnomalyData): LogAnalysisInsight[] {
  const insights: LogAnalysisInsight[] = [];
  
  const anomalyStart = anomaly.startTime;
  const anomalyEnd = anomaly.endTime;
  const beforeWindow = anomalyStart - (10 * 60 * 1000);
  
  const beforeLogs = logs.filter(log => log.timestamp >= beforeWindow && log.timestamp < anomalyStart);
  const duringLogs = logs.filter(log => log.timestamp >= anomalyStart && log.timestamp <= anomalyEnd);
  
  // Extract response times (common field names)
  const responseTimeFields = ['response_time', 'duration', 'latency', 'execution_time', 'processing_time'];
  
  const beforeResponseTimes = extractNumericValues(beforeLogs, responseTimeFields);
  const duringResponseTimes = extractNumericValues(duringLogs, responseTimeFields);
  
  if (beforeResponseTimes.length > 0 && duringResponseTimes.length > 0) {
    const beforeAvg = beforeResponseTimes.reduce((a, b) => a + b, 0) / beforeResponseTimes.length;
    const duringAvg = duringResponseTimes.reduce((a, b) => a + b, 0) / duringResponseTimes.length;
    
    if (duringAvg > beforeAvg * 2) {
      insights.push({
        type: 'statistical',
        severity: 'high',
        title: 'Response Time Degradation',
        description: `Average response time increased from ${beforeAvg.toFixed(0)}ms to ${duringAvg.toFixed(0)}ms (${(duringAvg/beforeAvg).toFixed(1)}x increase)`,
        confidence: 0.9,
        data: { beforeAvg, duringAvg, increaseFactor: duringAvg/beforeAvg },
        question: 'what_happened'
      });
      
      insights.push({
        type: 'statistical',
        severity: 'high',
        title: 'Performance Degradation as Root Cause',
        description: `The ${(duringAvg/beforeAvg).toFixed(1)}x increase in response time (${beforeAvg.toFixed(0)}ms → ${duringAvg.toFixed(0)}ms) likely caused the anomaly`,
        confidence: 0.85,
        data: { beforeAvg, duringAvg, increaseFactor: duringAvg/beforeAvg },
        question: 'root_cause'
      });
    } else if (duringAvg > beforeAvg * 1.5) {
      insights.push({
        type: 'statistical',
        severity: 'medium',
        title: 'Moderate Response Time Increase',
        description: `Response time increased from ${beforeAvg.toFixed(0)}ms to ${duringAvg.toFixed(0)}ms`,
        confidence: 0.7,
        data: { beforeAvg, duringAvg, increaseFactor: duringAvg/beforeAvg },
        question: 'what_happened'
      });
      
      insights.push({
        type: 'statistical',
        severity: 'medium',
        title: 'Performance Impact as Contributing Factor',
        description: `The ${(duringAvg/beforeAvg).toFixed(1)}x response time increase may be contributing to the anomaly`,
        confidence: 0.6,
        data: { beforeAvg, duringAvg, increaseFactor: duringAvg/beforeAvg },
        question: 'root_cause'
      });
    }
  }
  
  return insights;
}

/**
 * Analyze correlation patterns
 */
function analyzeCorrelationPatterns(logs: LogEntry[], anomaly: AnomalyData): LogAnalysisInsight[] {
  const insights: LogAnalysisInsight[] = [];
  
  const anomalyStart = anomaly.startTime;
  const anomalyEnd = anomaly.endTime;
  
  const duringLogs = logs.filter(log => log.timestamp >= anomalyStart && log.timestamp <= anomalyEnd);
  
  // Analyze field correlations
  const fieldCorrelations = analyzeFieldCorrelations(duringLogs);
  
  if (fieldCorrelations.length > 0) {
    insights.push({
      type: 'correlation',
      severity: 'medium',
      title: 'Field Correlations Detected',
      description: `Strong correlations found between: ${fieldCorrelations.slice(0, 2).map(c => c.fields.join(' ↔ ')).join(', ')}`,
      confidence: fieldCorrelations[0].strength,
      data: { correlations: fieldCorrelations.slice(0, 3) },
      question: 'patterns'
    });
  }
  
  // Analyze time-based patterns
  const timePatterns = analyzeTimePatterns(duringLogs);
  if (timePatterns.length > 0) {
    insights.push({
      type: 'temporal',
      severity: 'low',
      title: 'Temporal Patterns Detected',
      description: `Logs show patterns: ${timePatterns.slice(0, 2).map(p => p.pattern).join(', ')}`,
      confidence: timePatterns[0].confidence,
      data: { patterns: timePatterns.slice(0, 3) },
      question: 'patterns'
    });
  }
  
  return insights;
}

/**
 * Analyze volume patterns
 */
function analyzeVolumePatterns(logs: LogEntry[], anomaly: AnomalyData): LogAnalysisInsight[] {
  const insights: LogAnalysisInsight[] = [];
  
  const anomalyStart = anomaly.startTime;
  const anomalyEnd = anomaly.endTime;
  
  // Group logs by minute
  const logsByMinute = new Map<number, LogEntry[]>();
  logs.forEach(log => {
    const minute = Math.floor(log.timestamp / 60000) * 60000;
    if (!logsByMinute.has(minute)) {
      logsByMinute.set(minute, []);
    }
    logsByMinute.get(minute)!.push(log);
  });
  
  const minuteVolumes = Array.from(logsByMinute.entries())
    .filter(([minute]) => minute >= anomalyStart - 600000 && minute <= anomalyEnd + 600000)
    .map(([minute, logs]) => ({ minute, count: logs.length }))
    .sort((a, b) => a.minute - b.minute);
  
  if (minuteVolumes.length > 5) {
    // Calculate rolling average and detect spikes
    const windowSize = 3;
    const spikes = detectVolumeSpikes(minuteVolumes, windowSize);
    
    if (spikes.length > 0) {
      insights.push({
        type: 'temporal',
        severity: 'medium',
        title: 'Volume Spikes Detected',
        description: `Found ${spikes.length} volume spikes during anomaly period`,
        confidence: 0.8,
        data: { spikes: spikes.slice(0, 5) },
        question: 'what_happened'
      });
      
      insights.push({
        type: 'temporal',
        severity: 'medium',
        title: 'Traffic Spikes as Contributing Factor',
        description: `The ${spikes.length} volume spikes may have contributed to the anomaly by overwhelming system capacity`,
        confidence: 0.7,
        data: { spikes: spikes.slice(0, 5) },
        question: 'root_cause'
      });
    }
  }
  
  return insights;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(logs: LogEntry[], anomaly: AnomalyData, insights: LogAnalysisInsight[]): LogAnalysisInsight[] {
  const recommendations: LogAnalysisInsight[] = [];
  
  // Analyze insights to generate recommendations
  const criticalInsights = insights.filter(i => i.severity === 'critical');
  
  if (criticalInsights.length > 0) {
    recommendations.push({
      type: 'recommendation',
      severity: 'high',
      title: 'Immediate Investigation Required',
      description: 'Critical issues detected that require immediate attention. Check system health and error logs.',
      confidence: 0.9,
      data: { insightCount: criticalInsights.length },
      question: 'recommendations'
    });
  }
  
  const errorInsights = insights.filter(i => i.title.toLowerCase().includes('error'));
  if (errorInsights.length > 0) {
    recommendations.push({
      type: 'recommendation',
      severity: 'medium',
      title: 'Error Analysis Recommended',
      description: 'Multiple error patterns detected. Consider implementing error monitoring and alerting.',
      confidence: 0.8,
      data: { errorInsightCount: errorInsights.length },
      question: 'recommendations'
    });
  }
  
  const performanceInsights = insights.filter(i => i.title.toLowerCase().includes('response') || i.title.toLowerCase().includes('performance'));
  if (performanceInsights.length > 0) {
    recommendations.push({
      type: 'recommendation',
      severity: 'medium',
      title: 'Performance Optimization',
      description: 'Performance degradation detected. Consider scaling resources or optimizing queries.',
      confidence: 0.7,
      data: { performanceInsightCount: performanceInsights.length },
      question: 'recommendations'
    });
  }
  
  // Add more specific recommendations based on patterns found
  const correlationInsights = insights.filter(i => i.title.toLowerCase().includes('correlation'));
  if (correlationInsights.length > 0) {
    recommendations.push({
      type: 'recommendation',
      severity: 'low',
      title: 'Monitor Correlated Metrics',
      description: 'Strong correlations detected between metrics. Set up monitoring for these related indicators.',
      confidence: 0.6,
      data: { correlationInsightCount: correlationInsights.length },
      question: 'recommendations'
    });
  }
  
  const patternInsights = insights.filter(i => i.title.toLowerCase().includes('pattern') || i.title.toLowerCase().includes('cluster'));
  if (patternInsights.length > 0) {
    recommendations.push({
      type: 'recommendation',
      severity: 'low',
      title: 'Investigate Recurring Patterns',
      description: 'Patterns detected in the data. Consider investigating if these patterns indicate recurring issues.',
      confidence: 0.6,
      data: { patternInsightCount: patternInsights.length },
      question: 'recommendations'
    });
  }
  
  // Always add a general recommendation if we have insights
  if (insights.length > 0 && recommendations.length === 0) {
    recommendations.push({
      type: 'recommendation',
      severity: 'low',
      title: 'Review Analysis Results',
      description: 'Analysis completed with findings. Review the insights above to understand what happened and plan next steps.',
      confidence: 0.7,
      data: { totalInsights: insights.length },
      question: 'recommendations'
    });
  }
  
  return recommendations;
}

/**
 * Generate summary statistics
 */
function generateSummary(logs: LogEntry[], anomaly: AnomalyData) {
  const anomalyStart = anomaly.startTime;
  const anomalyEnd = anomaly.endTime;
  const beforeWindow = anomalyStart - (10 * 60 * 1000);
  const afterWindow = anomalyEnd + (10 * 60 * 1000);
  
  // Extract key metrics
  const errorPatterns = ['error', 'exception', 'failed', 'timeout'];
  const errorCount = logs.filter(log => 
    errorPatterns.some(pattern => 
      JSON.stringify(log).toLowerCase().includes(pattern)
    )
  ).length;
  
  const responseTimeFields = ['response_time', 'duration', 'latency'];
  const responseTimes = extractNumericValues(logs, responseTimeFields);
  const avgResponseTime = responseTimes.length > 0 ? 
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : undefined;
  
  return {
    totalLogs: logs.length,
    anomalyDuration: anomalyEnd - anomalyStart,
    timeRange: { start: anomalyStart, end: anomalyEnd },
    keyMetrics: {
      errorRate: logs.length > 0 ? errorCount / logs.length : 0,
      responseTime: avgResponseTime,
      throughput: logs.length / ((afterWindow - beforeWindow) / 1000), // logs per second
      uniqueUsers: extractUniqueUsers(logs).length
    }
  };
}

// Helper functions

function extractNumericValues(logs: LogEntry[], fields: string[]): number[] {
  const values: number[] = [];
  
  logs.forEach(log => {
    fields.forEach(field => {
      const value = log[field];
      if (typeof value === 'number' && !isNaN(value)) {
        values.push(value);
      } else if (typeof value === 'string') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          values.push(numValue);
        }
      }
    });
  });
  
  return values;
}

function analyzeErrorTypes(errorLogs: LogEntry[]): Array<{type: string, count: number}> {
  const errorTypes = new Map<string, number>();
  
  errorLogs.forEach(log => {
    const logStr = JSON.stringify(log).toLowerCase();
    
    if (logStr.includes('timeout')) errorTypes.set('timeout', (errorTypes.get('timeout') || 0) + 1);
    if (logStr.includes('unauthorized')) errorTypes.set('unauthorized', (errorTypes.get('unauthorized') || 0) + 1);
    if (logStr.includes('500')) errorTypes.set('server_error', (errorTypes.get('server_error') || 0) + 1);
    if (logStr.includes('404')) errorTypes.set('not_found', (errorTypes.get('not_found') || 0) + 1);
    if (logStr.includes('exception')) errorTypes.set('exception', (errorTypes.get('exception') || 0) + 1);
  });
  
  return Array.from(errorTypes.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

function analyzeFieldCorrelations(logs: LogEntry[]): Array<{fields: string[], strength: number}> {
  // Simple correlation analysis - look for fields that appear together frequently
  const correlations: Array<{fields: string[], strength: number}> = [];
  
  if (logs.length < 10) return correlations;
  
  const fieldPairs = new Map<string, number>();
  const fieldCounts = new Map<string, number>();
  
  logs.forEach(log => {
    const fields = Object.keys(log).filter(key => 
      typeof log[key] === 'string' || typeof log[key] === 'number'
    );
    
    fields.forEach(field => {
      fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
    });
    
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const pair = [fields[i], fields[j]].sort().join('|');
        fieldPairs.set(pair, (fieldPairs.get(pair) || 0) + 1);
      }
    }
  });
  
  fieldPairs.forEach((count, pair) => {
    const [field1, field2] = pair.split('|');
    const field1Count = fieldCounts.get(field1) || 0;
    const field2Count = fieldCounts.get(field2) || 0;
    
    if (field1Count > 5 && field2Count > 5) {
      const strength = count / Math.min(field1Count, field2Count);
      if (strength > 0.7) {
        correlations.push({
          fields: [field1, field2],
          strength
        });
      }
    }
  });
  
  return correlations.sort((a, b) => b.strength - a.strength);
}

function analyzeTimePatterns(logs: LogEntry[]): Array<{pattern: string, confidence: number}> {
  const patterns: Array<{pattern: string, confidence: number}> = [];
  
  if (logs.length < 20) return patterns;
  
  // Group by minute and analyze patterns
  const logsByMinute = new Map<number, number>();
  logs.forEach(log => {
    const minute = Math.floor(log.timestamp / 60000) * 60000;
    logsByMinute.set(minute, (logsByMinute.get(minute) || 0) + 1);
  });
  
  const volumes = Array.from(logsByMinute.values()).sort((a, b) => a - b);
  const q1 = volumes[Math.floor(volumes.length / 4)];
  const q3 = volumes[Math.floor(volumes.length * 3 / 4)];
  
  // Detect burst patterns
  const burstCount = volumes.filter(v => v > q3 * 1.5).length;
  if (burstCount > volumes.length * 0.2) {
    patterns.push({
      pattern: 'bursty traffic',
      confidence: Math.min(0.9, burstCount / volumes.length)
    });
  }
  
  // Detect steady patterns
  const steadyCount = volumes.filter(v => v >= q1 && v <= q3).length;
  if (steadyCount > volumes.length * 0.6) {
    patterns.push({
      pattern: 'steady traffic',
      confidence: Math.min(0.8, steadyCount / volumes.length)
    });
  }
  
  return patterns;
}

function detectVolumeSpikes(volumes: Array<{minute: number, count: number}>, windowSize: number): Array<{minute: number, count: number, spikeFactor: number}> {
  const spikes: Array<{minute: number, count: number, spikeFactor: number}> = [];
  
  for (let i = windowSize; i < volumes.length - windowSize; i++) {
    const current = volumes[i];
    const before = volumes.slice(i - windowSize, i);
    const after = volumes.slice(i + 1, i + windowSize + 1);
    
    const beforeAvg = before.reduce((sum, v) => sum + v.count, 0) / before.length;
    const afterAvg = after.reduce((sum, v) => sum + v.count, 0) / after.length;
    const baselineAvg = (beforeAvg + afterAvg) / 2;
    
    if (current.count > baselineAvg * 2) {
      spikes.push({
        minute: current.minute,
        count: current.count,
        spikeFactor: current.count / baselineAvg
      });
    }
  }
  
  return spikes.sort((a, b) => b.spikeFactor - a.spikeFactor);
}

function extractUniqueUsers(logs: LogEntry[]): string[] {
  const users = new Set<string>();
  const userFields = ['user_id', 'user', 'username', 'userId', 'client_id'];
  
  logs.forEach(log => {
    userFields.forEach(field => {
      const value = log[field];
      if (typeof value === 'string' && value.length > 0) {
        users.add(value);
      }
    });
  });
  
  return Array.from(users);
}

/**
 * Format insights organized by the three key questions
 */
export function formatInsightsByQuestions(insights: LogAnalysisInsight[]): {
  whatHappened: LogAnalysisInsight[];
  rootCause: LogAnalysisInsight[];
  patterns: LogAnalysisInsight[];
  recommendations: LogAnalysisInsight[];
} {
  return {
    whatHappened: insights.filter(i => i.question === 'what_happened'),
    rootCause: insights.filter(i => i.question === 'root_cause'),
    patterns: insights.filter(i => i.question === 'patterns'),
    recommendations: insights.filter(i => i.question === 'recommendations')
  };
}

/**
 * Generate a structured summary answering the three key questions
 */
export function generateQuestionBasedSummary(insights: LogAnalysisInsight[]): string {
  const categorized = formatInsightsByQuestions(insights);
  
  let summary = '';
  
  // What happened around the anomaly time
  if (categorized.whatHappened.length > 0) {
    summary += 'What Was Happening During This Issue?\n';
    categorized.whatHappened.slice(0, 3).forEach(insight => {
      summary += `• ${insight.title}: ${insight.description}\n`;
    });
    summary += '\n';
  }
  
  // Potential root cause or contributing factors
  if (categorized.rootCause.length > 0) {
    summary += 'What Might Have Caused This Problem?\n';
    categorized.rootCause.slice(0, 3).forEach(insight => {
      summary += `• ${insight.title}: ${insight.description}\n`;
    });
    summary += '\n';
  }
  
  // Patterns or correlations
  if (categorized.patterns.length > 0) {
    summary += 'What Patterns Did We Find?\n';
    categorized.patterns.slice(0, 3).forEach(insight => {
      summary += `• ${insight.title}: ${insight.description}\n`;
    });
    summary += '\n';
  }
  
  // Recommendations
  if (categorized.recommendations.length > 0) {
    summary += 'What Should We Do Next?\n';
    categorized.recommendations.forEach(insight => {
      summary += `• ${insight.title}: ${insight.description}\n`;
    });
  }
  
  return summary.trim();
}
