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

import {
  APIAction,
  APIErrorAction,
  APIResponseAction,
  HttpSetup,
} from '../middleware/types';
import handleActions from '../utils/handleActions';
import { AD_NODE_API } from '../../../utils/constants';

const GET_INSIGHTS_STATUS = 'insights/GET_INSIGHTS_STATUS';
const GET_INSIGHTS_RESULTS = 'insights/GET_INSIGHTS_RESULTS';
const START_INSIGHTS_JOB = 'insights/START_INSIGHTS_JOB';
const STOP_INSIGHTS_JOB = 'insights/STOP_INSIGHTS_JOB';

export interface InsightsSchedule {
  interval?: {
    start_time: number;
    period: number;
    unit: string;
  };
}

export interface InsightResult {
  window_start: string;
  window_end: string;
  generated_at: string;
  doc_detector_names?: string[];
  doc_detector_ids?: string[];
  doc_indices?: string[];
  doc_model_ids?: string[];
  clusters?: any[];
}

export interface InsightsState {
  requesting: boolean;
  enabled: boolean;
  schedule: InsightsSchedule | null;
  results: InsightResult[];
  errorMessage: any;
}

export const initialInsightsState: InsightsState = {
  requesting: false,
  enabled: false,
  schedule: null,
  results: [],
  errorMessage: '',
};

const reducer = handleActions<InsightsState>(
  {
    [GET_INSIGHTS_STATUS]: {
      REQUEST: (state: InsightsState): InsightsState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: InsightsState, action: APIResponseAction): InsightsState => ({
        ...state,
        requesting: false,
        enabled: action.result?.response?.enabled || false,
        schedule: action.result?.response?.schedule || null,
      }),
      FAILURE: (state: InsightsState, action: APIErrorAction): InsightsState => ({
        ...state,
        requesting: false,
        enabled: false,
        schedule: null,
        errorMessage: action.error,
      }),
    },
    [GET_INSIGHTS_RESULTS]: {
      REQUEST: (state: InsightsState): InsightsState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: InsightsState, action: APIResponseAction): InsightsState => ({
        ...state,
        requesting: false,
        results: action.result?.response?.results || [],
      }),
      FAILURE: (state: InsightsState, action: APIErrorAction): InsightsState => ({
        ...state,
        requesting: false,
        results: [],
        errorMessage: action.error,
      }),
    },
    [START_INSIGHTS_JOB]: {
      REQUEST: (state: InsightsState): InsightsState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: InsightsState): InsightsState => ({
        ...state,
        requesting: false,
        errorMessage: '',
      }),
      FAILURE: (state: InsightsState, action: APIErrorAction): InsightsState => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [STOP_INSIGHTS_JOB]: {
      REQUEST: (state: InsightsState): InsightsState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: InsightsState): InsightsState => ({
        ...state,
        requesting: false,
        errorMessage: '',
      }),
      FAILURE: (state: InsightsState, action: APIErrorAction): InsightsState => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
  },
  initialInsightsState
);

const withDataSourceIdSuffix = (baseUrl: string, dataSourceId: string = '') =>
  dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;

export const getInsightsStatus = (dataSourceId: string = ''): APIAction => {
  const url = withDataSourceIdSuffix(AD_NODE_API.INSIGHTS_STATUS, dataSourceId);
  return {
    type: GET_INSIGHTS_STATUS,
    request: (client: HttpSetup) => client.get(url),
  };
};

export const getInsightsResults = (dataSourceId: string = ''): APIAction => {
  const url = withDataSourceIdSuffix(AD_NODE_API.INSIGHTS_RESULTS, dataSourceId);
  return {
    type: GET_INSIGHTS_RESULTS,
    // Backend sorts insight doc by `generated_at: desc` and defaults size=20, 
    // so request size=1 to reduce payload.
    request: (client: HttpSetup) => client.get(url, { query: { from: 0, size: 1 } }),
  };
};

export const startInsightsJob = (
  frequency: string,
  dataSourceId: string = ''
): APIAction => {
  const url = withDataSourceIdSuffix(AD_NODE_API.INSIGHTS_START, dataSourceId);
  return {
    type: START_INSIGHTS_JOB,
    request: (client: HttpSetup) =>
      client.post(url, {
        body: JSON.stringify({ frequency }),
      }),
  };
};

export const stopInsightsJob = (dataSourceId: string = ''): APIAction => {
  const url = withDataSourceIdSuffix(AD_NODE_API.INSIGHTS_STOP, dataSourceId);
  return {
    type: STOP_INSIGHTS_JOB,
    request: (client: HttpSetup) => client.post(url),
  };
};

export default reducer;

