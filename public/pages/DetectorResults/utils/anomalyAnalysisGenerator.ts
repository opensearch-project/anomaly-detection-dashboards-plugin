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

import { analyzeLogsStatistically, LogAnalysisInsight, LogEntry, generateQuestionBasedSummary } from './statisticalAnalysis';
import { LogPatternDetector, DetectedPattern } from './patternDetection';
import { AnomalyData } from '../../../models/interfaces';

export interface ComprehensiveAnalysis {
  id: string;
  type: 'statistical' | 'pattern' | 'temporal' | 'correlation' | 'recommendation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  category: 'performance' | 'errors' | 'volume' | 'patterns' | 'correlations' | 'recommendations';
  timestamp: number;
  data?: any;
  actionable: boolean;
  priority: number; // 1-10, higher is more important
}

export interface AnomalyAnalysisResult {
  insights: ComprehensiveAnalysis[];
  summary: {
    totalInsights: number;
    severityBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    actionableInsights: number;
    highPriorityInsights: number;
  };
  metadata: {
    analysisDuration: number;
    logCount: number;
    patternCount: number;
    statisticalInsightCount: number;
  };
}

/**
 * Main class for generating anomaly analysis from anomaly data
 */
export class AnomalyAnalysisGenerator {
  private patternDetector: LogPatternDetector;

  constructor() {
    this.patternDetector = new LogPatternDetector({
      minLogCount: 5,
      confidenceThreshold: 0.6,
      severityThresholds: {
        low: 0.6,
        medium: 0.7,
        high: 0.8,
        critical: 0.9
      }
    });
  }

  /**
   * Generate anomaly analysis for an anomaly
   */
  async generateAnalysis(
    logs: LogEntry[],
    anomaly: AnomalyData,
    detectorConfig?: any
  ): Promise<AnomalyAnalysisResult> {
    const startTime = Date.now();
    
    // Run both statistical analysis and pattern detection in parallel
    const [statisticalResult, patternResult] = await Promise.all([
      analyzeLogsStatistically(logs, anomaly, detectorConfig),
      this.patternDetector.detectPatterns(logs)
    ]);

    // Convert and merge analysis results
    const insights = this.mergeAnalysis(
      statisticalResult.insights,
      patternResult.patterns,
      anomaly
    );

    // Sort by priority and severity
    insights.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    const analysisDuration = Date.now() - startTime;

    return {
      insights,
      summary: this.generateSummary(insights),
      metadata: {
        analysisDuration,
        logCount: logs.length,
        patternCount: patternResult.patterns.length,
        statisticalInsightCount: statisticalResult.insights.length
      }
    };
  }

  /**
   * Merge statistical analysis results and pattern detection results
   */
  private mergeAnalysis(
    statisticalAnalysis: LogAnalysisInsight[],
    patterns: DetectedPattern[],
    anomaly: AnomalyData
  ): ComprehensiveAnalysis[] {
    const insights: ComprehensiveAnalysis[] = [];
    let insightId = 0;

    // Convert statistical analysis results
    statisticalAnalysis.forEach(insight => {
      insights.push({
        id: `statistical_${insightId++}`,
        type: insight.type as any,
        severity: insight.severity,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        category: this.mapToCategory(insight.type),
        timestamp: Date.now(),
        data: insight.data,
        actionable: this.isActionable(insight),
        priority: this.calculatePriority(insight)
      });
    });

    // Convert pattern insights
    patterns.forEach(pattern => {
      insights.push({
        id: `pattern_${insightId++}`,
        type: 'pattern',
        severity: pattern.severity,
        title: pattern.description,
        description: this.generatePatternDescription(pattern),
        confidence: pattern.confidence,
        category: this.mapPatternToCategory(pattern.type),
        timestamp: Date.now(),
        data: pattern.metadata,
        actionable: this.isPatternActionable(pattern),
        priority: this.calculatePatternPriority(pattern)
      });
    });

    // Add anomaly-specific analysis based on anomaly properties
    insights.push(...this.generateAnomalySpecificInsights(anomaly, insights));

    return insights;
  }

