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
  queryParams: any,
  isHistorical: boolean,
  resultIndex: string,
  onlyQueryCustomResultIndex: boolean
): APIAction =>
  !resultIndex
    ? {
        type: DETECTOR_RESULTS,
        request: (client: HttpSetup) =>
          client.get(
            `..${AD_NODE_API.DETECTOR}/${id}/results/${isHistorical}`,
            {
              query: queryParams,
            }
          ),
      }
    : {
        type: DETECTOR_RESULTS,
        request: (client: HttpSetup) =>
          client.get(
            `..${AD_NODE_API.DETECTOR}/${id}/results/${isHistorical}/${resultIndex}/${onlyQueryCustomResultIndex}`,
            {
              query: queryParams,
            }
          ),
      };

export const searchResults = (
  requestBody: any,
  resultIndex: string,
  onlyQueryCustomResultIndex: boolean
): APIAction =>
  !resultIndex
    ? {
        type: SEARCH_ANOMALY_RESULTS,
        request: (client: HttpSetup) =>
          client.post(`..${AD_NODE_API.DETECTOR}/results/_search`, {
            body: JSON.stringify(requestBody),
          }),
      }
    : {
        type: SEARCH_ANOMALY_RESULTS,
        request: (client: HttpSetup) =>
          client.post(
            `..${AD_NODE_API.DETECTOR}/results/_search/${resultIndex}/${onlyQueryCustomResultIndex}`,
            {
              body: JSON.stringify(requestBody),
            }
          ),
      };

export const getTopAnomalyResults = (
  detectorId: string,
  isHistorical: boolean,
  requestBody: any
): APIAction => ({
  type: GET_TOP_ANOMALY_RESULTS,
  request: (client: HttpSetup) =>
    client.post(
      `..${AD_NODE_API.DETECTOR}/${detectorId}/_topAnomalies/${isHistorical}`,
      {
        body: JSON.stringify(requestBody),
      }
    ),
});

export default reducer;
