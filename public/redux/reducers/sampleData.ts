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
import { SAMPLE_TYPE } from '../../../server/utils/constants';
import { get } from 'lodash';

const CREATE_SAMPLE_DATA = 'ad/CREATE_SAMPLE_DATA';

export interface SampleDataState {
  requesting: boolean;
  errorMessage: string;
}
export const initialState: SampleDataState = {
  requesting: false,
  errorMessage: '',
};

const reducer = handleActions<SampleDataState>(
  {
    [CREATE_SAMPLE_DATA]: {
      REQUEST: (state: SampleDataState): SampleDataState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (
        state: SampleDataState,
        action: APIResponseAction
      ): SampleDataState => ({
        ...state,
        requesting: false,
      }),
      FAILURE: (
        state: SampleDataState,
        action: APIResponseAction
      ): SampleDataState => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
  },
  initialState
);

export const createSampleData = (sampleDataType: SAMPLE_TYPE): APIAction => ({
  type: CREATE_SAMPLE_DATA,
  request: (client: HttpSetup) =>
    client.post(`..${AD_NODE_API.CREATE_SAMPLE_DATA}/${sampleDataType}`),
});

export default reducer;
