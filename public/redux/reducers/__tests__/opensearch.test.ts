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

import { MockStore } from 'redux-mock-store';
import httpMockedClient from '../../../../test/mocks/httpClientMock';
import { BASE_NODE_API_PATH } from '../../../../utils/constants';
import { mockedStore } from '../../utils/testUtils';
import reducer, {
  getAliases,
  getClustersInfo,
  getIndices,
  getIndicesAndAliases,
  getMappings,
  initialState,
  searchOpenSearch,
} from '../opensearch';

describe('opensearch reducer actions', () => {
  let store: MockStore;
  beforeEach(() => {
    store = mockedStore();
  });
  describe('getIndices', () => {
    test('should invoke [REQUEST, SUCCESS]', async () => {
      const indices = [
        { index: 'hello', health: 'green' },
        { index: 'world', health: 'yellow' },
      ];
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response: { indices } });
      await store.dispatch(getIndices());
      const actions = store.getActions();

      expect(actions[0].type).toBe('opensearch/GET_INDICES_REQUEST');
      expect(reducer(initialState, actions[0])).toEqual({
        ...initialState,
        requesting: true,
      });
      expect(actions[1].type).toBe('opensearch/GET_INDICES_SUCCESS');
      expect(reducer(initialState, actions[1])).toEqual({
        ...initialState,
        requesting: false,
        indices,
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${BASE_NODE_API_PATH}/_indices`,
        {
          query: { index: '', clusters: '' },
        }
      );
    });
    test('should invoke [REQUEST, FAILURE]', async () => {
      httpMockedClient.get = jest.fn().mockRejectedValue({
        ok: false,
        error: 'Something went wrong',
      });
      try {
        await store.dispatch(getIndices());
      } catch (e) {
        const actions = store.getActions();
        expect(actions[0].type).toBe('opensearch/GET_INDICES_REQUEST');
        expect(reducer(initialState, actions[0])).toEqual({
          ...initialState,
          requesting: true,
        });
        expect(actions[1].type).toBe('opensearch/GET_INDICES_FAILURE');
        expect(reducer(initialState, actions[1])).toEqual({
          ...initialState,
          requesting: false,
          errorMessage: 'Something went wrong',
        });
        expect(httpMockedClient.get).toHaveBeenCalledWith(
          `..${BASE_NODE_API_PATH}/_indices`,
          {
            query: { index: '', clusters: '' },
          }
        );
      }
    });
  });
  describe('getAliases', () => {
    test('should invoke [REQUEST, SUCCESS]', async () => {
      const aliases = [{ index: 'hello', alias: 'world' }];
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response: { aliases } });
      await store.dispatch(getAliases());
      const actions = store.getActions();

      expect(actions[0].type).toBe('opensearch/GET_ALIASES_REQUEST');
      expect(reducer(initialState, actions[0])).toEqual({
        ...initialState,
        requesting: true,
      });
      expect(actions[1].type).toBe('opensearch/GET_ALIASES_SUCCESS');
      expect(reducer(initialState, actions[1])).toEqual({
        ...initialState,
        requesting: false,
        aliases,
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${BASE_NODE_API_PATH}/_aliases`,
        {
          query: { alias: '' },
        }
      );
    });
    test('should invoke [REQUEST, FAILURE]', async () => {
      httpMockedClient.get = jest.fn().mockRejectedValue({
        ok: false,
        error: 'Something went wrong',
      });
      try {
        await store.dispatch(getAliases());
      } catch (e) {
        const actions = store.getActions();
        expect(actions[0].type).toBe('opensearch/GET_ALIASES_REQUEST');
        expect(reducer(initialState, actions[0])).toEqual({
          ...initialState,
          requesting: true,
        });
        expect(actions[1].type).toBe('opensearch/GET_ALIASES_FAILURE');
        expect(reducer(initialState, actions[1])).toEqual({
          ...initialState,
          requesting: false,
          errorMessage: 'Something went wrong',
        });
        expect(httpMockedClient.get).toHaveBeenCalledWith(
          `..${BASE_NODE_API_PATH}/_aliases`,
          {
            query: { alias: '' },
          }
        );
      }
    });
  });
  describe('getMappings', () => {
    test('should invoke [REQUEST, SUCCESS]', async () => {
      const mappings = {
        opensearch_dashboards: {
          mappings: {
            properties: {
              field_1: { type: 'string' },
              field_2: { type: 'long' },
            },
          },
        },
      };
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response: { mappings } });
      await store.dispatch(getMappings());
      const actions = store.getActions();
      expect(actions[0].type).toBe('opensearch/GET_MAPPINGS_REQUEST');
      expect(reducer(initialState, actions[0])).toEqual({
        ...initialState,
        requesting: true,
      });
      expect(actions[1].type).toBe('opensearch/GET_MAPPINGS_SUCCESS');
      expect(reducer(initialState, actions[1])).toEqual({
        ...initialState,
        requesting: false,
        dataTypes: {
          string: ['field_1'],
          long: ['field_2'],
        },
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `${BASE_NODE_API_PATH}/_mappings`,
        {
          query: { indices: [] },
        }
      );
    });
    test('should invoke [REQUEST, FAILURE]', async () => {
      httpMockedClient.get = jest.fn().mockRejectedValue({
        ok: false,
        error: 'Something went wrong',
      });
      try {
        await store.dispatch(getMappings());
      } catch (e) {
        const actions = store.getActions();
        expect(actions[0].type).toBe('opensearch/GET_MAPPINGS_REQUEST');
        expect(reducer(initialState, actions[0])).toEqual({
          ...initialState,
          requesting: true,
        });
        expect(actions[1].type).toBe('opensearch/GET_MAPPINGS_FAILURE');
        expect(reducer(initialState, actions[1])).toEqual({
          ...initialState,
          requesting: false,
          errorMessage: 'Something went wrong',
        });
        expect(httpMockedClient.get).toHaveBeenCalledWith(
          `${BASE_NODE_API_PATH}/_mappings`,
          {
            query: { indices: [] },
          }
        );
      }
    });
  });

  describe('searchOpenSearch', () => {
    test('should invoke [REQUEST, SUCCESS]', async () => {
      const requestData = {
        query: {
          match: { match_all: {} },
        },
        index: 'test-index',
      };
      httpMockedClient.post = jest.fn().mockResolvedValue({
        ok: true,
        response: { hits: { hits: [] } },
      });
      await store.dispatch(searchOpenSearch(requestData));
      const actions = store.getActions();
      expect(actions[0].type).toBe('opensearch/SEARCH_OPENSEARCH_REQUEST');
      expect(reducer(initialState, actions[0])).toEqual({
        ...initialState,
        requesting: true,
      });
      expect(actions[1].type).toBe('opensearch/SEARCH_OPENSEARCH_SUCCESS');
      expect(reducer(initialState, actions[1])).toEqual({
        ...initialState,
        requesting: false,
        searchResult: {
          hits: { hits: [] },
        },
      });
      expect(httpMockedClient.post).toHaveBeenCalledWith(
        `..${BASE_NODE_API_PATH}/_search`,
        {
          body: JSON.stringify(requestData),
        }
      );
    });
    test('should invoke [REQUEST, FAILURE]', async () => {
      const requestData = {
        query: {
          match: { match_all: {} },
        },
        index: 'test-index',
      };
      httpMockedClient.post = jest.fn().mockRejectedValue({
        ok: false,
        error: 'Something went wrong',
      });
      try {
        await store.dispatch(searchOpenSearch(requestData));
      } catch (e) {
        const actions = store.getActions();
        expect(actions[0].type).toBe('opensearch/SEARCH_OPENSEARCH_REQUEST');
        expect(reducer(initialState, actions[0])).toEqual({
          ...initialState,
          requesting: true,
        });
        expect(actions[1].type).toBe('opensearch/SEARCH_OPENSEARCH_FAILURE');
        expect(reducer(initialState, actions[1])).toEqual({
          ...initialState,
          requesting: false,
          errorMessage: 'Something went wrong',
        });
        expect(httpMockedClient.post).toHaveBeenCalledWith(
          `..${BASE_NODE_API_PATH}/_search`,
          {
            body: JSON.stringify(requestData),
          }
        );
      }
    });
  });
  describe('getIndicesAndAliases', () => {
    test('should handle [REQUEST, SUCCESS] actions for getIndicesAndAliases', async () => {
      const indices = [
        { index: 'index1', health: 'green' },
        { index: 'index2', health: 'yellow' },
      ];
      const aliases = [
        { alias: 'alias1', index: 'index1' },
        { alias: 'alias2', index: 'index2' },
      ];
      
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response: { indices, aliases } });
    
      await store.dispatch(getIndicesAndAliases());
      const actions = store.getActions();
    
      expect(actions[0].type).toBe('opensearch/GET_INDICES_AND_ALIASES_REQUEST');
      expect(reducer(initialState, actions[0])).toEqual({
        ...initialState,
        requesting: true,
      });
    
      expect(actions[1].type).toBe('opensearch/GET_INDICES_AND_ALIASES_SUCCESS');
      expect(reducer(initialState, actions[1])).toEqual({
        ...initialState,
        requesting: false,
        indices,
        aliases,
      });
    
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${BASE_NODE_API_PATH}/_indices_and_aliases`,
        {
          query: { indexOrAliasQuery: '', clusters: '', queryForLocalCluster: true },
        }
      );
    });
    test('should handle [REQUEST, SUCCESS] actions for getIndicesAndAliases with clusters', async () => {
      const indices = [
        { index: 'index1', health: 'green' },
        { index: 'index2', health: 'yellow' },
      ];
      const aliases = [
        { alias: 'alias1', index: 'index1' },
        { alias: 'alias2', index: 'index2' },
      ];
  
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response: { indices, aliases } });
  
      await store.dispatch(getIndicesAndAliases('', '', 'cluster-2,cluster-3'));
      const actions = store.getActions();
  
      expect(actions[0].type).toBe('opensearch/GET_INDICES_AND_ALIASES_REQUEST');
      expect(reducer(initialState, actions[0])).toEqual({
        ...initialState,
        requesting: true,
      });
  
      expect(actions[1].type).toBe('opensearch/GET_INDICES_AND_ALIASES_SUCCESS');
      expect(reducer(initialState, actions[1])).toEqual({
        ...initialState,
        requesting: false,
        indices,
        aliases,
      });
  
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${BASE_NODE_API_PATH}/_indices_and_aliases`,
        {
          query: {
            indexOrAliasQuery: '',
            clusters: 'cluster-2,cluster-3',
            queryForLocalCluster: true,
          },
        }
      );
    });
    test('should handle [REQUEST, FAILURE] actions for getIndicesAndAliases', async () => {
      httpMockedClient.get = jest.fn().mockRejectedValue({
        ok: false,
        error: 'Something went wrong',
      });
    
      try {
        await store.dispatch(getIndicesAndAliases());
      } catch (e) {
        const actions = store.getActions();
    
        expect(actions[0].type).toBe('opensearch/GET_INDICES_AND_ALIASES_REQUEST');
        expect(reducer(initialState, actions[0])).toEqual({
          ...initialState,
          requesting: true,
          errorMessage: '',
        });
    
        expect(actions[1].type).toBe('opensearch/GET_INDICES_AND_ALIASES_FAILURE');
        expect(reducer(initialState, actions[1])).toEqual({
          ...initialState,
          requesting: false,
          errorMessage: 'Something went wrong',
        });
    
        expect(httpMockedClient.get).toHaveBeenCalledWith(
          `..${BASE_NODE_API_PATH}/_indices_and_aliases`,
          {
            query: {
              indexOrAliasQuery: '',
              clusters: '',
              queryForLocalCluster: true,
            },
          }
        );
      }
    });
  });
  describe('getClustersInfo', () => {
    test('should invoke [REQUEST, SUCCESS]', async () => {
      const clusters = [
        { cluster: 'cluster1', status: 'green' },
        { cluster: 'cluster2', status: 'yellow' },
      ];
  
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response: { clusters } });
  
      await store.dispatch(getClustersInfo());
      const actions = store.getActions();
  
      expect(actions[0].type).toBe('opensearch/GET_CLUSTERS_INFO_REQUEST');
      expect(reducer(initialState, actions[0])).toEqual({
        ...initialState,
        requesting: true,
        errorMessage: '',
      });
  
      expect(actions[1].type).toBe('opensearch/GET_CLUSTERS_INFO_SUCCESS');
      expect(reducer(initialState, actions[1])).toEqual({
        ...initialState,
        requesting: false,
        clusters,
      });
  
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${BASE_NODE_API_PATH}/_remote/info`
      );
    });
    test('should invoke [REQUEST, FAILURE]', async () => {
      const errorMessage = 'Something went wrong';
  
      httpMockedClient.get = jest.fn().mockRejectedValue({
        ok: false,
        error: errorMessage,
      });
  
      try {
        await store.dispatch(getClustersInfo());
      } catch (e) {
        const actions = store.getActions();
  
        expect(actions[0].type).toBe('opensearch/GET_CLUSTERS_INFO_REQUEST');
        expect(reducer(initialState, actions[0])).toEqual({
          ...initialState,
          requesting: true,
          errorMessage: '',
        });
  
        expect(actions[1].type).toBe('opensearch/GET_CLUSTERS_INFO_FAILURE');
        expect(reducer(initialState, actions[1])).toEqual({
          ...initialState,
          requesting: false,
          errorMessage,
        });
  
        expect(httpMockedClient.get).toHaveBeenCalledWith(
          `..${BASE_NODE_API_PATH}/_remote/info`
        );
      }
    });
  });

  describe('getPrioritizedIndices', () => {});
});
