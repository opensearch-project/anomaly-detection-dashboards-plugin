/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { APIAction, APIResponseAction, HttpSetup } from '../middleware/types';
import handleActions from '../utils/handleActions';
import { ML_COMMONS_NODE_API } from '../../../utils/constants';

const EXECUTE_ML_AGENT = 'ml/EXECUTE_ML_AGENT';
const GET_ML_TASK = 'ml/GET_ML_TASK';

export interface MLState {
  requesting: boolean;
  taskId: string;
  errorMessage: string;
  taskState: string;
  taskError: string;
}

export const initialMLState: MLState = {
  requesting: false,
  taskId: '',
  errorMessage: '',
  taskState: '',
  taskError: '',
};

const reducer = handleActions<MLState>(
  {
    [EXECUTE_ML_AGENT]: {
      REQUEST: (state: MLState): MLState => ({
        ...state,
        requesting: true,
        errorMessage: '',
        taskId: '',
        taskState: '',
        taskError: '',
      }),
      SUCCESS: (state: MLState, action: APIResponseAction): MLState => ({
        ...state,
        requesting: false,
        taskId: action.result.response?.task_id || action.result.task_id || '',
      }),
      FAILURE: (state: MLState, action: APIResponseAction): MLState => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [GET_ML_TASK]: {
      REQUEST: (state: MLState): MLState => state,
      SUCCESS: (state: MLState, action: APIResponseAction): MLState => ({
        ...state,
        taskState: action.result.response?.state || '',
        taskError: action.result.response?.error || '',
      }),
      FAILURE: (state: MLState, action: APIResponseAction): MLState => ({
        ...state,
        taskState: 'FAILED',
        taskError: action.error || 'Failed to fetch task status',
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
          async: 'true',
        },
      }),
  };
};

export const getMLTaskStatus = (
  taskId: string,
  dataSourceId: string = ''
): APIAction => {
  const baseUrl = `${ML_COMMONS_NODE_API.TASK_STATUS}/${taskId}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;

  return {
    type: GET_ML_TASK,
    request: (client: HttpSetup) => client.get(url),
  };
};

export const predictModel = (
  modelId: string,
  body: any,
  dataSourceId: string = ''
): APIAction => {
  const baseUrl = `${ML_COMMONS_NODE_API.PREDICT}/${modelId}/predict`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;

  return {
    type: 'ml/PREDICT',
    request: (client: HttpSetup) =>
      client.post(url, { body: JSON.stringify(body) }),
  };
};

export default reducer;
