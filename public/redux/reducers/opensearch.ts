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
  ThunkAction,
} from '../middleware/types';
import handleActions from '../utils/handleActions';
import { getPathsPerDataType } from './mapper';
import { CatIndex, IndexAlias } from '../../../server/models/types';
import { AD_NODE_API } from '../../../utils/constants';
import { get } from 'lodash';

const GET_INDICES = 'opensearch/GET_INDICES';
const GET_ALIASES = 'opensearch/GET_ALIASES';
const GET_MAPPINGS = 'opensearch/GET_MAPPINGS';
const SEARCH_OPENSEARCH = 'opensearch/SEARCH_OPENSEARCH';
const CREATE_INDEX = 'opensearch/CREATE_INDEX';
const BULK = 'opensearch/BULK';
const DELETE_INDEX = 'opensearch/DELETE_INDEX';

export type Mappings = {
  [key: string]: any;
};

export interface DataTypes {
  long?: string[];
  integer?: string[];
  short?: string[];
  byte?: string[];
  double?: string[];
  float?: string[];
  half_float?: string[];
  boolean?: string[];
  date?: string[];
  keyword?: string[];
  text?: string[];
  integer_range?: string[];
  float_range?: string[];
  long_range?: string[];
  double_range?: string[];
  date_range?: string[];
  [key: string]: any; // Any new or unknown
}

interface OpenSearchState {
  indices: CatIndex[];
  aliases: IndexAlias[];
  dataTypes: DataTypes;
  requesting: boolean;
  searchResult: object;
  errorMessage: string;
}
export const initialState: OpenSearchState = {
  indices: [],
  aliases: [],
  dataTypes: {},
  requesting: false,
  searchResult: {},
  errorMessage: '',
};

