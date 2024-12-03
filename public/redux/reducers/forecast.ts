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
  import { Forecaster, ForecasterListItem } from '../../models/interfaces';
  import { FORECAST_NODE_API } from '../../../utils/constants';
  import { GetForecastersQueryParams } from '../../../server/models/types';
  import { cloneDeep } from 'lodash';
  import moment from 'moment';
  import { FORECASTER_STATE } from '../../../server/utils/constants';
  
  export const CREATE_FORECASTER = 'forecast/CREATE_FORECASTER';
  export const GET_FORECASTER = 'forecast/GET_FORECASTER';
  export const GET_FORECASTER_LIST = 'forecast/GET_FORECASTER_LIST';
  export const UPDATE_FORECASTER = 'forecast/UPDATE_FORECASTER';
  export const SEARCH_FORECASTER = 'forecast/SEARCH_FORECASTER';
  export const DELETE_FORECASTER = 'forecast/DELETE_FORECASTER';
  export const START_FORECASTER = 'forecast/START_FORECASTER';
  export const TEST_FORECASTER = 'forecast/TEST_FORECASTER';
  export const STOP_FORECASTER = 'forecast/STOP_FORECASTER';
  export const GET_FORECASTER_PROFILE = 'forecast/GET_FORECASTER_PROFILE';
  export const MATCH_FORECASTER = 'forecast/MATCH_FORECASTER';
  export const GET_FORECASTER_COUNT = 'forecast/GET_FORECASTER_COUNT';
  export const VALIDATE_FORECASTER = 'forecast/VALIDATE_FORECASTER';
  export const SUGGEST_FORECASTER = 'forecast/SUGGEST_FORECASTER';
  
  export interface Forecasters {
    requesting: boolean;
    forecasters: { [key: string]: Forecaster };
    forecasterList: { [key: string]: ForecasterListItem };
    totalForecasters: number;
    errorMessage: string;
    // since all function calls share the same error message, we need to differentiate between
    // the different source of errors
    errorCall: string;
  }
  export const initialForecastersState: Forecasters = {
    requesting: false,
    forecasters: {},
    forecasterList: {},
    errorMessage: '',
    totalForecasters: 0,
    errorCall: '',
  };
  
  const reducer = handleActions<Forecasters>(
    {
      [CREATE_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: true,
          errorMessage: '',
        }),
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          errorMessage: '',
          requesting: false,
          forecasters: {
            ...state.forecasters,
            [action.result.response.id]: action.result.response,
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: CREATE_FORECASTER,
        }),
      },
      [VALIDATE_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: true,
          errorMessage: '',
        }),
        SUCCESS: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: '',
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: VALIDATE_FORECASTER,
        }),
      },
      [SUGGEST_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: true,
          errorMessage: '',
        }),
        SUCCESS: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: '',
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: SUGGEST_FORECASTER,
        }),
      },
      [GET_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: true,
          errorMessage: '',
        }),
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasters: {
            ...state.forecasters,
            [action.forecasterId]: {
              ...cloneDeep(action.result.response),
            },
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: GET_FORECASTER,
        }),
      },
      [START_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => {
          const newState = { ...state, requesting: true, errorMessage: '' };
          return newState;
        },
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasters: {
            ...state.forecasters,
            [action.forecasterId]: {
              ...state.forecasters[action.forecasterId],
              enabled: true,
              enabledTime: moment().valueOf(),
              curState: FORECASTER_STATE.INITIALIZING_FORECAST,
              stateError: '',
            },
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: START_FORECASTER,
        }),
      },
      [TEST_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => {
          const newState = { ...state, requesting: true, errorMessage: '' };
          return newState;
        },
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasters: {
            ...state.forecasters,
            [action.forecasterId]: {
              ...state.forecasters[action.forecasterId],
              taskState: FORECASTER_STATE.INITIALIZING_FORECAST,
              detectionDateRange: {
                startTime: action.startTime,
                endTime: action.endTime,
              },
              taskError: '',
            },
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: TEST_FORECASTER,
        }),
      },
      [STOP_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => {
          const newState = { ...state, requesting: true, errorMessage: '' };
          return newState;
        },
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasters: {
            ...state.forecasters,
            [action.forecasterId]: {
              ...state.forecasters[action.forecasterId],
              enabled: false,
              disabledTime: moment().valueOf(),
              curState: FORECASTER_STATE.INACTIVE_STOPPED,
              stateError: '',
              initProgress: undefined,
            },
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: STOP_FORECASTER,
        }),
      },
      [SEARCH_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: true,
          errorMessage: '',
        }),
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasters: {
            ...state.forecasters,
            ...action.result.response.forecasters.reduce(
              (acc: any, forecaster: Forecaster) => ({
                ...acc,
                [forecaster.id]: forecaster,
              }),
              {}
            ),
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: SEARCH_FORECASTER,
        }),
      },
      [GET_FORECASTER_LIST]: {
        REQUEST: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: true,
          errorMessage: '',
        }),
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasterList: action.result.response.forecasterList.reduce(
            (acc: any, forecaster: ForecasterListItem) => ({
              ...acc,
              [forecaster.id]: forecaster,
            }),
            {}
          ),
          totalForecasters: action.result.response.totalForecasters,
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => {
          console.log('Forecast reducer FAILURE - raw error:', action.error);
          console.log('Error type:', typeof action.error);
          return {
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: GET_FORECASTER_LIST,
        };
      },
      },
      [UPDATE_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => {
          const newState = { ...state, requesting: true, errorMessage: '' };
          return newState;
        },
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasters: {
            ...state.forecasters,
            [action.forecasterId]: {
              ...state.forecasters[action.forecasterId],
              ...action.result.response,
              lastUpdateTime: moment().valueOf(),
            },
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: UPDATE_FORECASTER,
        }),
      },
  
      [DELETE_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => {
          const newState = { ...state, requesting: true, errorMessage: '' };
          return newState;
        },
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasters: {
            ...state.forecasters,
            [action.forecasterId]: undefined,
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: DELETE_FORECASTER,
        }),
      },
  
      [GET_FORECASTER_PROFILE]: {
        REQUEST: (state: Forecasters): Forecasters => {
          const newState = { ...state, requesting: true, errorMessage: '' };
          return newState;
        },
        SUCCESS: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          forecasterList: {
            ...state.forecasterList,
            [action.forecasterId]: {
              ...state.forecasterList[action.forecasterId],
              curState: action.result.response.state,
            },
          },
        }),
        FAILURE: (state: Forecasters, action: APIErrorAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: GET_FORECASTER_PROFILE,
        }),
      },
      [MATCH_FORECASTER]: {
        REQUEST: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: true,
          errorMessage: '',
        }),
        SUCCESS: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: '',
        }),
        FAILURE: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: MATCH_FORECASTER,
        }),
      },
      [GET_FORECASTER_COUNT]: {
        REQUEST: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: true,
          errorMessage: '',
        }),
        SUCCESS: (state: Forecasters): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: '',
        }),
        FAILURE: (state: Forecasters, action: APIResponseAction): Forecasters => ({
          ...state,
          requesting: false,
          errorMessage: action.error,
          errorCall: GET_FORECASTER_COUNT,
        }),
      },
    },
    initialForecastersState
  );
  
  export const createForecaster = (
    requestBody: Forecaster,
    dataSourceId: string = ''
  ): APIAction => {
    const url = dataSourceId
      ? `${FORECAST_NODE_API.FORECASTER}/${dataSourceId}`
      : `${FORECAST_NODE_API.FORECASTER}`;
    return {
      type: CREATE_FORECASTER,
      request: (client: HttpSetup) =>
        client.post(url, {
          body: JSON.stringify(requestBody),
        }),
    };
  };
  
  export const validateForecaster = (
    requestBody: Forecaster,
    validationType: string,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/_validate/${validationType}`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: VALIDATE_FORECASTER,
      request: (client: HttpSetup) =>
        client.post(url, {
          body: JSON.stringify(requestBody),
        }),
    };
  }

  export const suggestForecaster = (
    requestBody: Forecaster,
    suggestType: string,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/_suggest/${suggestType}`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: SUGGEST_FORECASTER,
      request: (client: HttpSetup) =>
        client.post(url, {
          body: JSON.stringify(requestBody),
        }),
    };
  }
  
  export const getForecaster = (
    forecasterId: string,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/${forecasterId}`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: GET_FORECASTER,
      request: (client: HttpSetup) => client.get(url),
      forecasterId: forecasterId,
    };
  };

  export const getForecasterList = (
    queryParams: GetForecastersQueryParams
  ): APIAction => {
    const dataSourceId = queryParams.dataSourceId;
  
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/_list`;
    const url = dataSourceId
      ? `${baseUrl}/${dataSourceId}`
      : baseUrl;

    return {
      type: GET_FORECASTER_LIST,
      request: (client: HttpSetup) => client.get(url, { query: queryParams }),
    };
  };
  
  // FIXME: routes not used in the UI, therefore no data source id
  export const searchForecaster = (requestBody: any): APIAction => ({
    type: SEARCH_FORECASTER,
    request: (client: HttpSetup) =>
      client.post(`${FORECAST_NODE_API.FORECASTER}/_search`, {
        body: JSON.stringify(requestBody),
      }),
  });
  
  export const updateForecaster = (
    forecasterId: string,
    requestBody: Forecaster,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/${forecasterId}`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: UPDATE_FORECASTER,
      request: (client: HttpSetup) =>
        client.put(url, {
          body: JSON.stringify(requestBody),
        }),
      forecasterId: forecasterId,
    };
  }
  
  export const deleteForecaster = (
    forecasterId: string,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/${forecasterId}`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: DELETE_FORECASTER,
      request: (client: HttpSetup) => client.delete(url),
      forecasterId: forecasterId,
    };
  };
  
  export const startForecaster = (
    forecasterId: string,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/${forecasterId}/start`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: START_FORECASTER,
      request: (client: HttpSetup) => client.post(url),
      forecasterId,
    };
  };
  
  export const testForecaster = (
    forecasterId: string,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/${forecasterId}/_run_once`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: TEST_FORECASTER,
      request: (client: HttpSetup) =>
        client.post(url),
      forecasterId: forecasterId,
    };
  };
  
  export const stopForecaster = (
    forecasterId: string,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/${forecasterId}/stop`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: STOP_FORECASTER,
      request: (client: HttpSetup) => client.post(url),
      forecasterId: forecasterId,
    };
  };
  
  export const getForecasterProfile = (forecasterId: string): APIAction => ({
    type: GET_FORECASTER_PROFILE,
    request: (client: HttpSetup) =>
      client.get(`${FORECAST_NODE_API.FORECASTER}/${forecasterId}/_profile`),
    forecasterId: forecasterId,
  });
  
  export const matchForecaster = (
    forecasterName: string,
    dataSourceId: string = ''
  ): APIAction => {
    const baseUrl = `${FORECAST_NODE_API.FORECASTER}/${forecasterName}/_match`;
    const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
    return {
      type: MATCH_FORECASTER,
      request: (client: HttpSetup) => client.get(url),
    };
  };
  
  export const getForecasterCount = (dataSourceId: string = ''): APIAction => {
    const url = dataSourceId ?
      `${FORECAST_NODE_API.FORECASTER}/_count/${dataSourceId}` :
      `${FORECAST_NODE_API.FORECASTER}/_count`;
  
    return {
      type: GET_FORECASTER_COUNT,
      request: (client: HttpSetup) => client.get(url),
    };
  };
  
  export default reducer;
  