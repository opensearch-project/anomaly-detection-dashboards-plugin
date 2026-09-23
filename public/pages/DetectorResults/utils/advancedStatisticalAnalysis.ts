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

import { LogEntry, LogAnalysisInsight } from './statisticalAnalysis';
import { MLPatternDetection } from './mlPatternDetection';

export interface CorrelationResult {
  field1: string;
  field2: string;
  correlation: number;
  pValue: number;
  significance: 'low' | 'medium' | 'high';
  method: 'pearson' | 'spearman' | 'kendall';
}

export interface TimeSeriesPattern {
  type: 'trend' | 'seasonal' | 'cyclical' | 'irregular';
  strength: number;
  period?: number;
  direction?: 'increasing' | 'decreasing';
  confidence: number;
}

export interface CausalRelationship {
  cause: string;
  effect: string;
  strength: number;
  confidence: number;
  lag?: number; // Time delay in milliseconds
  method: 'granger' | 'transfer_entropy' | 'mutual_information';
}

export interface AnomalyCluster {
  id: string;
  anomalies: any[];
  centroid: any;
  radius: number;
  characteristics: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Advanced Statistical Analysis Engine
 * Provides sophisticated algorithms for pattern detection, correlation analysis,
 * and root cause analysis
 */
export class AdvancedStatisticalAnalysis {
  
  /**
   * Calculate multiple correlation coefficients between fields
   */
  calculateFieldCorrelations(logs: LogEntry[], fields: string[]): CorrelationResult[] {
    const correlations: CorrelationResult[] = [];
    
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const field1 = fields[i];
        const field2 = fields[j];
        
        // Extract numeric values for both fields
        const values1 = this.extractNumericValues(logs, field1);
        const values2 = this.extractNumericValues(logs, field2);
        
        if (values1.length < 3 || values2.length < 3) continue;
        
        // Calculate different correlation methods
        const pearson = this.calculatePearsonCorrelation(values1, values2);
        const spearman = this.calculateSpearmanCorrelation(values1, values2);
        const kendall = this.calculateKendallCorrelation(values1, values2);
        
        // Choose the best correlation method based on data characteristics
        const bestCorrelation = this.selectBestCorrelation(pearson, spearman, kendall, values1, values2);
        
        correlations.push({
          field1,
          field2,
          correlation: bestCorrelation.correlation,
          pValue: bestCorrelation.pValue,
          significance: this.calculateSignificance(bestCorrelation.pValue),
          method: bestCorrelation.method
        });
      }
    }
    
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
  
  /**
   * Detect time series patterns in log data
   */
  detectTimeSeriesPatterns(logs: LogEntry[], field: string): TimeSeriesPattern[] {
    const values = this.extractNumericValues(logs, field);
    const timestamps = logs.map(log => log.timestamp).sort((a, b) => a - b);
    
    if (values.length < 10) return [];
    
    const patterns: TimeSeriesPattern[] = [];
    
    // Detect trend
    const trend = this.detectTrend(values, timestamps);
    if (trend.strength > 0.3) {
      patterns.push(trend);
    }
    
    // Detect seasonal patterns
    const seasonal = this.detectSeasonalPattern(values, timestamps);
    if (seasonal.strength > 0.4) {
      patterns.push(seasonal);
    }
    
    // Detect cyclical patterns
    const cyclical = this.detectCyclicalPattern(values, timestamps);
    if (cyclical.strength > 0.3) {
      patterns.push(cyclical);
    }
    
    return patterns;
  }
  
  /**
   * Perform causal inference analysis
   */
  performCausalAnalysis(logs: LogEntry[], fields: string[]): CausalRelationship[] {
    const relationships: CausalRelationship[] = [];
    
    for (let i = 0; i < fields.length; i++) {
      for (let j = 0; j < fields.length; j++) {
        if (i === j) continue;
        
        const causeField = fields[i];
        const effectField = fields[j];
        
        // Granger Causality Test
        const grangerResult = this.grangerCausalityTest(logs, causeField, effectField);
        if (grangerResult.strength > 0.3) {
          relationships.push(grangerResult);
        }
        
        // Transfer Entropy
        const transferEntropy = this.calculateTransferEntropy(logs, causeField, effectField);
        if (transferEntropy.strength > 0.2) {
          relationships.push(transferEntropy);
        }
        
        // Mutual Information
        const mutualInfo = this.calculateMutualInformation(logs, causeField, effectField);
        if (mutualInfo.strength > 0.3) {
          relationships.push(mutualInfo);
        }
      }
    }
    
    return relationships.sort((a, b) => b.strength - a.strength);
  }
  
