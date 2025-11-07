/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { APIAction, APIResponseAction, HttpSetup } from '../middleware/types';
import handleActions from '../utils/handleActions';
import { ML_COMMONS_NODE_API } from '../../../utils/constants';

const EXECUTE_ML_AGENT = 'ml/EXECUTE_ML_AGENT';

export interface MLState {
  requesting: boolean;
  taskId: string;
  errorMessage: string;
}

export const initialMLState: MLState = {
  requesting: false,
  taskId: '',
  errorMessage: '',
};

const reducer = handleActions<MLState>(
  {
    [EXECUTE_ML_AGENT]: {
      REQUEST: (state: MLState): MLState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: MLState, action: APIResponseAction): MLState => ({
        ...state,
        requesting: false,
        taskId: action.result.task_id,
      }),
      FAILURE: (state: MLState, action: APIResponseAction): MLState => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
  },
  initialMLState
);

export const executeAutoCreateAgent = (
  indices: string[],
  agentId: string,
  dataSourceId: string = ''
): APIAction => {
  const baseUrl = `${ML_COMMONS_NODE_API.AGENT_EXECUTE}/${agentId}/execute`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;

  return {
    type: EXECUTE_ML_AGENT,
    request: (client: HttpSetup) =>
      client.post(url, {
        body: JSON.stringify({ indices }),
        query: { 
          async: 'true'
        },
      }),
  };
};

export default reducer;

