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

export interface DefaultHeaders {
  'Content-Type': 'application/json';
  Accept: 'application/json';
  'User-Agent': 'OpenSearch Dashboards';
}

export interface SearchResponse<T> {
  hits: {
    total: { value: number };
    hits: Array<{
      _source: T;
      _id: string;
      _seq_no?: number;
      _primary_term?: number;
    }>;
  };
}

export interface ADApis {
  [API_ROUTE: string]: string;
  readonly DETECTOR_BASE: string;
}

export interface AlertingApis {
  [API_ROUTE: string]: string;
  readonly ALERTING_BASE: string;
}

export interface MlApis {
  [API_ROUTE: string]: string;
  readonly ML_BASE: string;
}

export interface ForecastApis {
  [API_ROUTE: string]: string;
  readonly FORECASTER_BASE: string;
}

export interface Entity {
  name: string;
  value: string;
}

export interface ForecastEntity {
  [name: string]: string;
}

export interface Anomaly {
  anomalyGrade: number;
  confidence: number;
  anomalyScore: number;
  startTime: number;
  endTime: number;
  plotTime: number;
  entity?: Entity[];
}
// Plot time is middle of start and end time to provide better visualization to customers
// Example, if window is 10 mins, in a given startTime and endTime of 12:10 to 12:20 respectively.
// plotTime will be 12:15.
export interface FeatureData {
  startTime: number;
  endTime: number;
  plotTime: number;
  data: number;
}
export interface AnomalyResults {
  anomalies: Anomaly[];
  featureData: { [key: string]: FeatureData[] };
}

export interface InitProgress {
  percentageStr: string;
  estimatedMinutesLeft: number;
}

export interface EntityAnomalySummary {
  startTime: number;
  maxAnomaly: number;
  anomalyCount: number;
}

export interface EntityAnomalySummaries {
  entityList: Entity[];
  anomalySummaries: EntityAnomalySummary[];
  modelId?: string;
}

export interface ForecastFeatureData {
  startTime: number;
  endTime: number;
  plotTime: number;
  data: number;
  name: string;
}

export interface ForecastResult {
  // inherited from AD, key is the feature id, value is the feature data
  // features is a map of feature id to feature data
  features: { [key: string]: ForecastFeatureData };
  forecastValue: number[];
  forecastLowerBound: number[];
  forecastUpperBound: number[];
  forecastStartTime: number[];
  forecastEndTime: number[];
  startTime: number;
  endTime: number;
  plotTime: number;
  entity?: Entity[];
  entityId?: string;
}