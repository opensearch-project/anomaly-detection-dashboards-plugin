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

export interface MLPattern {
  type: 'clustering' | 'classification' | 'regression' | 'anomaly_detection';
  algorithm: string;
  confidence: number;
  data: any;
  insights: string[];
}

export interface ClusterResult {
  id: string;
  center: number[];
  points: LogEntry[];
  radius: number;
  characteristics: string[];
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  features: string[];
  probability: number;
}

/**
 * Machine Learning-based Pattern Detection
 * Implements various ML algorithms for advanced pattern recognition
 */
export class MLPatternDetection {
  
  /**
   * K-Means Clustering for log patterns
   */
  performKMeansClustering(logs: LogEntry[], k: number = 3): ClusterResult[] {
    if (logs.length < k) return [];
    
    const features = this.extractFeatures(logs);
    const clusters = this.kMeans(features, k);
    
    return clusters.map((cluster, index) => ({
      id: `cluster_${index}`,
      center: cluster.center,
      points: cluster.points.map(point => logs[point.index]),
      radius: this.calculateClusterRadius(cluster.points, cluster.center),
      characteristics: this.extractClusterCharacteristics(cluster.points.map(p => logs[p.index]))
    }));
  }
  
  /**
   * DBSCAN Clustering for density-based pattern detection
   */
  performDBSCANClustering(logs: LogEntry[], eps: number = 0.5, minPts: number = 3): ClusterResult[] {
    if (logs.length < minPts) return [];
    
    const features = this.extractFeatures(logs);
    const clusters = this.dbscan(features, eps, minPts);
    
    return clusters.map((cluster, index) => ({
      id: `dbscan_cluster_${index}`,
      center: this.calculateClusterCenter(cluster.points.map(p => features[p.index])),
      points: cluster.points.map(point => logs[point.index]),
      radius: this.calculateClusterRadius(cluster.points, cluster.center),
      characteristics: this.extractClusterCharacteristics(cluster.points.map(p => logs[p.index]))
    }));
  }
  
