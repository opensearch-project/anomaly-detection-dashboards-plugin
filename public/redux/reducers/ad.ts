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
  APIResponseAction,
  HttpSetup,
  APIErrorAction,
} from '../middleware/types';
import handleActions from '../utils/handleActions';
import { Detector, DetectorListItem } from '../../models/interfaces';
import { AD_NODE_API } from '../../../utils/constants';
import { GetDetectorsQueryParams } from '../../../server/models/types';
import { cloneDeep, get } from 'lodash';
import moment from 'moment';
import { DETECTOR_STATE } from '../../../server/utils/constants';

const CREATE_DETECTOR = 'ad/CREATE_DETECTOR';
const GET_DETECTOR = 'ad/GET_DETECTOR';
const GET_DETECTOR_LIST = 'ad/GET_DETECTOR_LIST';
const UPDATE_DETECTOR = 'ad/UPDATE_DETECTOR';
const SEARCH_DETECTOR = 'ad/SEARCH_DETECTOR';
const DELETE_DETECTOR = 'ad/DELETE_DETECTOR';
const START_DETECTOR = 'ad/START_DETECTOR';
const START_HISTORICAL_DETECTOR = 'ad/START_HISTORICAL_DETECTOR';
const STOP_DETECTOR = 'ad/STOP_DETECTOR';
const STOP_HISTORICAL_DETECTOR = 'ad/STOP_HISTORICAL_DETECTOR';
const GET_DETECTOR_PROFILE = 'ad/GET_DETECTOR_PROFILE';
const MATCH_DETECTOR = 'ad/MATCH_DETECTOR';
const GET_DETECTOR_COUNT = 'ad/GET_DETECTOR_COUNT';
const VALIDATE_DETECTOR = 'ad/VALIDATE_DETECTOR';

export interface Detectors {
  requesting: boolean;
  detectors: { [key: string]: Detector };
  detectorList: { [key: string]: DetectorListItem };
  totalDetectors: number;
  errorMessage: string;
}
export const initialDetectorsState: Detectors = {
  requesting: false,
  detectors: {},
  detectorList: {},
  errorMessage: '',
  totalDetectors: 0,
};