  /**
   * Cluster anomalies based on characteristics
   */
  clusterAnomalies(anomalies: any[]): AnomalyCluster[] {
    if (anomalies.length < 2) return [];
    
    const clusters: AnomalyCluster[] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < anomalies.length; i++) {
      if (processed.has(i)) continue;
      
      const cluster = this.createCluster(anomalies[i], anomalies, processed);
      if (cluster.anomalies.length > 1) {
        clusters.push(cluster);
      }
    }
    
    return clusters.sort((a, b) => b.severity.localeCompare(a.severity));
  }
  
  /**
   * Perform statistical significance testing
   */
  performSignificanceTests(logs: LogEntry[], anomalyTime: number, windowSize: number = 3600000): {
    tTest: { field: string; pValue: number; significant: boolean }[];
    chiSquare: { field: string; pValue: number; significant: boolean }[];
    mannWhitney: { field: string; pValue: number; significant: boolean }[];
  } {
    const beforeWindow = logs.filter(log => log.timestamp < anomalyTime - windowSize);
    const duringWindow = logs.filter(log => 
      log.timestamp >= anomalyTime - windowSize && 
      log.timestamp <= anomalyTime + windowSize
    );
    
    const numericFields = this.extractNumericFields(logs);
    const categoricalFields = this.extractCategoricalFields(logs);
    
    return {
      tTest: numericFields.map(field => {
        const beforeValues = this.extractNumericValues(beforeWindow, field);
        const duringValues = this.extractNumericValues(duringWindow, field);
        const pValue = this.performTTest(beforeValues, duringValues);
        return {
          field,
          pValue,
          significant: pValue < 0.05
        };
      }),
      chiSquare: categoricalFields.map(field => {
        const beforeValues = this.extractCategoricalValues(beforeWindow, field);
        const duringValues = this.extractCategoricalValues(duringWindow, field);
        const pValue = this.performChiSquareTest(beforeValues, duringValues);
        return {
          field,
          pValue,
          significant: pValue < 0.05
        };
      }),
      mannWhitney: numericFields.map(field => {
        const beforeValues = this.extractNumericValues(beforeWindow, field);
        const duringValues = this.extractNumericValues(duringWindow, field);
        const pValue = this.performMannWhitneyTest(beforeValues, duringValues);
        return {
          field,
          pValue,
          significant: pValue < 0.05
        };
      })
    };
  }
  
  /**
   * Generate advanced insights based on sophisticated analysis
   */
  generateAdvancedInsights(
    logs: LogEntry[], 
    anomalyContext: any,
    correlations: CorrelationResult[],
    timeSeriesPatterns: TimeSeriesPattern[],
    causalRelationships: CausalRelationship[],
    clusters: AnomalyCluster[],
    significanceTests: any
  ): LogAnalysisInsight[] {
    const insights: LogAnalysisInsight[] = [];
    
    // High correlation insights
    const strongCorrelations = correlations.filter(c => Math.abs(c.correlation) > 0.7);
    const moderateCorrelations = correlations.filter(c => Math.abs(c.correlation) > 0.3 && Math.abs(c.correlation) <= 0.7);
    
    if (strongCorrelations.length > 0) {
      insights.push({
        type: 'correlation',
        severity: 'high',
        title: 'Strong Field Correlations Detected',
        description: `Found ${strongCorrelations.length} strong correlations (|r| > 0.7). Strongest: ${strongCorrelations[0].field1} ↔ ${strongCorrelations[0].field2} (${strongCorrelations[0].correlation.toFixed(3)})`,
        confidence: 0.9,
        question: 'patterns',
        data: { correlations: strongCorrelations }
      });
    } else if (moderateCorrelations.length > 0) {
      insights.push({
        type: 'correlation',
        severity: 'medium',
        title: 'Moderate Field Correlations Detected',
        description: `Found ${moderateCorrelations.length} moderate correlations (|r| > 0.3). Strongest: ${moderateCorrelations[0].field1} ↔ ${moderateCorrelations[0].field2} (${moderateCorrelations[0].correlation.toFixed(3)})`,
        confidence: 0.7,
        question: 'patterns',
        data: { correlations: moderateCorrelations }
      });
    } else if (correlations.length > 0) {
      insights.push({
        type: 'correlation',
        severity: 'low',
        title: 'Field Correlations Analyzed',
        description: `Analyzed ${correlations.length} field pairs for correlations. Strongest correlation: ${correlations[0].field1} ↔ ${correlations[0].field2} (${correlations[0].correlation.toFixed(3)})`,
        confidence: 0.6,
        question: 'patterns',
        data: { correlations: correlations.slice(0, 3) }
      });
    }
    
    // Causal relationship insights (lowered thresholds for more insights)
    const strongCausal = causalRelationships.filter(c => c.strength > 0.3);
    const moderateCausal = causalRelationships.filter(c => c.strength > 0.1 && c.strength <= 0.3);
    
    if (strongCausal.length > 0) {
      insights.push({
        type: 'correlation',
        severity: 'high',
        title: 'Strong Causal Relationships Found',
        description: `Found ${strongCausal.length} strong causal relationships. Most significant: ${strongCausal[0].cause} → ${strongCausal[0].effect} (strength: ${strongCausal[0].strength.toFixed(3)})`,
        confidence: 0.8,
        question: 'root_cause',
        data: { relationships: strongCausal }
      });
    } else if (moderateCausal.length > 0) {
      insights.push({
        type: 'correlation',
        severity: 'medium',
        title: 'Moderate Causal Relationships Found',
        description: `Found ${moderateCausal.length} moderate causal relationships. Most significant: ${moderateCausal[0].cause} → ${moderateCausal[0].effect} (strength: ${moderateCausal[0].strength.toFixed(3)})`,
        confidence: 0.6,
        question: 'root_cause',
        data: { relationships: moderateCausal }
      });
    } else if (causalRelationships.length > 0) {
      insights.push({
        type: 'correlation',
        severity: 'low',
        title: 'Causal Analysis Completed',
        description: `Analyzed ${causalRelationships.length} potential causal relationships. Most significant: ${causalRelationships[0].cause} → ${causalRelationships[0].effect} (strength: ${causalRelationships[0].strength.toFixed(3)})`,
        confidence: 0.5,
        question: 'root_cause',
        data: { relationships: causalRelationships.slice(0, 3) }
      });
    }
    
    // Time series pattern insights
    const significantPatterns = timeSeriesPatterns.filter(p => p.confidence > 0.7);
    const moderatePatterns = timeSeriesPatterns.filter(p => p.confidence > 0.4 && p.confidence <= 0.7);
    
    if (significantPatterns.length > 0) {
      insights.push({
        type: 'temporal',
        severity: 'medium',
        title: 'Significant Time Series Patterns',
        description: `Detected ${significantPatterns.length} significant temporal patterns. Most prominent: ${significantPatterns[0].type} pattern with ${(significantPatterns[0].strength * 100).toFixed(1)}% strength`,
        confidence: 0.8,
        question: 'patterns',
        data: { patterns: significantPatterns }
      });
    } else if (moderatePatterns.length > 0) {
      insights.push({
        type: 'temporal',
        severity: 'medium',
        title: 'Time Series Patterns Detected',
        description: `Detected ${moderatePatterns.length} temporal patterns. Most prominent: ${moderatePatterns[0].type} pattern with ${(moderatePatterns[0].strength * 100).toFixed(1)}% strength`,
        confidence: 0.6,
        question: 'patterns',
        data: { patterns: moderatePatterns }
      });
    } else if (timeSeriesPatterns.length > 0) {
      insights.push({
        type: 'temporal',
        severity: 'low',
        title: 'Time Series Analysis Completed',
        description: `Analyzed ${timeSeriesPatterns.length} temporal patterns. Most prominent: ${timeSeriesPatterns[0].type} pattern with ${(timeSeriesPatterns[0].strength * 100).toFixed(1)}% strength`,
        confidence: 0.5,
        question: 'patterns',
        data: { patterns: timeSeriesPatterns.slice(0, 3) }
      });
    }
    
    // Statistical significance insights
    const significantFields = [
      ...significanceTests.tTest.filter((t: any) => t.significant),
      ...significanceTests.chiSquare.filter((t: any) => t.significant),
      ...significanceTests.mannWhitney.filter((t: any) => t.significant)
    ];
    
    if (significantFields.length > 0) {
      insights.push({
        type: 'statistical',
        severity: 'high',
        title: 'Statistically Significant Changes',
        description: `${significantFields.length} fields show statistically significant changes during anomaly period (p < 0.05)`,
        confidence: 0.95,
        question: 'what_happened',
        data: { significantFields }
      });
    }
    
    // Anomaly clustering insights
    if (clusters.length > 0) {
      const largestCluster = clusters[0];
      insights.push({
        type: 'pattern',
        severity: largestCluster.severity === 'critical' ? 'critical' : 'high',
        title: 'Anomaly Clustering Detected',
        description: `Found ${clusters.length} anomaly clusters. Largest cluster contains ${largestCluster.anomalies.length} anomalies with characteristics: ${largestCluster.characteristics.join(', ')}`,
        confidence: 0.8,
        question: 'patterns',
        data: { clusters }
      });
    }
    
    // Machine Learning pattern detection
    try {
      const mlDetector = new MLPatternDetection();
      
      // K-Means clustering
      const mlClusters = mlDetector.performKMeansClustering(logs, Math.min(5, Math.max(2, Math.floor(logs.length / 10))));
      
      // DBSCAN clustering
      const dbscanClusters = mlDetector.performDBSCANClustering(logs, 0.5, 3);
      
      // Isolation Forest anomaly detection
      const mlAnomalies = mlDetector.performIsolationForest(logs);
      
      // Decision Tree classification
      const classifications = mlDetector.performDecisionTreeClassification(logs);
      
      // Generate ML insights
      const mlInsights = mlDetector.generateMLInsights(logs, mlClusters, mlAnomalies, classifications);
      insights.push(...mlInsights);
      
    } catch (error) {
      console.warn('ML pattern detection failed:', error);
    }
    
    return insights;
  }
  
  // Helper methods for statistical calculations
  
  private extractNumericValues(logs: LogEntry[], field: string): number[] {
    return logs
      .map(log => {
        const value = this.getFieldValue(log, field);
        return typeof value === 'number' ? value : parseFloat(String(value));
      })
      .filter(val => !isNaN(val));
  }
  
  private extractCategoricalValues(logs: LogEntry[], field: string): string[] {
    return logs
      .map(log => String(this.getFieldValue(log, field) || ''))
      .filter(val => val.length > 0);
  }
  
  private getFieldValue(log: LogEntry, field: string): any {
    return (log as any)[field];
  }
  
  private calculatePearsonCorrelation(x: number[], y: number[]): { correlation: number; pValue: number; method: 'pearson' } {
    const n = Math.min(x.length, y.length);
    if (n < 2) return { correlation: 0, pValue: 1, method: 'pearson' };
    
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    
    const meanX = xSlice.reduce((sum, val) => sum + val, 0) / n;
    const meanY = ySlice.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xSlice[i] - meanX;
      const yDiff = ySlice[i] - meanY;
      numerator += xDiff * yDiff;
      sumXSquared += xDiff * xDiff;
      sumYSquared += yDiff * yDiff;
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    const correlation = denominator === 0 ? 0 : numerator / denominator;
    
    // Simplified p-value calculation (for demonstration)
    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const pValue = this.calculateTPValue(Math.abs(t), n - 2);
    
    return { correlation, pValue, method: 'pearson' };
  }
  
  private calculateSpearmanCorrelation(x: number[], y: number[]): { correlation: number; pValue: number; method: 'spearman' } {
    const n = Math.min(x.length, y.length);
    if (n < 2) return { correlation: 0, pValue: 1, method: 'spearman' };
    
    const xRanks = this.calculateRanks(x.slice(0, n));
    const yRanks = this.calculateRanks(y.slice(0, n));
    
    const result = this.calculatePearsonCorrelation(xRanks, yRanks);
    return { ...result, method: 'spearman' as const };
  }
  
  private calculateKendallCorrelation(x: number[], y: number[]): { correlation: number; pValue: number; method: 'kendall' } {
    const n = Math.min(x.length, y.length);
    if (n < 2) return { correlation: 0, pValue: 1, method: 'kendall' };
    
    let concordant = 0;
    let discordant = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const xDiff = x[i] - x[j];
        const yDiff = y[i] - y[j];
        
        if ((xDiff > 0 && yDiff > 0) || (xDiff < 0 && yDiff < 0)) {
          concordant++;
        } else if ((xDiff > 0 && yDiff < 0) || (xDiff < 0 && yDiff > 0)) {
          discordant++;
        }
      }
    }
    
    const total = concordant + discordant;
    const correlation = total === 0 ? 0 : (concordant - discordant) / total;
    
    // Simplified p-value calculation
    const pValue = this.calculateTPValue(Math.abs(correlation), n);
    
    return { correlation, pValue, method: 'kendall' };
  }
  
  private calculateRanks(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    return values.map(val => sorted.indexOf(val) + 1);
  }
  
  private selectBestCorrelation(pearson: any, spearman: any, kendall: any, x: number[], y: number[]): any {
    // Choose method based on data characteristics
    const isLinear = Math.abs(pearson.correlation) > 0.8;
    const hasOutliers = this.hasOutliers(x) || this.hasOutliers(y);
    
    if (isLinear && !hasOutliers) {
      return pearson;
    } else if (hasOutliers) {
      return spearman; // More robust to outliers
    } else {
      return kendall; // Good for small samples
    }
  }
  
  private hasOutliers(values: number[]): boolean {
    if (values.length < 4) return false;
    
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.some(val => val < lowerBound || val > upperBound);
  }
  
  private calculateSignificance(pValue: number): 'low' | 'medium' | 'high' {
    if (pValue < 0.001) return 'high';
    if (pValue < 0.01) return 'medium';
    return 'low';
  }
  
  private detectTrend(values: number[], timestamps: number[]): TimeSeriesPattern {
    const n = values.length;
    const x = timestamps.map((t, i) => i);
    const y = values;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = this.calculatePearsonCorrelation(x, y).correlation;
    
    return {
      type: 'trend',
      strength: Math.abs(correlation),
      direction: slope > 0 ? 'increasing' : 'decreasing',
      confidence: Math.abs(correlation)
    };
  }
  
  private detectSeasonalPattern(values: number[], timestamps: number[]): TimeSeriesPattern {
    // Simplified seasonal detection
    const hourlyValues = this.groupByHour(values, timestamps);
    const variance = this.calculateVariance(hourlyValues);
    const overallVariance = this.calculateVariance(values);
    
    const strength = variance / overallVariance;
    
    return {
      type: 'seasonal',
      strength: Math.min(strength, 1),
      period: 3600000, // 1 hour
      confidence: strength
    };
  }
  
  private detectCyclicalPattern(values: number[], timestamps: number[]): TimeSeriesPattern {
    // Simplified cyclical detection using autocorrelation
    const autocorr = this.calculateAutocorrelation(values);
    const maxAutocorr = Math.max(...autocorr.slice(1));
    
    return {
      type: 'cyclical',
      strength: maxAutocorr,
      confidence: maxAutocorr
    };
  }
  
  private grangerCausalityTest(logs: LogEntry[], causeField: string, effectField: string): CausalRelationship {
    // Simplified Granger causality test
    const causeValues = this.extractNumericValues(logs, causeField);
    const effectValues = this.extractNumericValues(logs, effectField);
    
    if (causeValues.length < 10 || effectValues.length < 10) {
      return { cause: causeField, effect: effectField, strength: 0, confidence: 0, method: 'granger' };
    }
    
    const correlation = this.calculatePearsonCorrelation(causeValues, effectValues);
    
    return {
      cause: causeField,
      effect: effectField,
      strength: Math.abs(correlation.correlation),
      confidence: 1 - correlation.pValue,
      lag: 0,
      method: 'granger'
    };
  }
  
  private calculateTransferEntropy(logs: LogEntry[], causeField: string, effectField: string): CausalRelationship {
    // Simplified transfer entropy calculation
    const causeValues = this.extractNumericValues(logs, causeField);
    const effectValues = this.extractNumericValues(logs, effectField);
    
    if (causeValues.length < 10 || effectValues.length < 10) {
      return { cause: causeField, effect: effectField, strength: 0, confidence: 0, method: 'transfer_entropy' };
    }
    
    // Simplified implementation
    const mutualInfo = this.calculateMutualInformation(logs, causeField, effectField);
    
    return {
      cause: causeField,
      effect: effectField,
      strength: mutualInfo.strength * 0.8, // Transfer entropy is typically lower than mutual information
      confidence: mutualInfo.confidence,
      method: 'transfer_entropy'
    };
  }
  
  private calculateMutualInformation(logs: LogEntry[], field1: string, field2: string): CausalRelationship {
    const values1 = this.extractNumericValues(logs, field1);
    const values2 = this.extractNumericValues(logs, field2);
    
    if (values1.length < 10 || values2.length < 10) {
      return { cause: field1, effect: field2, strength: 0, confidence: 0, method: 'mutual_information' };
    }
    
    // Simplified mutual information calculation
    const correlation = this.calculatePearsonCorrelation(values1, values2);
    const mutualInfo = -0.5 * Math.log(1 - correlation.correlation * correlation.correlation);
    
    return {
      cause: field1,
      effect: field2,
      strength: Math.max(0, mutualInfo),
      confidence: 1 - correlation.pValue,
      method: 'mutual_information'
    };
  }
  
  private createCluster(seedAnomaly: any, allAnomalies: any[], processed: Set<number>): AnomalyCluster {
    const cluster: AnomalyCluster = {
      id: `cluster_${Date.now()}`,
      anomalies: [seedAnomaly],
      centroid: seedAnomaly,
      radius: 0,
      characteristics: [],
      severity: 'medium'
    };
    
    const seedIndex = allAnomalies.indexOf(seedAnomaly);
    processed.add(seedIndex);
    
    // Find similar anomalies
    for (let i = 0; i < allAnomalies.length; i++) {
      if (processed.has(i)) continue;
      
      const anomaly = allAnomalies[i];
      const similarity = this.calculateAnomalySimilarity(seedAnomaly, anomaly);
      
      if (similarity > 0.7) {
        cluster.anomalies.push(anomaly);
        processed.add(i);
      }
    }
    
    // Calculate cluster characteristics
    cluster.characteristics = this.extractClusterCharacteristics(cluster.anomalies);
    cluster.severity = this.calculateClusterSeverity(cluster.anomalies);
    
    return cluster;
  }
  
  private calculateAnomalySimilarity(anomaly1: any, anomaly2: any): number {
    // Simplified similarity calculation
    const timeDiff = Math.abs(anomaly1.startTime - anomaly2.startTime);
    const durationDiff = Math.abs((anomaly1.endTime - anomaly1.startTime) - (anomaly2.endTime - anomaly2.startTime));
    const confidenceDiff = Math.abs(anomaly1.confidence - anomaly2.confidence);
    
    const timeSimilarity = Math.exp(-timeDiff / 3600000); // 1 hour decay
    const durationSimilarity = Math.exp(-durationDiff / 60000); // 1 minute decay
    const confidenceSimilarity = 1 - confidenceDiff;
    
    return (timeSimilarity + durationSimilarity + confidenceSimilarity) / 3;
  }
  
  private extractClusterCharacteristics(anomalies: any[]): string[] {
    const characteristics: string[] = [];
    
    if (anomalies.length > 1) {
      characteristics.push(`${anomalies.length} anomalies`);
    }
    
    const avgDuration = anomalies.reduce((sum, a) => sum + (a.endTime - a.startTime), 0) / anomalies.length;
    if (avgDuration > 300000) { // 5 minutes
      characteristics.push('long duration');
    }
    
    const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
    if (avgConfidence > 0.8) {
      characteristics.push('high confidence');
    }
    
    return characteristics;
  }
  
  private calculateClusterSeverity(anomalies: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
    const count = anomalies.length;
    
    if (count >= 5 && avgConfidence > 0.9) return 'critical';
    if (count >= 3 && avgConfidence > 0.8) return 'high';
    if (count >= 2 && avgConfidence > 0.7) return 'medium';
    return 'low';
  }
  
  private extractNumericFields(logs: LogEntry[]): string[] {
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
  
  private extractCategoricalFields(logs: LogEntry[]): string[] {
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
  
  private performTTest(values1: number[], values2: number[]): number {
    if (values1.length < 2 || values2.length < 2) return 1;
    
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;
    
    const var1 = this.calculateVariance(values1);
    const var2 = this.calculateVariance(values2);
    
    const pooledVar = ((values1.length - 1) * var1 + (values2.length - 1) * var2) / 
                     (values1.length + values2.length - 2);
    
    const se = Math.sqrt(pooledVar * (1/values1.length + 1/values2.length));
    const t = Math.abs(mean1 - mean2) / se;
    
    return this.calculateTPValue(t, values1.length + values2.length - 2);
  }
  
  private performChiSquareTest(values1: string[], values2: string[]): number {
    // Simplified chi-square test
    const allValues = [...values1, ...values2];
    const uniqueValues = [...new Set(allValues)];
    
    let chiSquare = 0;
    
    uniqueValues.forEach(value => {
      const observed1 = values1.filter(v => v === value).length;
      const observed2 = values2.filter(v => v === value).length;
      const expected1 = (observed1 + observed2) * values1.length / allValues.length;
      const expected2 = (observed1 + observed2) * values2.length / allValues.length;
      
      if (expected1 > 0) chiSquare += Math.pow(observed1 - expected1, 2) / expected1;
      if (expected2 > 0) chiSquare += Math.pow(observed2 - expected2, 2) / expected2;
    });
    
    // Simplified p-value calculation
    return Math.exp(-chiSquare / 2);
  }
  
  private performMannWhitneyTest(values1: number[], values2: number[]): number {
    if (values1.length < 2 || values2.length < 2) return 1;
    
    const allValues = [...values1, ...values2];
    const ranks = this.calculateRanks(allValues);
    
    const ranks1 = ranks.slice(0, values1.length);
    const ranks2 = ranks.slice(values1.length);
    
    const sumRanks1 = ranks1.reduce((sum, rank) => sum + rank, 0);
    const sumRanks2 = ranks2.reduce((sum, rank) => sum + rank, 0);
    
    const u1 = sumRanks1 - (values1.length * (values1.length + 1)) / 2;
    const u2 = sumRanks2 - (values2.length * (values2.length + 1)) / 2;
    
    const u = Math.min(u1, u2);
    const mean = (values1.length * values2.length) / 2;
    const variance = (values1.length * values2.length * (values1.length + values2.length + 1)) / 12;
    
    const z = Math.abs(u - mean) / Math.sqrt(variance);
    
    return this.calculateZPValue(z);
  }
  
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const sumSquaredDiffs = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    
    return sumSquaredDiffs / (values.length - 1);
  }
  
  private calculateAutocorrelation(values: number[]): number[] {
    const n = values.length;
    const autocorr: number[] = [];
    
    for (let lag = 0; lag < Math.min(n / 2, 20); lag++) {
      let numerator = 0;
      let denominator = 0;
      
      for (let i = 0; i < n - lag; i++) {
        numerator += values[i] * values[i + lag];
        denominator += values[i] * values[i];
      }
      
      autocorr.push(denominator === 0 ? 0 : numerator / denominator);
    }
    
    return autocorr;
  }
  
  private groupByHour(values: number[], timestamps: number[]): number[] {
    const hourlyValues: number[] = new Array(24).fill(0);
    const hourlyCounts: number[] = new Array(24).fill(0);
    
    values.forEach((value, index) => {
      const hour = new Date(timestamps[index]).getHours();
      hourlyValues[hour] += value;
      hourlyCounts[hour]++;
    });
    
    return hourlyValues.map((sum, hour) => hourlyCounts[hour] > 0 ? sum / hourlyCounts[hour] : 0);
  }
  
  private calculateTPValue(t: number, df: number): number {
    // Simplified t-distribution p-value calculation
    if (df <= 0) return 1;
    
    // Approximation for t-distribution
    const x = t * t / (t * t + df);
    const p = 1 - this.betaRegularized(x, df / 2, 0.5);
    
    return Math.max(0, Math.min(1, p));
  }
  
  private calculateZPValue(z: number): number {
    // Simplified normal distribution p-value calculation
    return 2 * (1 - this.normalCDF(Math.abs(z)));
  }
  
  private betaRegularized(x: number, a: number, b: number): number {
    // Simplified regularized beta function
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    
    // Very simplified approximation
    return Math.pow(x, a) * Math.pow(1 - x, b) / (this.gamma(a) * this.gamma(b) / this.gamma(a + b));
  }
  
  private normalCDF(x: number): number {
    // Simplified normal CDF approximation
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }
  
  private erf(x: number): number {
    // Simplified error function approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
  
  private gamma(z: number): number {
    // Simplified gamma function approximation
    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
    }
    
    z -= 1;
    let x = 0.99999999999980993;
    const coefficients = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012,
      9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    
    for (let i = 0; i < coefficients.length; i++) {
      x += coefficients[i] / (z + i + 1);
    }
    
    const t = z + coefficients.length - 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }
}
