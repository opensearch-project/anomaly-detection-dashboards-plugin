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

import { APIAction, APIResponseAction, HttpSetup } from '../middleware/types';
import handleActions from '../utils/handleActions';
import { AD_NODE_API } from '../../../utils/constants';
import { AnomalyData } from '../../models/interfaces';
import { get } from 'lodash';

const DETECTOR_RESULTS = 'ad/DETECTOR_RESULTS';
const SEARCH_ANOMALY_RESULTS = 'ad/SEARCH_ANOMALY_RESULTS';
const GET_TOP_ANOMALY_RESULTS = 'ad/GET_TOP_ANOMALY_RESULTS';

export interface Anomalies {
  requesting: boolean;
  total: number;
  anomalies: AnomalyData[];
  errorMessage: string;
  featureData: any;
}
export const initialDetectorsState: Anomalies = {
  requesting: false,
  total: 0,
  anomalies: [],
  errorMessage: '',
  featureData: {},
};

const reducer = handleActions<Anomalies>(
  {
    [DETECTOR_RESULTS]: {
      REQUEST: (state: Anomalies): Anomalies => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Anomalies, action: APIResponseAction): Anomalies => ({
        ...state,
        requesting: false,
        total: action.result.response.totalAnomalies,
        anomalies: action.result.response.results,
        featureData: action.result.response.featureResults,
      }),
      FAILURE: (state: Anomalies, action: APIResponseAction): Anomalies => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },

    [SEARCH_ANOMALY_RESULTS]: {
      REQUEST: (state: Anomalies): Anomalies => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Anomalies, action: APIResponseAction): Anomalies => ({
        ...state,
        requesting: false,
      }),
      FAILURE: (state: Anomalies, action: APIResponseAction): Anomalies => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
    [GET_TOP_ANOMALY_RESULTS]: {
      REQUEST: (state: Anomalies): Anomalies => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Anomalies, action: APIResponseAction): Anomalies => ({
        ...state,
        requesting: false,
      }),
      FAILURE: (state: Anomalies, action: APIResponseAction): Anomalies => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
  },
  initialDetectorsState
);

export const getDetectorResults = (
  id: string,
  dataSourceId = '',
  queryParams: any,
  isHistorical: boolean,
  resultIndex: string,
  onlyQueryCustomResultIndex: boolean
): APIAction => {
  let baseUrl = `..${AD_NODE_API.DETECTOR}/${id}`;

  // append dataSourceId to the url if it has a truthy value
  if (dataSourceId) {
    baseUrl += `/${dataSourceId}`;
  }
  // construct the final url based on whether resultIndex is provided
  let url = baseUrl + `/results/${isHistorical}`;
  if (resultIndex) {
    url += `/${resultIndex}/${onlyQueryCustomResultIndex}`;
  }

  return {
    type: DETECTOR_RESULTS,
    request: (client: HttpSetup) => client.get(url, { query: queryParams }),
  };
};

export const searchResults = (
  requestBody: any,
  resultIndex: string,
  dataSourceId = '',
  onlyQueryCustomResultIndex: boolean
): APIAction => {
  let baseUrl = `..${AD_NODE_API.DETECTOR}/results`;
  if (dataSourceId) {
    baseUrl += `/${dataSourceId}`;
  }
  let url = baseUrl + '/_search';
  if (resultIndex) {
    url += `/${resultIndex}/${onlyQueryCustomResultIndex}`;
  }

  return {
    type: SEARCH_ANOMALY_RESULTS,
    request: (client: HttpSetup) => client.post(url, { body: JSON.stringify(requestBody) }),
  };
};

export const getTopAnomalyResults = (
  detectorId: string,
  dataSourceId: string = '',
  isHistorical: boolean,
  requestBody: any
): APIAction => {
  let baseUrl = `..${AD_NODE_API.DETECTOR}/${detectorId}`;
  if (dataSourceId) {
    baseUrl += `/${dataSourceId}`;
  }
  const url = `${baseUrl}/_topAnomalies/${isHistorical}`;

  return {
    type: GET_TOP_ANOMALY_RESULTS,
    request: (client: HttpSetup) => client.post(url, { body: JSON.stringify(requestBody) }),
  };
};

export default reducer;