  /**
   * Isolation Forest for anomaly detection
   */
  performIsolationForest(logs: LogEntry[]): { anomaly: LogEntry; score: number }[] {
    if (logs.length < 10) return [];
    
    const features = this.extractFeatures(logs);
    const anomalyScores = this.isolationForest(features);
    
    return logs.map((log, index) => ({
      anomaly: log,
      score: anomalyScores[index]
    })).filter(result => result.score > 0.5) // Threshold for anomaly
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Decision Tree Classification for log categorization
   */
  performDecisionTreeClassification(logs: LogEntry[]): ClassificationResult[] {
    if (logs.length < 20) return [];
    
    const features = this.extractFeatures(logs);
    const labels = this.generateLabels(logs);
    const tree = this.buildDecisionTree(features, labels);
    
    return logs.map((log, index) => {
      const prediction = this.predictWithTree(tree, features[index]);
      return {
        category: prediction.category,
        confidence: prediction.confidence,
        features: this.getImportantFeatures(tree, features[index]),
        probability: prediction.probability
      };
    });
  }
  
  /**
   * Random Forest for ensemble pattern detection
   */
  performRandomForest(logs: LogEntry[], nTrees: number = 10): ClassificationResult[] {
    if (logs.length < 20) return [];
    
    const features = this.extractFeatures(logs);
    const labels = this.generateLabels(logs);
    const forest = this.buildRandomForest(features, labels, nTrees);
    
    return logs.map((log, index) => {
      const prediction = this.predictWithForest(forest, features[index]);
      return {
        category: prediction.category,
        confidence: prediction.confidence,
        features: this.getImportantFeaturesFromForest(forest, features[index]),
        probability: prediction.probability
      };
    });
  }
  
  /**
   * Generate ML-based insights
   */
  generateMLInsights(
    logs: LogEntry[],
    clusters: ClusterResult[],
    anomalies: { anomaly: LogEntry; score: number }[],
    classifications: ClassificationResult[]
  ): LogAnalysisInsight[] {
    const insights: LogAnalysisInsight[] = [];
    
    // Cluster insights
    if (clusters.length > 1) {
      const largestCluster = clusters.reduce((max, cluster) => 
        cluster.points.length > max.points.length ? cluster : max
      );
      
      insights.push({
        type: 'pattern',
        severity: 'medium',
        title: 'ML-Detected Log Clusters',
        description: `Found ${clusters.length} distinct log clusters using machine learning. Largest cluster contains ${largestCluster.points.length} logs with characteristics: ${largestCluster.characteristics.join(', ')}`,
        confidence: 0.8,
        question: 'patterns',
        data: { clusters, algorithm: 'k-means' }
      });
    }
    
    // Anomaly insights
    if (anomalies.length > 0) {
      const topAnomaly = anomalies[0];
      insights.push({
        type: 'statistical',
        severity: 'high',
        title: 'ML-Detected Anomalies',
        description: `Isolation Forest detected ${anomalies.length} anomalous logs. Most anomalous log has score ${topAnomaly.score.toFixed(3)}`,
        confidence: 0.9,
        question: 'what_happened',
        data: { anomalies, algorithm: 'isolation_forest' }
      });
    }
    
    // Classification insights
    const categoryCounts = classifications.reduce((counts, classification) => {
      counts[classification.category] = (counts[classification.category] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const dominantCategory = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (dominantCategory && dominantCategory[1] > logs.length * 0.5) {
      insights.push({
        type: 'pattern',
        severity: 'medium',
        title: 'ML-Based Log Classification',
        description: `Decision Tree classified logs into categories. Dominant category: ${dominantCategory[0]} (${dominantCategory[1]} logs, ${(dominantCategory[1]/logs.length*100).toFixed(1)}%)`,
        confidence: 0.8,
        question: 'patterns',
        data: { classifications, algorithm: 'decision_tree' }
      });
    }
    
    return insights;
  }
  
  // Helper methods for ML algorithms
  private extractFeatures(logs: LogEntry[]): number[][] {
    return logs.map(log => {
      const features: number[] = [];
      
      // Time-based features
      features.push(log.timestamp % 86400000); // Time of day
      features.push(Math.floor(log.timestamp / 86400000) % 7); // Day of week
      
      // Log level encoding
      const levelMap = { 'error': 4, 'warn': 3, 'info': 2, 'debug': 1 };
      features.push(levelMap[log.level as keyof typeof levelMap] || 0);
      
      // Message length
      features.push(log.message.length);
      
      // Numeric fields
      Object.keys(log).forEach(key => {
        const value = (log as any)[key];
        if (typeof value === 'number') {
          features.push(value);
        } else if (typeof value === 'string') {
          features.push(value.length);
        }
      });
      
      return features;
    });
  }
  
  private kMeans(features: number[][], k: number): { center: number[]; points: { index: number; features: number[] }[] }[] {
    const n = features.length;
    const dim = features[0].length;
    
    // Initialize centroids randomly
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const centroid = features[Math.floor(Math.random() * n)].slice();
      centroids.push(centroid);
    }
    
    let clusters: { center: number[]; points: { index: number; features: number[] }[] }[] = [];
    let changed = true;
    let iterations = 0;
    
    while (changed && iterations < 100) {
      // Assign points to nearest centroid
      clusters = centroids.map(center => ({ center: center.slice(), points: [] }));
      
      features.forEach((point, index) => {
        let minDist = Infinity;
        let closestCluster = 0;
        
        centroids.forEach((centroid, i) => {
          const dist = this.euclideanDistance(point, centroid);
          if (dist < minDist) {
            minDist = dist;
            closestCluster = i;
          }
        });
        
        clusters[closestCluster].points.push({ index, features: point });
      });
      
      // Update centroids
      changed = false;
      clusters.forEach((cluster, i) => {
        if (cluster.points.length > 0) {
          const newCenter = new Array(dim).fill(0);
          cluster.points.forEach(point => {
            point.features.forEach((value, j) => {
              newCenter[j] += value;
            });
          });
          
          newCenter.forEach((sum, j) => {
            newCenter[j] = sum / cluster.points.length;
          });
          
          const oldCenter = centroids[i];
          if (this.euclideanDistance(newCenter, oldCenter) > 0.001) {
            changed = true;
            centroids[i] = newCenter;
            clusters[i].center = newCenter;
          }
        }
      });
      
      iterations++;
    }
    
    return clusters.filter(cluster => cluster.points.length > 0);
  }
  
  private dbscan(features: number[][], eps: number, minPts: number): { center: number[]; points: { index: number; features: number[] }[] }[] {
    const n = features.length;
    const visited = new Array(n).fill(false);
    const clusters: { center: number[]; points: { index: number; features: number[] }[] }[] = [];
    
    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;
      
      const neighbors = this.getNeighbors(features, i, eps);
      if (neighbors.length < minPts) {
        visited[i] = true;
        continue;
      }
      
      const cluster: { index: number; features: number[] }[] = [];
      const queue = [...neighbors];
      
      while (queue.length > 0) {
        const pointIndex = queue.shift()!;
        if (visited[pointIndex]) continue;
        
        visited[pointIndex] = true;
        cluster.push({ index: pointIndex, features: features[pointIndex] });
        
        const newNeighbors = this.getNeighbors(features, pointIndex, eps);
        if (newNeighbors.length >= minPts) {
          queue.push(...newNeighbors);
        }
      }
      
      if (cluster.length >= minPts) {
        const center = this.calculateClusterCenter(cluster.map(p => p.features));
        clusters.push({ center, points: cluster });
      }
    }
    
    return clusters;
  }
  
  private isolationForest(features: number[][]): number[] {
    const n = features.length;
    const scores = new Array(n).fill(0);
    const nTrees = 10;
    const maxDepth = Math.ceil(Math.log2(n));
    
    for (let tree = 0; tree < nTrees; tree++) {
      const treeScores = this.buildIsolationTree(features, maxDepth);
      treeScores.forEach((score, i) => {
        scores[i] += score;
      });
    }
    
    return scores.map(score => score / nTrees);
  }
  
  private buildIsolationTree(features: number[][], maxDepth: number): number[] {
    const n = features.length;
    const scores = new Array(n).fill(0);
    
    const buildTree = (points: number[], depth: number): void => {
      if (depth >= maxDepth || points.length <= 1) {
        points.forEach(pointIndex => {
          scores[pointIndex] += depth;
        });
        return;
      }
      
      const dim = features[0].length;
      const splitDim = Math.floor(Math.random() * dim);
      const minVal = Math.min(...points.map(i => features[i][splitDim]));
      const maxVal = Math.max(...points.map(i => features[i][splitDim]));
      
      if (minVal === maxVal) {
        points.forEach(pointIndex => {
          scores[pointIndex] += depth;
        });
        return;
      }
      
      const splitVal = minVal + Math.random() * (maxVal - minVal);
      const leftPoints = points.filter(i => features[i][splitDim] < splitVal);
      const rightPoints = points.filter(i => features[i][splitDim] >= splitVal);
      
      if (leftPoints.length > 0) buildTree(leftPoints, depth + 1);
      if (rightPoints.length > 0) buildTree(rightPoints, depth + 1);
    };
    
    buildTree(Array.from({ length: n }, (_, i) => i), 0);
    return scores;
  }
  
  private generateLabels(logs: LogEntry[]): string[] {
    return logs.map(log => {
      if (log.level === 'error') return 'error';
      if (log.level === 'warn') return 'warning';
      if (log.message.includes('timeout') || log.message.includes('slow')) return 'performance';
      if (log.message.includes('auth') || log.message.includes('login')) return 'security';
      return 'info';
    });
  }
  
  private buildDecisionTree(features: number[][], labels: string[]): any {
    // Simplified decision tree implementation
    const uniqueLabels = [...new Set(labels)];
    if (uniqueLabels.length === 1) {
      return { leaf: true, category: uniqueLabels[0], confidence: 1.0 };
    }
    
    if (features.length === 0) {
      const labelCounts = labels.reduce((counts, label) => {
        counts[label] = (counts[label] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      const dominantLabel = Object.entries(labelCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
      
      return { leaf: true, category: dominantLabel, confidence: labelCounts[dominantLabel] / labels.length };
    }
    
    // Find best split
    let bestSplit = { dim: 0, threshold: 0, gain: 0 };
    const dim = features[0].length;
    
    for (let d = 0; d < dim; d++) {
      const values = features.map(f => f[d]).sort((a, b) => a - b);
      for (let i = 1; i < values.length; i++) {
        const threshold = (values[i-1] + values[i]) / 2;
        const gain = this.calculateInformationGain(features, labels, d, threshold);
        if (gain > bestSplit.gain) {
          bestSplit = { dim: d, threshold, gain };
        }
      }
    }
    
    if (bestSplit.gain === 0) {
      const labelCounts = labels.reduce((counts, label) => {
        counts[label] = (counts[label] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      const dominantLabel = Object.entries(labelCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
      
      return { leaf: true, category: dominantLabel, confidence: labelCounts[dominantLabel] / labels.length };
    }
    
    // Split data
    const leftIndices: number[] = [];
    const rightIndices: number[] = [];
    
    features.forEach((feature, i) => {
      if (feature[bestSplit.dim] < bestSplit.threshold) {
        leftIndices.push(i);
      } else {
        rightIndices.push(i);
      }
    });
    
    const leftFeatures = leftIndices.map(i => features[i]);
    const leftLabels = leftIndices.map(i => labels[i]);
    const rightFeatures = rightIndices.map(i => features[i]);
    const rightLabels = rightIndices.map(i => labels[i]);
    
    return {
      leaf: false,
      dim: bestSplit.dim,
      threshold: bestSplit.threshold,
      left: this.buildDecisionTree(leftFeatures, leftLabels),
      right: this.buildDecisionTree(rightFeatures, rightLabels)
    };
  }
  
  private buildRandomForest(features: number[][], labels: string[], nTrees: number): any[] {
    const forest: any[] = [];
    
    for (let i = 0; i < nTrees; i++) {
      // Bootstrap sampling
      const bootstrapIndices: number[] = [];
      for (let j = 0; j < features.length; j++) {
        bootstrapIndices.push(Math.floor(Math.random() * features.length));
      }
      
      const bootstrapFeatures = bootstrapIndices.map(idx => features[idx]);
      const bootstrapLabels = bootstrapIndices.map(idx => labels[idx]);
      
      const tree = this.buildDecisionTree(bootstrapFeatures, bootstrapLabels);
      forest.push(tree);
    }
    
    return forest;
  }
  
  private predictWithTree(tree: any, features: number[]): { category: string; confidence: number; probability: number } {
    if (tree.leaf) {
      return {
        category: tree.category,
        confidence: tree.confidence,
        probability: tree.confidence
      };
    }
    
    if (features[tree.dim] < tree.threshold) {
      return this.predictWithTree(tree.left, features);
    } else {
      return this.predictWithTree(tree.right, features);
    }
  }
  
  private predictWithForest(forest: any[], features: number[]): { category: string; confidence: number; probability: number } {
    const predictions = forest.map(tree => this.predictWithTree(tree, features));
    
    const categoryCounts = predictions.reduce((counts, pred) => {
      counts[pred.category] = (counts[pred.category] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    const totalPredictions = predictions.length;
    const dominantCategory = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      category: dominantCategory[0],
      confidence: dominantCategory[1] / totalPredictions,
      probability: dominantCategory[1] / totalPredictions
    };
  }
  
  private getImportantFeatures(tree: any, features: number[]): string[] {
    // Simplified feature importance
    const importantFeatures: string[] = [];
    
    if (!tree.leaf) {
      importantFeatures.push(`feature_${tree.dim}`);
      
      if (features[tree.dim] < tree.threshold) {
        importantFeatures.push(...this.getImportantFeatures(tree.left, features));
      } else {
        importantFeatures.push(...this.getImportantFeatures(tree.right, features));
      }
    }
    
    return [...new Set(importantFeatures)];
  }
  
  private getImportantFeaturesFromForest(forest: any[], features: number[]): string[] {
    const allFeatures = forest.flatMap(tree => this.getImportantFeatures(tree, features));
    const featureCounts = allFeatures.reduce((counts, feature) => {
      counts[feature] = (counts[feature] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    return Object.entries(featureCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature);
  }
  
  private calculateInformationGain(features: number[][], labels: string[], dim: number, threshold: number): number {
    const parentEntropy = this.calculateEntropy(labels);
    
    const leftLabels: string[] = [];
    const rightLabels: string[] = [];
    
    features.forEach((feature, i) => {
      if (feature[dim] < threshold) {
        leftLabels.push(labels[i]);
      } else {
        rightLabels.push(labels[i]);
      }
    });
    
    const leftEntropy = this.calculateEntropy(leftLabels);
    const rightEntropy = this.calculateEntropy(rightLabels);
    
    const leftWeight = leftLabels.length / labels.length;
    const rightWeight = rightLabels.length / labels.length;
    
    return parentEntropy - (leftWeight * leftEntropy + rightWeight * rightEntropy);
  }
  
  private calculateEntropy(labels: string[]): number {
    if (labels.length === 0) return 0;
    
    const labelCounts = labels.reduce((counts, label) => {
      counts[label] = (counts[label] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    let entropy = 0;
    Object.values(labelCounts).forEach(count => {
      const probability = count / labels.length;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });
    
    return entropy;
  }
  
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }
  
  private getNeighbors(features: number[][], pointIndex: number, eps: number): number[] {
    const neighbors: number[] = [];
    const point = features[pointIndex];
    
    features.forEach((otherPoint, otherIndex) => {
      if (otherIndex !== pointIndex) {
        const distance = this.euclideanDistance(point, otherPoint);
        if (distance <= eps) {
          neighbors.push(otherIndex);
        }
      }
    });
    
    return neighbors;
  }
  
  private calculateClusterCenter(points: number[][]): number[] {
    if (points.length === 0) return [];
    
    const dim = points[0].length;
    const center = new Array(dim).fill(0);
    
    points.forEach(point => {
      point.forEach((value, i) => {
        center[i] += value;
      });
    });
    
    center.forEach((sum, i) => {
      center[i] = sum / points.length;
    });
    
    return center;
  }
  
  private calculateClusterRadius(points: { index: number; features: number[] }[], center: number[]): number {
    if (points.length === 0) return 0;
    
    let maxDistance = 0;
    points.forEach(point => {
      const distance = this.euclideanDistance(point.features, center);
      maxDistance = Math.max(maxDistance, distance);
    });
    
    return maxDistance;
  }
  
  private extractClusterCharacteristics(logs: LogEntry[]): string[] {
    const characteristics: string[] = [];
    
    if (logs.length > 1) {
      characteristics.push(`${logs.length} logs`);
    }
    
    const levels = logs.map(log => log.level);
    const uniqueLevels = [...new Set(levels)];
    if (uniqueLevels.length === 1) {
      characteristics.push(`all ${uniqueLevels[0]} level`);
    } else if (uniqueLevels.length <= 2) {
      characteristics.push(`${uniqueLevels.join('/')} levels`);
    }
    
    const avgMessageLength = logs.reduce((sum, log) => sum + log.message.length, 0) / logs.length;
    if (avgMessageLength > 100) {
      characteristics.push('long messages');
    } else if (avgMessageLength < 20) {
      characteristics.push('short messages');
    }
    
    return characteristics;
  }
}
