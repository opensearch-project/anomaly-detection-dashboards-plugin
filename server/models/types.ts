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

import { SORT_DIRECTION, DETECTOR_STATE } from '../utils/constants';

export type CatIndex = {
  index: string;
  health: string;
};

export type IndexAlias = {
  index: string;
  alias: string;
};

export type GetAliasesResponse = {
  aliases: IndexAlias[];
};

export type GetIndicesResponse = {
  indices: CatIndex[];
};

export type GetMappingResponse = {
  [key: string]: any;
};

export enum UNITS {
  MINUTES = 'MINUTES',
}

export type Schedule = {
  interval: number;
  unit: UNITS;
};

export type FeatureAttributes = {
  featureId?: string;
  featureName: string;
  featureEnabled: boolean;
};

export type Detector = {
  id?: string;
  name: string;
  description: string;
  indices: string[];
  filterQuery?: { [key: string]: any };
  featureAttributes?: FeatureAttributes[];
  windowDelay?: { period: Schedule };
  detectionInterval?: { period: Schedule };
  uiMetadata?: { [key: string]: any };
  lastUpdateTime: number;
  enabled: boolean;
  enabledTime?: number;
  disabledTime?: number;
  curState?: DETECTOR_STATE;
  categoryField?: string[];
  detectionDateRange?: DetectionDateRange;
  taskId?: string;
  taskState?: DETECTOR_STATE;
  taskProgress?: number;
  taskError?: string;
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

export type GetDetectorsQueryParams = {
  from: number;
  size: number;
  search: string;
  indices?: string;
  sortDirection: SORT_DIRECTION;
  sortField: string;
};

export type GetAdMonitorsQueryParams = {
  from: number;
  size: number;
  search: string;
  indices?: string;
  sortDirection: SORT_DIRECTION;
  sortField: string;
};

export type DetectorResultsQueryParams = {
  from: number;
  size: number;
  sortDirection: SORT_DIRECTION;
  sortField: string;
  dateRangeFilter?: DateRangeFilter;
};

export type Entity = {
  name: string;
  value: string;
};

export type AnomalyResult = {
  startTime: number;
  endTime: number;
  plotTime: number;
  anomalyGrade: number;
  confidence: number;
  entity?: Entity[];
  features?: { [key: string]: FeatureResult };
};

export type FeatureResult = {
  startTime: number;
  endTime: number;
  plotTime: number;
  data: number;
};

export type AnomalyResultsResponse = {
  totalAnomalies: number;
  results: AnomalyResult[];
  featureResults: { [key: string]: FeatureResult[] };
};

export type ServerResponse<T> =
  | { ok: false; error: string }
  | { ok: true; response: T };

export type DateRangeFilter = {
  startTime?: number;
  endTime?: number;
  fieldName: string;
};

export type DetectionDateRange = {
  startTime: number;
  endTime: number;
};
