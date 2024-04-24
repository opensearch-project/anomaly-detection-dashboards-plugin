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
import { Anomalies } from '../../models/interfaces';

const PREVIEW_DETECTOR = 'ad/PREVIEW_DETECTOR';

export interface PreviewAnomalies {
  requesting: boolean;
  anomaliesResult: Anomalies;
  errorMessage: string;
}
export const initialDetectorsState: PreviewAnomalies = {
  requesting: false,
  anomaliesResult: {
    anomalies: [],
    featureData: {},
  },
  errorMessage: '',
};

const reducer = handleActions<PreviewAnomalies>(
  {
    [PREVIEW_DETECTOR]: {
      REQUEST: (state: PreviewAnomalies): PreviewAnomalies => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (
        state: PreviewAnomalies,
        action: APIResponseAction
      ): PreviewAnomalies => ({
        ...state,
        requesting: false,
        anomaliesResult: action.result.response,
      }),
      FAILURE: (
        state: PreviewAnomalies,
        action: APIResponseAction
      ): PreviewAnomalies => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
  },
  initialDetectorsState
);

export const previewDetector = (requestBody: any, dataSourceId: string = ''): APIAction => {
  const baseUrl = `..${AD_NODE_API.DETECTOR}/preview`;
  const url =  dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;

  return {
    type: PREVIEW_DETECTOR,
    request: (client: HttpSetup) =>
      client.post(url, {
        body: JSON.stringify(requestBody),
      }),
  };
}

export default reducer;