const reducer = handleActions<Detectors>(
  {
    [CREATE_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        errorMessage: '',
        requesting: false,
        detectors: {
          ...state.detectors,
          [action.result.response.id]: action.result.response,
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [VALIDATE_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Detectors): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: '',
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [GET_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectors: {
          ...state.detectors,
          [action.detectorId]: {
            ...cloneDeep(action.result.response),
          },
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [START_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => {
        const newState = { ...state, requesting: true, errorMessage: '' };
        return newState;
      },
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectors: {
          ...state.detectors,
          [action.detectorId]: {
            ...state.detectors[action.detectorId],
            enabled: true,
            enabledTime: moment().valueOf(),
            curState: DETECTOR_STATE.INIT,
            stateError: '',
          },
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [START_HISTORICAL_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => {
        const newState = { ...state, requesting: true, errorMessage: '' };
        return newState;
      },
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectors: {
          ...state.detectors,
          [action.detectorId]: {
            ...state.detectors[action.detectorId],
            taskState: DETECTOR_STATE.INIT,
            detectionDateRange: {
              startTime: action.startTime,
              endTime: action.endTime,
            },
            taskError: '',
          },
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [STOP_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => {
        const newState = { ...state, requesting: true, errorMessage: '' };
        return newState;
      },
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectors: {
          ...state.detectors,
          [action.detectorId]: {
            ...state.detectors[action.detectorId],
            enabled: false,
            disabledTime: moment().valueOf(),
            curState: DETECTOR_STATE.DISABLED,
            stateError: '',
            initProgress: undefined,
          },
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [STOP_HISTORICAL_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => {
        const newState = { ...state, requesting: true, errorMessage: '' };
        return newState;
      },
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectors: {
          ...state.detectors,
          [action.detectorId]: {
            ...state.detectors[action.detectorId],
            taskError: '',
          },
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [SEARCH_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectors: {
          ...state.detectors,
          ...action.result.response.detectors.reduce(
            (acc: any, detector: Detector) => ({
              ...acc,
              [detector.id]: detector,
            }),
            {}
          ),
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [GET_DETECTOR_LIST]: {
      REQUEST: (state: Detectors): Detectors => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectorList: action.result.response.detectorList.reduce(
          (acc: any, detector: DetectorListItem) => ({
            ...acc,
            [detector.id]: detector,
          }),
          {}
        ),
        totalDetectors: action.result.response.totalDetectors,
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [UPDATE_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => {
        const newState = { ...state, requesting: true, errorMessage: '' };
        return newState;
      },
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectors: {
          ...state.detectors,
          [action.detectorId]: {
            ...state.detectors[action.detectorId],
            ...action.result.response,
            lastUpdateTime: moment().valueOf(),
          },
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },

    [DELETE_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => {
        const newState = { ...state, requesting: true, errorMessage: '' };
        return newState;
      },
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectors: {
          ...state.detectors,
          [action.detectorId]: undefined,
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },

    [GET_DETECTOR_PROFILE]: {
      REQUEST: (state: Detectors): Detectors => {
        const newState = { ...state, requesting: true, errorMessage: '' };
        return newState;
      },
      SUCCESS: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        detectorList: {
          ...state.detectorList,
          [action.detectorId]: {
            ...state.detectorList[action.detectorId],
            curState: action.result.response.state,
          },
        },
      }),
      FAILURE: (state: Detectors, action: APIErrorAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [MATCH_DETECTOR]: {
      REQUEST: (state: Detectors): Detectors => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Detectors): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: '',
      }),
      FAILURE: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
    [GET_DETECTOR_COUNT]: {
      REQUEST: (state: Detectors): Detectors => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Detectors): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: '',
      }),
      FAILURE: (state: Detectors, action: APIResponseAction): Detectors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },
  },
  initialDetectorsState
);

export const createDetector = (requestBody: Detector, dataSourceId = ''): APIAction => {
  const url = dataSourceId ? `..${AD_NODE_API.DETECTOR}/${dataSourceId}` : `..${AD_NODE_API.DETECTOR}`;

  return {
    type: CREATE_DETECTOR,
    request: (client: HttpSetup) =>
    client.post(url, {
      body: JSON.stringify(requestBody),
    }),
  }
};

export const validateDetector = (
  requestBody: Detector,
  validationType: string
): APIAction => ({
  type: VALIDATE_DETECTOR,
  request: (client: HttpSetup) =>
    client.post(`..${AD_NODE_API.DETECTOR}/_validate/${validationType}`, {
      body: JSON.stringify(requestBody),
    }),
});

export const getDetector = (detectorId: string, dataSourceId = ''): APIAction => {
  const baseUrl = `..${AD_NODE_API.DETECTOR}`;
  const url = dataSourceId ? `${baseUrl}/${detectorId}/${dataSourceId}` : `${baseUrl}/${detectorId}`;

  return {
    type: GET_DETECTOR,
    request: (client: HttpSetup) => client.get(url), detectorId
  }
};

export const getDetectorList = (queryParams: GetDetectorsQueryParams): APIAction => {
  const baseUrl = `..${AD_NODE_API.DETECTOR}/_list`;
  const url = queryParams.dataSourceId ? `${baseUrl}/${queryParams.dataSourceId}` : baseUrl;

  return {
    type: GET_DETECTOR_LIST,
    request: (client: HttpSetup) => client.get(url, { query: queryParams }),
  };
};

export const searchDetector = (requestBody: any): APIAction => ({
  type: SEARCH_DETECTOR,
  request: (client: HttpSetup) =>
    client.post(`..${AD_NODE_API.DETECTOR}/_search`, {
      body: JSON.stringify(requestBody),
    }),
});

export const updateDetector = (
  detectorId: string,
  requestBody: Detector
): APIAction => ({
  type: UPDATE_DETECTOR,
  request: (client: HttpSetup) =>
    client.put(`..${AD_NODE_API.DETECTOR}/${detectorId}`, {
      body: JSON.stringify(requestBody),
    }),
  detectorId,
});

export const deleteDetector = (detectorId: string, dataSourceId = ''): APIAction => {
  const baseUrl = `..${AD_NODE_API.DETECTOR}/${detectorId}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;

  return {
    type: DELETE_DETECTOR,
    request: (client: HttpSetup) => client.delete(url), detectorId,
  };
};

export const startDetector = (detectorId: string, dataSourceId = ''): APIAction => {
  const baseUrl = `..${AD_NODE_API.DETECTOR}/${detectorId}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}/start` : `${baseUrl}/start`;

  return {
    type: START_DETECTOR,
    request: (client: HttpSetup) => client.post(url), detectorId,
  }
}

export const startHistoricalDetector = (
  detectorId: string,
  dataSourceId = '',
  startTime: number,
  endTime: number
): APIAction => {
  const baseUrl = `..${AD_NODE_API.DETECTOR}/${detectorId}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}/start` : `${baseUrl}/start`;

  return {
    type: START_HISTORICAL_DETECTOR,
    request: (client: HttpSetup) =>
      client.post(url, {
        body: JSON.stringify({
          startTime: startTime,
          endTime: endTime,
        }),
      }),
    detectorId,
    startTime,
    endTime,
  };
};

export const stopDetector = (detectorId: string, dataSourceId = ''): APIAction => {
  const baseUrl = `..${AD_NODE_API.DETECTOR}/${detectorId}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}/stop/${false}` : `${baseUrl}/stop/${false}`;

  return {
    type: STOP_DETECTOR,
    request: (client: HttpSetup) => client.post(url), detectorId,
  };
};

export const stopHistoricalDetector = (detectorId: string, dataSourceId = ''): APIAction => {
  const baseUrl = `..${AD_NODE_API.DETECTOR}/${detectorId}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}/stop/${true}` : `${baseUrl}/stop/${true}`;

  return {
    type: STOP_HISTORICAL_DETECTOR,
    request: (client: HttpSetup) => client.post(url), detectorId,
  };
};

export const getDetectorProfile = (detectorId: string): APIAction => ({
  type: GET_DETECTOR_PROFILE,
  request: (client: HttpSetup) =>
    client.get(`..${AD_NODE_API.DETECTOR}/${detectorId}/_profile`),
  detectorId,
});

export const matchDetector = (detectorName: string): APIAction => ({
  type: MATCH_DETECTOR,
  request: (client: HttpSetup) =>
    client.get(`..${AD_NODE_API.DETECTOR}/${detectorName}/_match`),
});

export const getDetectorCount = (): APIAction => ({
  type: GET_DETECTOR_COUNT,
  request: (client: HttpSetup) =>
    client.get(`..${AD_NODE_API.DETECTOR}/_count`, {}),
});

export default reducer;
