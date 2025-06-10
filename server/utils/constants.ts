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
export const FORECAST_API_ROUTE_PREFIX = '/_plugins/_forecast';
// custom forecast result index starts with opensearch-forecast-result-
// while default forecast result index starts with opensearch-forecast-results
export const DEFAULT_FORECAST_RESULT_INDEX_WILDCARD = 'opensearch-forecast-results*';
export const CUSTOM_FORECAST_RESULT_INDEX_PREFIX = 'opensearch-forecast-result-';
export const CUSTOM_FORECAST_RESULT_INDEX_WILDCARD = `${CUSTOM_FORECAST_RESULT_INDEX_PREFIX}*`;

export const API: ADApis = {
  DETECTOR_BASE: `${AD_API_ROUTE_PREFIX}/detectors`,
  ALERTING_BASE: `${ALERTING_API_ROUTE_PREFIX}/monitors`,
  FORECASTER_BASE: `${FORECAST_API_ROUTE_PREFIX}/forecasters`,
  FORECAST_RESULT_SEARCH: `/${DEFAULT_FORECAST_RESULT_INDEX_WILDCARD}/_search`,
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

export enum DETECTORS_QUERY_PARAMS {
  FROM = 'from',
  SIZE = 'size',
  SEARCH = 'search',
  INDICES = 'indices',
  SORT_FIELD = 'sortField',
  SORT_DIRECTION = 'sortDirection',
  NAME = 'name',
  DATASOURCEID = 'dataSourceId',
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

export const MAX_FORECASTER = 1000;

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

// The keys are INACTIVE_STOPPED, etc.
// The values are Inactive, etc.
export enum FORECASTER_STATE {
  INACTIVE_STOPPED = 'Inactive stopped',
  INACTIVE_NOT_STARTED = 'Inactive not started',
  AWAITING_DATA_TO_INIT = 'Awaiting data to init',
  AWAITING_DATA_TO_RESTART = 'Awaiting data to restart',
  INIT_TEST = 'Initializing test',
  INITIALIZING_FORECAST = 'Initializing forecast',
  TEST_COMPLETE = 'Test complete',
  RUNNING = 'Running',
  INIT_ERROR = 'Init forecast failure',
  FORECAST_FAILURE = 'Forecast failure',
  INIT_TEST_FAILED = 'Init test failure',
}

export enum FORECASTER_STATE_DISPLAY {
  INACTIVE_STOPPED = 'Inactive',
  INACTIVE_NOT_STARTED = 'Inactive',
  AWAITING_DATA_TO_INIT = 'Awaiting data',
  AWAITING_DATA_TO_RESTART = 'Awaiting data',
  INITIALIZING_TEST = 'Initializing...',
  INITIALIZING_FORECAST = 'Initializing...',
  TEST_COMPLETE = 'Test complete',
  RUNNING = 'Running',
  INIT_FORECAST_FAILURE = 'Error',
  FORECAST_FAILURE = 'Error',
  INIT_TEST_FAILURE = 'Error',
}

export const FORECASTER_STATE_TO_DISPLAY: { [key in FORECASTER_STATE]: FORECASTER_STATE_DISPLAY } = {
  [FORECASTER_STATE.INACTIVE_STOPPED]: FORECASTER_STATE_DISPLAY.INACTIVE_STOPPED,
  [FORECASTER_STATE.INACTIVE_NOT_STARTED]: FORECASTER_STATE_DISPLAY.INACTIVE_NOT_STARTED,
  [FORECASTER_STATE.AWAITING_DATA_TO_INIT]: FORECASTER_STATE_DISPLAY.AWAITING_DATA_TO_INIT,
  [FORECASTER_STATE.AWAITING_DATA_TO_RESTART]: FORECASTER_STATE_DISPLAY.AWAITING_DATA_TO_RESTART,
  [FORECASTER_STATE.INIT_TEST]: FORECASTER_STATE_DISPLAY.INITIALIZING_TEST,
  [FORECASTER_STATE.INITIALIZING_FORECAST]: FORECASTER_STATE_DISPLAY.INITIALIZING_FORECAST,
  [FORECASTER_STATE.TEST_COMPLETE]: FORECASTER_STATE_DISPLAY.TEST_COMPLETE,
  [FORECASTER_STATE.RUNNING]: FORECASTER_STATE_DISPLAY.RUNNING,
  [FORECASTER_STATE.INIT_ERROR]: FORECASTER_STATE_DISPLAY.INIT_FORECAST_FAILURE,
  [FORECASTER_STATE.FORECAST_FAILURE]: FORECASTER_STATE_DISPLAY.FORECAST_FAILURE,
  [FORECASTER_STATE.INIT_TEST_FAILED]: FORECASTER_STATE_DISPLAY.INIT_TEST_FAILURE,
};

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

export const FORECAST_REALTIME_TASK_TYPES = [
  'REALTIME_FORECAST_HC_FORECASTER',
  'REALTIME_FORECAST_SINGLE_STREAM',
];

export const FORECAST_RUN_ONCE_TASK_TYPES = [
  'RUN_ONCE_FORECAST_HC_FORECASTER',
  'RUN_ONCE_FORECAST_SINGLE_STREAM',
];

export const CUSTOM_AD_RESULT_INDEX_PREFIX = 'opensearch-ad-plugin-result-';

export const CUSTOM_FORECASTER_RESULT_INDEX_PREFIX = 'opensearch-forecast-result-';

export const SUGGEST_ANOMALY_DETECTOR_CONFIG_ID = 'os_suggest_ad';

export enum FORECASTER_DOC_FIELDS {
  DATA_START_TIME = 'data_start_time',
  DATA_END_TIME = 'data_end_time',
  FORECASTER_ID = 'forecaster_id',
  TASK_ID = 'task_id',
  FORECASTER_NAME = 'name',
  PLOT_TIME = 'plot_time',
  FORECAST_VALUE = 'forecast_value',
  FORECAST_LOWER_BOUND = 'forecast_lower_bound',
  FORECAST_UPPER_BOUND = 'forecast_upper_bound',
  ERROR = 'error',
  INDICES = 'indices',
  EXECUTION_END_TIME = 'execution_end_time',
  FORECAST_DATA_END_TIME = 'forecast_data_end_time',
}

export const isForecasterErrorState = (state: FORECASTER_STATE): boolean => {
  return [
    FORECASTER_STATE.INIT_ERROR,
    FORECASTER_STATE.FORECAST_FAILURE,
    FORECASTER_STATE.INIT_TEST_FAILED,
  ].includes(state);
};

export function isActiveState(state: FORECASTER_STATE | undefined): boolean {
  if (!state) return false;
  return state.startsWith('AWAITING_') || state === FORECASTER_STATE.RUNNING || state === FORECASTER_STATE.INITIALIZING_FORECAST;
}

export function isTestState(state: FORECASTER_STATE | undefined): boolean {
  return state === FORECASTER_STATE.INIT_TEST || state === FORECASTER_STATE.TEST_COMPLETE;
}

