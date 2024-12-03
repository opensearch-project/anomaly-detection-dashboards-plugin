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
import { FORECAST_NODE_API } from '../../../utils/constants';
//import { ForecastData } from '../../models/interfaces';
import { ForecastResult } from '../../../server/models/interfaces';
import { get } from 'lodash';

const FORECASTER_RESULTS = 'forecast/FORECASTER_RESULTS';
const GET_TOP_FORECAST_RESULTS = 'forecast/GET_TOP_FORECAST_RESULTS';
const SEARCH_FORECAST_RESULTS = 'forecast/SEARCH_FORECAST_RESULTS';

export interface ForecastResults {
  requesting: boolean;
  total: number;
  forecasts: ForecastResult[];
  errorMessage: string;
  featureData: any;
}
export const initialForecasterState: ForecastResults = {
  requesting: false,
  total: 0,
  forecasts: [],
  errorMessage: '',
  featureData: {},
};

// Redux workflow in forecastResults.ts:
//
// 1. UI Interaction: Components in public/pages/* call these Redux action creators
// - e.g., dispatch(getTopForecastResults(...)) in ForecastChart.tsx
//
// 2. Redux Action Creation: These functions construct API requests with proper URLs
// - Must match routes defined in server/routes/forecast.ts
// - URL structure is critical - even small mismatches cause 404 errors
//
// 3. Server Routes: The server/routes/forecast.ts file defines route handlers
// - Routes use patterns like '/forecasters/{forecasterId}/topForecasts'
// - Each route maps to a specific handler function in ForecastService
//
// 4. OpenSearch API: The server handlers build and execute requests to OpenSearch
// - Routes translate our API structure into OpenSearch-compatible requests
// - Results are transformed back into our application's data format
//
// This layered architecture ensures separation of concerns but requires careful
// coordination between client routes and server routes. When debugging API issues,
// compare the URL constructed here with the routes defined in server/routes/forecast.ts.
const reducer = handleActions<ForecastResults>(
  {
    [FORECASTER_RESULTS]: {
      REQUEST: (state: ForecastResults): ForecastResults => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: ForecastResults, action: APIResponseAction): ForecastResults => ({
        ...state,
        requesting: false,
        total: action.result.response.totalForecasts,
        forecasts: action.result.response.results,
        featureData: action.result.response.featureResults,
      }),
      FAILURE: (state: ForecastResults, action: APIResponseAction): ForecastResults => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
    [GET_TOP_FORECAST_RESULTS]: {
      REQUEST: (state: ForecastResults): ForecastResults => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: ForecastResults, action: APIResponseAction): ForecastResults => ({
        ...state,
        requesting: false,
      }),
      FAILURE: (state: ForecastResults, action: APIResponseAction): ForecastResults => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
    [SEARCH_FORECAST_RESULTS]: {
      REQUEST: (state: ForecastResults): ForecastResults => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: ForecastResults, action: APIResponseAction): ForecastResults => ({
        ...state,
        requesting: false,
      }),
      FAILURE: (state: ForecastResults, action: APIResponseAction): ForecastResults => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
  },
  initialForecasterState
);

export const getForecasterResults = (
  id: string,
  dataSourceId: string = '',
  queryParams: any,
  isRunOnce: boolean,
  resultIndex: string,
): APIAction => {
  let url = `..${FORECAST_NODE_API.FORECASTER}/${id}/results/${isRunOnce}`;

  if (resultIndex) {
    // search for custom index pattern instead of specific index/alias
    // as a custom index will be rolled over and we don't want to lose
    // history
    if (!resultIndex.endsWith('*')) {
      resultIndex += '*';
    }
    url += `/${resultIndex}`;
  } else {
    // add a dummy resultIndex to the url as the server expects a resultIndex name in the url
    // we cannot use empty string as the server will not accept it and will throw 404 error.
    // Double slash with empty string in between is not valid route patterns.
    // getForecastResults in server/routes/forecast.ts will throw dummy value and use default
    // resultIndex pattern.
    url += `/dummy`;
  }

  if (dataSourceId) {
    url += `/${dataSourceId}`;
  }

  console.log("getForecasterResults url", url);

  return {
    type: FORECASTER_RESULTS,
    request: (client: HttpSetup) => client.get(url, { query: queryParams }),
  };
};

export const getTopForecastResults = (
  forecasterId: string,
  dataSourceId: string = '',
  isRunOnce: boolean,
  requestBody: any
): APIAction => {
  // If dataSourceId is provided, include isRunOnce in the URL
  // Otherwise, use the simple endpoint without isRunOnce
  const url = dataSourceId 
    ? `..${FORECAST_NODE_API.FORECASTER}/${forecasterId}/_topForecasts/${isRunOnce}/${dataSourceId}`
    : `..${FORECAST_NODE_API.FORECASTER}/${forecasterId}/_topForecasts/${isRunOnce}`;

  return {
    type: GET_TOP_FORECAST_RESULTS,
    request: (client: HttpSetup) =>
      client.post(url, { body: JSON.stringify(requestBody) }),
  };
};

export const searchResults = (
  requestBody: any,
  resultIndex: string = '',
  dataSourceId: string = '',
): APIAction => {
  // Base URL (until the by-... parts get added)
  let baseUrl = `..${FORECAST_NODE_API.FORECASTER}/results`;

  // If a resultIndex was provided, handle "by-index".
  if (resultIndex) {
    // Ensure the resultIndex ends with '*'
    if (!resultIndex.endsWith('*')) {
      resultIndex += '*';
    }
    baseUrl += `/by-index/${resultIndex}`;

    // If both resultIndex and dataSourceId exist, add "by-source/{dataSourceId}"
    if (dataSourceId) {
      baseUrl += `/by-source/${dataSourceId}`;
    }
  } else {
    // If no resultIndex, then we use "by-source".
    baseUrl += `/by-source`;

    // If a dataSourceId is given, add it
    if (dataSourceId) {
      baseUrl += `/${dataSourceId}`;
    }
  }

  // Finally, always end with _search
  baseUrl += '/_search';

  return {
    type: SEARCH_FORECAST_RESULTS,
    request: (client: HttpSetup) =>
      client.post(baseUrl, { body: JSON.stringify(requestBody) }),
  };
};

export default reducer;