const reducer = handleActions<OpenSearchState>(
  {
    [GET_INDICES]: {
      REQUEST: (state: OpenSearchState): OpenSearchState => {
        return { ...state, requesting: true, errorMessage: '' };
      },
      SUCCESS: (
        state: OpenSearchState,
        action: APIResponseAction
      ): OpenSearchState => {
        return {
          ...state,
          requesting: false,
          indices: get(action, 'result.response.indices', []),
        };
      },
      FAILURE: (
        state: OpenSearchState,
        action: APIErrorAction
      ): OpenSearchState => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
    [GET_ALIASES]: {
      REQUEST: (state: OpenSearchState): OpenSearchState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (
        state: OpenSearchState,
        action: APIResponseAction
      ): OpenSearchState => {
        return {
          ...state,
          requesting: false,
          aliases: get(action, 'result.response.aliases', []),
        };
      },
      FAILURE: (
        state: OpenSearchState,
        action: APIErrorAction
      ): OpenSearchState => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
    [SEARCH_OPENSEARCH]: {
      REQUEST: (state: OpenSearchState): OpenSearchState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (
        state: OpenSearchState,
        action: APIResponseAction
      ): OpenSearchState => {
        return {
          ...state,
          requesting: false,
          searchResult: { ...get(action, 'result.response', {}) },
        };
      },
      FAILURE: (
        state: OpenSearchState,
        action: APIErrorAction
      ): OpenSearchState => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
    [GET_MAPPINGS]: {
      REQUEST: (state: OpenSearchState): OpenSearchState => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (
        state: OpenSearchState,
        action: APIResponseAction
      ): OpenSearchState => {
        return {
          ...state,
          requesting: false,
          dataTypes: getPathsPerDataType(
            get(action, 'result.response.mappings', {})
          ),
        };
      },
      FAILURE: (
        state: OpenSearchState,
        action: APIErrorAction
      ): OpenSearchState => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
        dataTypes: {},
      }),
    },
    [CREATE_INDEX]: {
      REQUEST: (state: OpenSearchState): OpenSearchState => {
        return { ...state, requesting: true, errorMessage: '' };
      },
      SUCCESS: (
        state: OpenSearchState,
        action: APIResponseAction
      ): OpenSearchState => {
        return {
          ...state,
          requesting: false,
          indices: get(action, 'result.response.indices', []),
        };
      },
      FAILURE: (
        state: OpenSearchState,
        action: APIErrorAction
      ): OpenSearchState => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
    [BULK]: {
      REQUEST: (state: OpenSearchState): OpenSearchState => {
        return { ...state, requesting: true, errorMessage: '' };
      },
      SUCCESS: (
        state: OpenSearchState,
        action: APIResponseAction
      ): OpenSearchState => {
        return {
          ...state,
          requesting: false,
        };
      },
      FAILURE: (
        state: OpenSearchState,
        action: APIErrorAction
      ): OpenSearchState => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
    [DELETE_INDEX]: {
      REQUEST: (state: OpenSearchState): OpenSearchState => {
        return { ...state, requesting: true, errorMessage: '' };
      },
      SUCCESS: (
        state: OpenSearchState,
        action: APIResponseAction
      ): OpenSearchState => {
        return {
          ...state,
          requesting: false,
          indices: get(action, 'result.response.indices', []),
        };
      },
      FAILURE: (
        state: OpenSearchState,
        action: APIErrorAction
      ): OpenSearchState => ({
        ...state,
        requesting: false,
        errorMessage: get(action, 'error.error', action.error),
      }),
    },
  },
  initialState
);

export const getIndices = (searchKey = '', dataSourceId: string) => {
  const baseUrl = `..${AD_NODE_API._INDICES}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;

  return {
    type: GET_INDICES,
    request: (client: HttpSetup) =>
      client.get(url, { query: { index: searchKey } }),
  };
};

export const getAliases = (
  searchKey: string = '',
  dataSourceId: string
): APIAction => {
  const baseUrl = `..${AD_NODE_API._ALIASES}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;

  return {
    type: GET_ALIASES,
    request: (client: HttpSetup) =>
      client.get(url, { query: { alias: searchKey } }),
  };
};

export const getMappings = (searchKey: string = '', dataSourceId: string): APIAction => {
  const url = dataSourceId ? `${AD_NODE_API._MAPPINGS}/${dataSourceId}` : AD_NODE_API._MAPPINGS;

  return {
    type: GET_MAPPINGS,
    request: (client: HttpSetup) =>
      client.get(`..${url}`, {
        query: { index: searchKey },
      }),
  };
};

export const searchOpenSearch = (requestData: any): APIAction => ({
  type: SEARCH_OPENSEARCH,
  request: (client: HttpSetup) =>
    client.post(`..${AD_NODE_API._SEARCH}`, {
      body: JSON.stringify(requestData),
    }),
});

export const createIndex = (indexConfig: any, dataSourceId: string): APIAction => {
  const url = dataSourceId
    ? `${AD_NODE_API.CREATE_INDEX}/${dataSourceId}`
    : AD_NODE_API.CREATE_INDEX;
  return {
    type: CREATE_INDEX,
    request: (client: HttpSetup) =>
      client.put(`..${url}`, {
        body: JSON.stringify(indexConfig),
      }),
  };
};

export const bulk = (body: any, dataSourceId: string): APIAction => {
  const url = dataSourceId
    ? `${AD_NODE_API.BULK}/${dataSourceId}`
    : AD_NODE_API.BULK;
  return {
    type: BULK,
    request: (client: HttpSetup) =>
      client.post(`..${url}`, { body: JSON.stringify(body) }),
  };
};

export const deleteIndex = (index: string): APIAction => ({
  type: DELETE_INDEX,
  request: (client: HttpSetup) =>
    client.post(`..${AD_NODE_API.DELETE_INDEX}`, { query: { index: index } }),
});

export const getPrioritizedIndices =
  (searchKey: string, dataSourceId: string): ThunkAction =>
  async (dispatch, getState) => {
    //Fetch Indices and Aliases with text provided
    await dispatch(getIndices(searchKey, dataSourceId));
    await dispatch(getAliases(searchKey, dataSourceId));
    const osState = getState().opensearch;
    const exactMatchedIndices = osState.indices;
    const exactMatchedAliases = osState.aliases;
    if (exactMatchedAliases.length || exactMatchedIndices.length) {
      //If we have exact match just return that
      return {
        indices: exactMatchedIndices,
        aliases: exactMatchedAliases,
      };
    } else {
      //No results found for exact match, append wildCard and get partial matches if exists
      await dispatch(getIndices(`${searchKey}*`, dataSourceId));
      await dispatch(getAliases(`${searchKey}*`, dataSourceId));
      const osState = getState().opensearch;
      const partialMatchedIndices = osState.indices;
      const partialMatchedAliases = osState.aliases;
      if (partialMatchedAliases.length || partialMatchedIndices.length) {
        return {
          indices: partialMatchedIndices,
          aliases: partialMatchedAliases,
        };
      }
    }
  };

export default reducer;
