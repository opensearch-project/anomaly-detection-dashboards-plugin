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
import { DetectorResultsQueryParams } from '../../../server/models/types';
import { Anomaly } from '../../../server/models/interfaces';
import { get } from 'lodash';

const DETECTOR_LIVE_RESULTS = 'ad/DETECTOR_LIVE_RESULTS';

export interface Anomalies {
  requesting: boolean;
  totalLiveAnomalies: number;
  liveAnomalies: Anomaly[];
  errorMessage: string;
}
export const initialDetectorLiveResults: Anomalies = {
  requesting: false,
  errorMessage: '',
  totalLiveAnomalies: 0,
  liveAnomalies: [],
};

const reducer = handleActions<Anomalies>(
  {
    [DETECTOR_LIVE_RESULTS]: {
      REQUEST: (state: Anomalies): Anomalies => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Anomalies, action: APIResponseAction): Anomalies => ({
        ...state,
        requesting: false,
        totalLiveAnomalies: action.result.response.totalAnomalies,
        liveAnomalies: action.result.response.results,
      }),
      FAILURE: (state: Anomalies, action: APIResponseAction): Anomalies => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
  },
  initialDetectorLiveResults
);

export const getDetectorLiveResults = (
  detectorId: string,
  dataSourceId: string = '',
  queryParams: DetectorResultsQueryParams,
  isHistorical: boolean,
  resultIndex: string,
  onlyQueryCustomResultIndex: boolean
): APIAction => {
  let url = `..${AD_NODE_API.DETECTOR}/${detectorId}/results/${isHistorical}`;

  if (resultIndex) {
    // search for custom index pattern instead of specific index/alias
    // as a custom index will be rolled over and we don't want to lose
    // history
    if (!resultIndex.endsWith('*')) {
      resultIndex += '*';
    }
    url += `/${resultIndex}/${onlyQueryCustomResultIndex}`;
  }

  if (dataSourceId) {
    url += `/${dataSourceId}`;
  }

  return {
    type: DETECTOR_LIVE_RESULTS,
    request: (client: HttpSetup) => client.get(url, { query: queryParams }),
  };
};

export default reducer;