  /**
   * Generate anomaly-specific insights based on anomaly properties
   */
  private generateAnomalySpecificInsights(
    anomaly: AnomalyData,
    existingInsights: ComprehensiveAnalysis[]
  ): ComprehensiveAnalysis[] {
    const insights: ComprehensiveAnalysis[] = [];
    let insightId = existingInsights.length;

    // High anomaly grade insight
    if (anomaly.anomalyGrade > 0.8) {
      insights.push({
        id: `anomaly_${insightId++}`,
        type: 'statistical',
        severity: 'critical',
        title: 'Critical Anomaly Detected',
        description: `Anomaly grade of ${anomaly.anomalyGrade.toFixed(2)} indicates a critical deviation from normal behavior`,
        confidence: 0.95,
        category: 'performance',
        timestamp: Date.now(),
        data: { anomalyGrade: anomaly.anomalyGrade, confidence: anomaly.confidence },
        actionable: true,
        priority: 10
      });
    } else if (anomaly.anomalyGrade > 0.5) {
      insights.push({
        id: `anomaly_${insightId++}`,
        type: 'statistical',
        severity: 'high',
        title: 'High Severity Anomaly',
        description: `Anomaly grade of ${anomaly.anomalyGrade.toFixed(2)} indicates significant deviation from normal behavior`,
        confidence: 0.85,
        category: 'performance',
        timestamp: Date.now(),
        data: { anomalyGrade: anomaly.anomalyGrade, confidence: anomaly.confidence },
        actionable: true,
        priority: 8
      });
    }

    // Low confidence insight
    if (anomaly.confidence < 0.7) {
      insights.push({
        id: `anomaly_${insightId++}`,
        type: 'statistical',
        severity: 'medium',
        title: 'Low Confidence Anomaly',
        description: `Anomaly confidence of ${anomaly.confidence.toFixed(2)} suggests uncertainty in detection`,
        confidence: 0.8,
        category: 'recommendations',
        timestamp: Date.now(),
        data: { confidence: anomaly.confidence },
        actionable: true,
        priority: 6
      });
    }

    // Entity-specific insights
    if (anomaly.entity && anomaly.entity.length > 0) {
      insights.push({
        id: `anomaly_${insightId++}`,
        type: 'correlation',
        severity: 'medium',
        title: 'Entity-Specific Anomaly',
        description: `Anomaly affects specific entities: ${anomaly.entity.map(e => e.value).join(', ')}`,
        confidence: 0.75,
        category: 'correlations',
        timestamp: Date.now(),
        data: { entities: anomaly.entity },
        actionable: true,
        priority: 7
      });
    }

    // Duration-based insights
    const duration = anomaly.endTime - anomaly.startTime;
    if (duration > 300000) {
      insights.push({
        id: `anomaly_${insightId++}`,
        type: 'temporal',
        severity: 'high',
        title: 'Extended Anomaly Duration',
        description: `Anomaly persisted for ${Math.round(duration / 60000)} minutes, indicating a sustained issue`,
        confidence: 0.8,
        category: 'performance',
        timestamp: Date.now(),
        data: { duration, durationMinutes: Math.round(duration / 60000) },
        actionable: true,
        priority: 8
      });
    }

    return insights;
  }

  /**
   * Map insight type to category
   */
  private mapToCategory(type: string): ComprehensiveAnalysis['category'] {
    switch (type) {
      case 'pattern':
        return 'patterns';
      case 'statistical':
        return 'performance';
      case 'temporal':
        return 'volume';
      case 'correlation':
        return 'correlations';
      case 'recommendation':
        return 'recommendations';
      default:
        return 'performance';
    }
  }

  /**
   * Map pattern type to category
   */
  private mapPatternToCategory(patternType: string): ComprehensiveAnalysis['category'] {
    switch (patternType) {
      case 'error_sequence':
      case 'repeating_message':
        return 'errors';
      case 'volume_spikes':
      case 'volume_drops':
        return 'volume';
      case 'anomalous_values':
        return 'performance';
      case 'field_correlation':
        return 'correlations';
      case 'temporal_pattern':
        return 'patterns';
      default:
        return 'patterns';
    }
  }

  /**
   * Generate description for pattern insights
   */
  private generatePatternDescription(pattern: DetectedPattern): string {
    switch (pattern.type) {
      case 'error_sequence':
        return `Consecutive error sequence detected with ${pattern.affectedLogs} errors over ${Math.round((pattern.timeRange.end - pattern.timeRange.start) / 1000)} seconds`;
      case 'repeating_message':
        return `Message pattern repeated ${pattern.affectedLogs} times, indicating potential system issue`;
      case 'volume_spikes':
        return `Traffic spikes detected with ${pattern.affectedLogs} additional log entries`;
      case 'volume_drops':
        return `Traffic drop detected with ${pattern.affectedLogs} fewer log entries than expected`;
      case 'anomalous_values':
        return `Anomalous values detected in ${pattern.metadata.field} field`;
      case 'field_correlation':
        return `Strong correlation detected between ${pattern.metadata.field1} and ${pattern.metadata.field2}`;
      case 'temporal_pattern':
        return `Temporal pattern detected showing peak activity during specific hours`;
      default:
        return pattern.description;
    }
  }

