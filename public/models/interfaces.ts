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

import { InitProgress } from '../../server/models/interfaces';
import { DATA_TYPES } from '../utils/constants';
import { DETECTOR_STATE } from '../../server/utils/constants';
import { Duration } from 'moment';
import moment from 'moment';
import { MDSQueryParams } from '../../server/models/types';

export type FieldInfo = {
  label: string;
  type: DATA_TYPES;
};

export enum FILTER_TYPES {
  SIMPLE = 'simple_filter',
  CUSTOM = 'custom_filter',
}

export enum FEATURE_TYPE {
  SIMPLE = 'simple_aggs',
  CUSTOM = 'custom_aggs',
}

export enum VALIDATION_ISSUE_TYPES {
  NAME = 'name',
  TIMEFIELD_FIELD = 'time_field',
  SHINGLE_SIZE_FIELD = 'shingle_size',
  INDICES = 'indices',
  FEATURE_ATTRIBUTES = 'feature_attributes',
  DETECTION_INTERVAL = 'detection_interval',
  CATEGORY = 'category_field',
  FILTER_QUERY = 'filter_query',
  PARSING_ISSUE = 'query_parsing',
  WINDOW_DELAY = 'window_delay',
  GENERAL_SETTINGS = 'general_settings',
}

export enum OPERATORS_MAP {
  IS = 'is',
  IS_NOT = 'is_not',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  IS_GREATER = 'is_greater',
  IS_GREATER_EQUAL = 'is_greater_equal',
  IS_LESS = 'is_less',
  IS_LESS_EQUAL = 'is_less_equal',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'does_not_contains',
  IN_RANGE = 'in_range',
  NOT_IN_RANGE = 'not_in_range',
}

export type UIFilter = {
  fieldInfo?: FieldInfo[];
  operator?: OPERATORS_MAP;
  fieldValue?: string | number | null;
  fieldRangeStart?: number;
  fieldRangeEnd?: number;
  filterType?: FILTER_TYPES;
  query?: string;
  label?: string;
};

export type FeatureAttributes = {
  featureId?: string;
  featureName: string;
  featureEnabled: boolean;
  importance: number;
  aggregationQuery: { [key: string]: any };
};

// all possible valid units accepted by the backend
export enum UNITS {
  NANOS = 'Nanos',
  MICROS = 'Micros',
  MILLIS = 'Millis',
  SECONDS = 'Seconds',
  MINUTES = 'Minutes',
  HOURS = 'Hours',
  HALF_DAYS = 'HalfDays',
  DAYS = 'Days',
  WEEKS = 'Weeks',
  MONTHS = 'Months',
  YEARS = 'Years',
  DECADES = 'Decades',
  CENTURIES = 'Centuries',
  MILLENNIA = 'Millennia',
  ERAS = 'Eras',
  FOREVER = 'Forever',
}

// cannot create a method in enum, have to write function separately
export function toDuration(units: UNITS): Duration {
  switch (units) {
    case UNITS.NANOS: {
      // Duration in moment library does not support
      return moment.duration(0.000000001, 'seconds');
    }
    case UNITS.MICROS: {
      return moment.duration(0.000001, 'seconds');
    }
    case UNITS.MILLIS: {
      return moment.duration(0.001, 'seconds');
    }
    case UNITS.SECONDS: {
      return moment.duration(1, 'seconds');
    }
    case UNITS.MINUTES: {
      return moment.duration(60, 'seconds');
    }
    case UNITS.HOURS: {
      return moment.duration(3600, 'seconds');
    }
    case UNITS.HALF_DAYS: {
      return moment.duration(43200, 'seconds');
    }
    case UNITS.DAYS: {
      return moment.duration(86400, 'seconds');
    }
    case UNITS.WEEKS: {
      return moment.duration(7 * 86400, 'seconds');
    }
    case UNITS.MONTHS: {
      return moment.duration(31556952 / 12, 'seconds');
    }
    case UNITS.YEARS: {
      return moment.duration(31556952, 'seconds');
    }
    case UNITS.DECADES: {
      return moment.duration(31556952 * 10, 'seconds');
    }
    case UNITS.CENTURIES: {
      return moment.duration(31556952 * 100, 'seconds');
    }
    case UNITS.MILLENNIA: {
      return moment.duration(31556952 * 1000, 'seconds');
    }
    case UNITS.ERAS: {
      return moment.duration(31556952 * 1000000000, 'seconds');
    }
    case UNITS.FOREVER: {
      return moment.duration(Number.MAX_VALUE, 'seconds');
    }
    default:
      break;
  }
  throw new Error('Unexpected unit: ' + units);
}

