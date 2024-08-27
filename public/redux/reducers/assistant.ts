/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { APIAction, APIResponseAction, HttpSetup } from '../middleware/types';
import handleActions from '../utils/handleActions';
import { ASSISTANT_NODE_API } from '../../../utils/constants';

const GENERATE_PARAMETERS = 'assistant/GENERATE_PARAMETERS';

export interface GeneratedParametersState {
  requesting: boolean;
  errorMessage: string;
}

export const initialState: GeneratedParametersState = {
  requesting: false,
  errorMessage: '',
};

const reducer = handleActions<GeneratedParametersState>(
  {
    [GENERATE_PARAMETERS]: {
      REQUEST: (state: GeneratedParametersState): GeneratedParametersState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (
        state: GeneratedParametersState,
        action: APIResponseAction
      ): GeneratedParametersState => ({
        ...state,
        requesting: false,
      }),
      FAILURE: (
        state: GeneratedParametersState,
        action: APIResponseAction
      ): GeneratedParametersState => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
  },
  initialState
);

export const generateParameters = (
  index: string,
  dataSourceId: string = ''
): APIAction => {
  const baseUrl = `${ASSISTANT_NODE_API.GENERATE_PARAMETERS}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  return {
    type: GENERATE_PARAMETERS,
    request: (client: HttpSetup) =>
      client.post(url, {
        body: JSON.stringify({ index: index }),
      }),
  };
};

export default reducer;