  /**
   * Check if insight is actionable
   */
  private isActionable(insight: LogAnalysisInsight): boolean {
    const actionableTypes = ['recommendation', 'pattern'];
    const actionableKeywords = ['recommend', 'suggest', 'action', 'fix', 'investigate', 'check'];
    
    return actionableTypes.includes(insight.type) ||
           actionableKeywords.some(keyword => 
             insight.title.toLowerCase().includes(keyword) ||
             insight.description.toLowerCase().includes(keyword)
           );
  }

  /**
   * Check if pattern is actionable
   */
  private isPatternActionable(pattern: DetectedPattern): boolean {
    const actionableTypes = ['error_sequence', 'volume_spikes', 'volume_drops', 'anomalous_values'];
    return actionableTypes.includes(pattern.type);
  }

  /**
   * Calculate priority for statistical insights
   */
  private calculatePriority(insight: LogAnalysisInsight): number {
    let priority = 5; // Base priority
    
    // Adjust based on severity
    switch (insight.severity) {
      case 'critical': priority += 4; break;
      case 'high': priority += 3; break;
      case 'medium': priority += 2; break;
      case 'low': priority += 1; break;
    }
    
    // Adjust based on confidence
    priority += Math.round(insight.confidence * 2);
    
    // Adjust based on type
    if (insight.type === 'recommendation') priority += 1;
    if (insight.type === 'pattern') priority += 1;
    
    return Math.min(10, Math.max(1, priority));
  }

  /**
   * Calculate priority for pattern insights
   */
  private calculatePatternPriority(pattern: DetectedPattern): number {
    let priority = 5; // Base priority
    
    // Adjust based on severity
    switch (pattern.severity) {
      case 'critical': priority += 4; break;
      case 'high': priority += 3; break;
      case 'medium': priority += 2; break;
      case 'low': priority += 1; break;
    }
    
    // Adjust based on confidence
    priority += Math.round(pattern.confidence * 2);
    
    // Adjust based on pattern type
    switch (pattern.type) {
      case 'error_sequence': priority += 2; break;
      case 'volume_spikes': priority += 1; break;
      case 'volume_drops': priority += 1; break;
      case 'anomalous_values': priority += 1; break;
    }
    
    return Math.min(10, Math.max(1, priority));
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(insights: ComprehensiveAnalysis[]) {
    const severityBreakdown = insights.reduce((acc, insight) => {
      acc[insight.severity] = (acc[insight.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryBreakdown = insights.reduce((acc, insight) => {
      acc[insight.category] = (acc[insight.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const actionableInsights = insights.filter(i => i.actionable).length;
    const highPriorityInsights = insights.filter(i => i.priority >= 8).length;

    return {
      totalInsights: insights.length,
      severityBreakdown,
      categoryBreakdown,
      actionableInsights,
      highPriorityInsights
    };
  }
}

/**
 * Utility function to format analysis for display using question-based structure
 */
export function formatAnalysisForDisplay(insights: ComprehensiveAnalysis[]): string {
  if (insights.length === 0) {
    return 'No significant patterns or issues detected in the logs.';
  }

  // Convert ComprehensiveAnalysis back to LogAnalysisInsight for the question-based summary
  const logAnalysisInsights: LogAnalysisInsight[] = insights.map(insight => ({
    type: insight.type as any,
    severity: insight.severity,
    title: insight.title,
    description: insight.description,
    confidence: insight.confidence,
    data: insight.data,
    question: insight.category === 'performance' ? 'what_happened' : 
              insight.category === 'errors' ? 'root_cause' :
              insight.category === 'patterns' ? 'patterns' :
              insight.category === 'correlations' ? 'patterns' :
              insight.category === 'recommendations' ? 'recommendations' : 'what_happened'
  }));

  // Use the question-based summary format
  return generateQuestionBasedSummary(logAnalysisInsights);
}