export type Schedule = {
  interval: number;
  unit: UNITS;
};

export type UiFeature = {
  featureType: FEATURE_TYPE;
  aggregationBy?: string;
  aggregationOf?: string;
};

export type UiMetaData = {
  filterType?: FILTER_TYPES;
  filters: UIFilter[];
  features: {
    [key: string]: UiFeature;
  };
};

export type Detector = {
  primaryTerm: number;
  seqNo: number;
  id: string;
  name: string;
  description: string;
  timeField: string;
  indices: string[];
  resultIndex?: string;
  resultIndexMinAge?: number;
  resultIndexMinSize?: number;
  resultIndexTtl?: number;
  flattenCustomResultIndex?: boolean;
  filterQuery: { [key: string]: any };
  featureAttributes: FeatureAttributes[];
  windowDelay: { period: Schedule };
  detectionInterval: { period: Schedule };
  shingleSize: number;
  uiMetadata: UiMetaData;
  lastUpdateTime: number;
  enabled?: boolean;
  enabledTime?: number;
  disabledTime?: number;
  curState: DETECTOR_STATE;
  stateError: string;
  initProgress?: InitProgress;
  categoryField?: string[];
  detectionDateRange?: DetectionDateRange;
  taskId?: string;
  taskState?: DETECTOR_STATE;
  taskProgress?: number;
  taskError?: string;
};

export type DetectorListItem = {
  id: string;
  name: string;
  indices: string[];
  curState: DETECTOR_STATE;
  featureAttributes: FeatureAttributes[];
  totalAnomalies: number;
  lastActiveAnomaly: number;
  lastUpdateTime: number;
  enabledTime?: number;
  detectorType?: string;
};

export type EntityData = {
  name: string;
  value: string;
};

export type AnomalyData = {
  anomalyGrade: number;
  anomalyScore?: number;
  confidence: number;
  detectorId?: string;
  endTime: number;
  startTime: number;
  plotTime?: number;
  entity?: EntityData[];
  features?: { [key: string]: FeatureAggregationData };
  contributions?: { [key: string]: FeatureContributionData };
  aggInterval?: string;
};

export type FeatureAggregationData = {
  data: number;
  name?: string;
  endTime: number;
  startTime: number;
  plotTime?: number;
  attribution?: number;
  expectedValue?: number;
};

export type FeatureContributionData = {
  name: string;
  attribution: number;
};

export type Anomalies = {
  anomalies: AnomalyData[];
  featureData: { [key: string]: FeatureAggregationData[] };
};

export type Monitor = {
  id: string;
  name: string;
  enabled: boolean;
  enabledTime?: number;
  schedule: { period: Schedule };
  inputs: any[];
  triggers: any[];
  lastUpdateTime: number;
};

export type MonitorAlert = {
  monitorName: string;
  triggerName: string;
  severity: number;
  state: string;
  error: string | null;
  startTime: number;
  endTime: number | null;
  acknowledgedTime: number | null;
};

export type AnomalySummary = {
  anomalyOccurrence: number;
  minAnomalyGrade: number;
  maxAnomalyGrade: number;
  avgAnomalyGrade?: number;
  minConfidence: number;
  maxConfidence: number;
  lastAnomalyOccurrence: string;
  contributions?: string;
};

export type DateRange = {
  startDate: number;
  endDate: number;
};

export type DetectionDateRange = {
  startTime: number;
  endTime: number;
};

export type EntityOption = {
  label: string;
};

// Primarily used in the heatmap chart when a subset of category fields are selected.
// We store all child category fields as keys, and all selected child entities as
// an array of EntityOptions per field.
// Ex: given child category field IP and entities [1.2.3.4, 5.6.7.8] would be stored as
// { [IP]: [ { label: 1.2.3.4 }, { label: 5.6.7.8 } ] }
export type EntityOptionsMap = {
  [categoryField: string]: EntityOption[];
};

export type ValidationModelResponse = {
  message: String;
  sub_issues?: { [key: string]: string };
  validationType: string;
};

export interface ValidationSettingResponse {
  issueType: string;
  message: string;
  validationType: string;
}

export interface MDSStates {
  queryParams: MDSQueryParams;
  selectedDataSourceId: string | undefined;
}
