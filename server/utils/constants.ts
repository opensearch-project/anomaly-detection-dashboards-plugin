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

import { ADApis, DefaultHeaders } from '../models/interfaces';

export const AD_API_ROUTE_PREFIX = '/_plugins/_anomaly_detection';
export const ALERTING_API_ROUTE_PREFIX = '/_plugins/_alerting';

export const API: ADApis = {
  DETECTOR_BASE: `${AD_API_ROUTE_PREFIX}/detectors`,
  ALERTING_BASE: `${ALERTING_API_ROUTE_PREFIX}/monitors`,
};

export const DEFAULT_HEADERS: DefaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': 'OpenSearch Dashboards',
};

export const SEC_IN_MILLI_SECS = 1000;

export const MIN_IN_MILLI_SECS = 60 * SEC_IN_MILLI_SECS;

export const HOUR_IN_MILLI_SECS = 60 * MIN_IN_MILLI_SECS;

export const DAY_IN_MILLI_SECS = 24 * HOUR_IN_MILLI_SECS;

export const WEEK_IN_MILLI_SECS = 7 * DAY_IN_MILLI_SECS;

export enum CLUSTER {
  ADMIN = 'admin',
  AES_AD = 'aes_ad',
  DATA = 'data',
}

export enum SORT_DIRECTION {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AD_DOC_FIELDS {
  DATA_START_TIME = 'data_start_time',
  DATA_END_TIME = 'data_end_time',
  DETECTOR_ID = 'detector_id',
  TASK_ID = 'task_id',
  DETECTOR_NAME = 'name',
  PLOT_TIME = 'plot_time',
  ANOMALY_GRADE = 'anomaly_grade',
  ERROR = 'error',
  INDICES = 'indices',
}

export const MAX_DETECTORS = 1000;

export const MAX_MONITORS = 1000;

export const MAX_ALERTS = 1000;

// TODO: maybe move types/interfaces/constants/helpers shared between client and server
// side as many as possible into single place
export enum DETECTOR_STATE {
  DISABLED = 'Stopped',
  INIT = 'Initializing',
  RUNNING = 'Running',
  FINISHED = 'Finished',
  FEATURE_REQUIRED = 'Feature required',
  INIT_FAILURE = 'Initialization failure',
  UNEXPECTED_FAILURE = 'Unexpected failure',
  FAILED = 'Failed',
}

export enum SAMPLE_TYPE {
  HTTP_RESPONSES = 'http-responses',
  HOST_HEALTH = 'host-health',
  ECOMMERCE = 'ecommerce',
}

export const ENTITY_FIELD = 'entity';
export const ENTITY_VALUE_PATH_FIELD = 'entity.value';
export const ENTITY_NAME_PATH_FIELD = 'entity.name';
export const MODEL_ID_FIELD = 'model_id';

export const DOC_COUNT_FIELD = 'doc_count';
export const KEY_FIELD = 'key';
export const ENTITY_LIST_FIELD = 'entity_list';
export const MAX_ANOMALY_GRADE_FIELD = 'max_anomaly_grade';

// y-axis values in the heatmap chart should be in the form:
// <category-field-value-1><br><category-field-value-2>
export const ENTITY_LIST_DELIMITER = '<br>';

// when hovering over a cell, the entity list should be in the form:
// <category-field-name-1>: <category-field-value-1>, <category-field-name-2>: <category-field-value-2>
export const HEATMAP_CELL_ENTITY_DELIMITER = ', ';
export const HEATMAP_CALL_ENTITY_KEY_VALUE_DELIMITER = ': ';

export const STACK_TRACE_PATTERN = '.java:';
export const OPENSEARCH_EXCEPTION_PREFIX =
  'org.opensearch.OpenSearchException: ';

export const REALTIME_TASK_TYPE_PREFIX = 'REALTIME';
export const HISTORICAL_TASK_TYPE_PREFIX = 'HISTORICAL';

export const REALTIME_TASK_TYPES = [
  'REALTIME_HC_DETECTOR',
  'REALTIME_SINGLE_ENTITY',
];

export const HISTORICAL_TASK_TYPES = [
  'HISTORICAL_SINGLE_ENTITY',
  'HISTORICAL_HC_DETECTOR',
  'HISTORICAL',
];

export const CUSTOM_AD_RESULT_INDEX_PREFIX = 'opensearch-ad-plugin-result-';
