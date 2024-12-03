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

import { SORT_DIRECTION } from '../../../server/utils/constants';
import { DETECTOR_STATE, FORECASTER_STATE } from '../../../server/utils/constants';

export const customSubduedColor = '#98A2B3';
export const customSuccessColor = '#7DE2D1';
export const customWarningColor = '#FFCE7A';
export const customDangerColor = '#F66';

export enum DETECTOR_STATE_COLOR {
  DISABLED = '#98A2B3',
  INIT = 'primary',
  RUNNING = '#7DE2D1',
  FINISHED = '#017F75',
  FEATURE_REQUIRED = '#98A2B3',
  INIT_FAILURE = '#F66',
  UNEXPECTED_FAILURE = '#F66',
  FAILED = '#F66',
}

export enum FORECASTER_STATE_COLOR {
  INACTIVE_STOPPED = 'subdued',
  INACTIVE_NOT_STARTED = 'subdued',
  AWAITING_DATA_TO_INIT = 'subdued',
  AWAITING_DATA_TO_RESTART = 'subdued',
  INITIALIZING_TEST = 'subdued',
  INITIALIZING_FORECAST = 'subdued',
  TEST_COMPLETE = 'success',
  RUNNING = 'primary',
  INIT_FORECAST_FAILURE = 'danger',
  FORECAST_FAILURE = 'danger',
  INIT_TEST_FAILURE = 'danger',
}

export const stateToColorMap = new Map<DETECTOR_STATE, DETECTOR_STATE_COLOR>()
  .set(DETECTOR_STATE.DISABLED, DETECTOR_STATE_COLOR.DISABLED)
  .set(DETECTOR_STATE.INIT, DETECTOR_STATE_COLOR.INIT)
  .set(DETECTOR_STATE.RUNNING, DETECTOR_STATE_COLOR.RUNNING)
  .set(DETECTOR_STATE.FINISHED, DETECTOR_STATE_COLOR.FINISHED)
  .set(DETECTOR_STATE.FEATURE_REQUIRED, DETECTOR_STATE_COLOR.FEATURE_REQUIRED)
  .set(DETECTOR_STATE.INIT_FAILURE, DETECTOR_STATE_COLOR.INIT_FAILURE)
  .set(
    DETECTOR_STATE.UNEXPECTED_FAILURE,
    DETECTOR_STATE_COLOR.UNEXPECTED_FAILURE
  )
  .set(DETECTOR_STATE.FAILED, DETECTOR_STATE_COLOR.FAILED);

export const forecastStateToColorMap = new Map<FORECASTER_STATE, FORECASTER_STATE_COLOR>()
  .set(FORECASTER_STATE.INACTIVE_STOPPED, FORECASTER_STATE_COLOR.INACTIVE_STOPPED)
  .set(FORECASTER_STATE.INACTIVE_NOT_STARTED, FORECASTER_STATE_COLOR.INACTIVE_NOT_STARTED)
  .set(FORECASTER_STATE.AWAITING_DATA_TO_INIT, FORECASTER_STATE_COLOR.AWAITING_DATA_TO_INIT)
  .set(FORECASTER_STATE.AWAITING_DATA_TO_RESTART, FORECASTER_STATE_COLOR.AWAITING_DATA_TO_RESTART)
  .set(FORECASTER_STATE.INIT_TEST, FORECASTER_STATE_COLOR.INITIALIZING_TEST)
  .set(FORECASTER_STATE.INITIALIZING_FORECAST, FORECASTER_STATE_COLOR.INITIALIZING_FORECAST)
  .set(FORECASTER_STATE.TEST_COMPLETE, FORECASTER_STATE_COLOR.TEST_COMPLETE)
  .set(FORECASTER_STATE.RUNNING, FORECASTER_STATE_COLOR.RUNNING)
  .set(FORECASTER_STATE.INIT_ERROR, FORECASTER_STATE_COLOR.INIT_FORECAST_FAILURE)
  .set(FORECASTER_STATE.FORECAST_FAILURE, FORECASTER_STATE_COLOR.FORECAST_FAILURE)
  .set(FORECASTER_STATE.INIT_TEST_FAILED, FORECASTER_STATE_COLOR.INIT_TEST_FAILURE);

export const ALL_DETECTOR_STATES = [];
export const ALL_INDICES = [];
export const MAX_DETECTORS = 1000;
export const MAX_SELECTED_INDICES = 10;
export const MAX_FORECASTER = 1000;
export const EMPTY_FORECASTER_STATES = [];

export const DEFAULT_QUERY_PARAMS = {
  from: 0,
  search: '',
  indices: '',
  size: 20,
  sortDirection: SORT_DIRECTION.ASC,
  sortField: 'name',
  dataSourceId: '',
};

export const GET_ALL_DETECTORS_QUERY_PARAMS = {
  from: 0,
  search: '',
  indices: '',
  size: MAX_DETECTORS,
  sortDirection: SORT_DIRECTION.ASC,
  sortField: 'name',
};

export const GET_SAMPLE_DETECTORS_QUERY_PARAMS = {
  from: 0,
  search: 'sample',
  indices: '',
  size: MAX_DETECTORS,
  sortDirection: SORT_DIRECTION.ASC,
  sortField: 'name',
};

export const GET_SAMPLE_INDICES_QUERY = '*sample-*';

export const TOP_ENTITIES_FIELD = 'top_entities';
export const TOP_ENTITY_AGGS = 'top_entity_aggs';
export const TOP_ANOMALY_GRADE_SORT_AGGS = 'top_anomaly_grade_sort_aggs';
export const MAX_ANOMALY_AGGS = 'max_anomaly_aggs';
export const COUNT_ANOMALY_AGGS = 'count_anomaly_aggs';
export const MAX_ANOMALY_SORT_AGGS = 'max_anomaly_sort_aggs';
export const ENTITY_DATE_BUCKET_ANOMALY_AGGS = 'entity_date_bucket_anomaly';
export const AGGREGATED_ANOMALIES = 'aggregated_anomalies';
export const MIN_END_TIME = 'min_end_time';
export const MAX_END_TIME = 'max_end_time';

export const SINGLE_DETECTOR_NOT_FOUND_MSG = `Can't find detector with id`;
export const SINGLE_FORECASTER_NOT_FOUND_MSG = `Can't find forecaster with id`;

export enum ANOMALY_AGG {
  RAW = 'raw',
  DAILY = 'day',
  WEEKLY = 'week',
  MONTHLY = 'month',
}

export const ALL_CUSTOM_AD_RESULT_INDICES = 'opensearch-ad-plugin-result-*';
