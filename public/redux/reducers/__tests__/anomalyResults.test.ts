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
import { DetectorResultsQueryParams } from '../../../../server/models/types';
import { SORT_DIRECTION } from '../../../../server/utils/constants';
import httpMockedClient from '../../../../test/mocks/httpClientMock';
import { AD_NODE_API } from '../../../../utils/constants';
import { mockedStore } from '../../utils/testUtils';
import reducer, {
  getDetectorResults,
  initialDetectorsState,
  searchResults,
} from '../anomalyResults';
import { ALL_CUSTOM_AD_RESULT_INDICES } from '../../../pages/utils/constants'
import { getAnomalySummaryQuery } from '../../../pages/utils/anomalyResultUtils'

jest.mock('../../../services', () => ({
  ...jest.requireActual('../../../services'),

  getDataSourceEnabled: () => ({
    enabled: false  
  })
}));

describe('anomaly results reducer actions', () => {
  let store: MockStore;
  beforeEach(() => {
    store = mockedStore();
  });
  describe('getDetectorResults', () => {
    test('should invoke [REQUEST, SUCCESS]', async () => {
      const response = {
        totalAnomalies: 1,
        results: [{ anomalyGrade: 0, confidence: 1, starTime: 1, endTime: 2 }],
      };
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response });
      const tempDetectorId = '123';
      let queryParams: DetectorResultsQueryParams = {
        from: 0,
        size: 20,
        sortDirection: SORT_DIRECTION.ASC,
        sortField: 'startTime',
      };
      const resultIndex = 'opensearch-ad-plugin-result-test';
      await store.dispatch(
        getDetectorResults(
          tempDetectorId,
          '',
          queryParams,
          false,
          resultIndex,
          true
        )
      );
      const actions = store.getActions();

      expect(actions[0].type).toBe('ad/DETECTOR_RESULTS_REQUEST');
      expect(reducer(initialDetectorsState, actions[0])).toEqual({
        ...initialDetectorsState,
        requesting: true,
      });
      expect(actions[1].type).toBe('ad/DETECTOR_RESULTS_SUCCESS');
      expect(reducer(initialDetectorsState, actions[1])).toEqual({
        ...initialDetectorsState,
        requesting: false,
        total: response.totalAnomalies,
        anomalies: response.results,
        featureData: undefined,
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${
          AD_NODE_API.DETECTOR
        }/${tempDetectorId}/results/${false}/${resultIndex}*/true`,
        { query: queryParams }
      );
    });
    test('should invoke [REQUEST, FAILURE]', async () => {
      httpMockedClient.get = jest.fn().mockRejectedValue({
        ok: false,
        error: 'Something went wrong',
      });
      const tempDetectorId = '123';
      let queryParams: DetectorResultsQueryParams = {
        from: 0,
        size: 20,
        sortDirection: SORT_DIRECTION.ASC,
        sortField: 'startTime',
      };
      try {
        await store.dispatch(
          getDetectorResults(tempDetectorId, '', queryParams, false, '', false)
        );
      } catch (e) {
        const actions = store.getActions();
        expect(actions[0].type).toBe('ad/DETECTOR_RESULTS_REQUEST');
        expect(reducer(initialDetectorsState, actions[0])).toEqual({
          ...initialDetectorsState,
          requesting: true,
        });
        expect(actions[1].type).toBe('ad/DETECTOR_RESULTS_FAILURE');
        expect(reducer(initialDetectorsState, actions[1])).toEqual({
          ...initialDetectorsState,
          requesting: false,
          errorMessage: 'Something went wrong',
        });
        expect(httpMockedClient.get).toHaveBeenCalledWith(
          `..${AD_NODE_API.DETECTOR}/${tempDetectorId}/results/${false}`,
          { query: queryParams }
        );
      }
    });
    test('result index pattern will not result in appended wildcard star', async () => {
      const response = {
        totalAnomalies: 1,
        results: [{ anomalyGrade: 0, confidence: 1, starTime: 1, endTime: 2 }],
      };
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response });
      const tempDetectorId = '123';
      let queryParams: DetectorResultsQueryParams = {
        from: 0,
        size: 20,
        sortDirection: SORT_DIRECTION.ASC,
        sortField: 'startTime',
      };
      await store.dispatch(
        getDetectorResults(
          tempDetectorId,
          '',
          queryParams,
          false,
          ALL_CUSTOM_AD_RESULT_INDICES,
          true
        )
      );
      const actions = store.getActions();

      expect(actions[0].type).toBe('ad/DETECTOR_RESULTS_REQUEST');
      expect(reducer(initialDetectorsState, actions[0])).toEqual({
        ...initialDetectorsState,
        requesting: true,
      });
      expect(actions[1].type).toBe('ad/DETECTOR_RESULTS_SUCCESS');
      expect(reducer(initialDetectorsState, actions[1])).toEqual({
        ...initialDetectorsState,
        requesting: false,
        total: response.totalAnomalies,
        anomalies: response.results,
        featureData: undefined,
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${
          AD_NODE_API.DETECTOR
        }/${tempDetectorId}/results/${false}/${ALL_CUSTOM_AD_RESULT_INDICES}/true`,
        { query: queryParams }
      );
    });
  });
  test('searchResults should append wildcard star at the end of custom result index', async () => {
      const response = {
        aggregations: {
          top_entities: {
            doc_count: 0,
            top_entity_aggs: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: []
            }
          }
        }
      };

    httpMockedClient.post = jest
      .fn()
      .mockResolvedValue({ ok: true, response });
    const tempDetectorId = '123';
    const resultIndex = 'opensearch-ad-plugin-result-test';
    const requestBody = getAnomalySummaryQuery(1717529636479, 1717529736479, tempDetectorId, undefined, false, undefined, undefined)
    await store.dispatch(
      searchResults(
        requestBody,
        resultIndex,
        '',
        true
      )
    );
    const actions = store.getActions();

    expect(actions[0].type).toBe('ad/SEARCH_ANOMALY_RESULTS_REQUEST');
    expect(reducer(initialDetectorsState, actions[0])).toEqual({
      ...initialDetectorsState,
      requesting: true,
    });
    expect(actions[1].type).toBe('ad/SEARCH_ANOMALY_RESULTS_SUCCESS');
    expect(reducer(initialDetectorsState, actions[1])).toEqual({
      ...initialDetectorsState,
      requesting: false,
    });
    expect(httpMockedClient.post).toHaveBeenCalledWith(
      `..${
        AD_NODE_API.DETECTOR
      }/results/_search/${resultIndex}*/true`,
      { body: JSON.stringify(requestBody) }
    );
  });
  test('searchResults should not append wildcard star at the end of custom result index', async () => {
      const response = {
        took: 1,
        timed_out: false,
        _shards: {
          total: 2,
          successful: 2,
          skipped: 0,
          failed: 0
        },
        hits: {
          total: {
            value: 0,
            relation: "eq"
          },
          max_score: null,
          hits: []
        },
        aggregations: {
          top_entities: {
            doc_count: 0,
            top_entity_aggs: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: []
            }
          }
        }
      };

    httpMockedClient.post = jest
      .fn()
      .mockResolvedValue({ ok: true, response });
    const tempDetectorId = '123';
    const requestBody = getAnomalySummaryQuery(1717529636479, 1717529736479, tempDetectorId, undefined, false, undefined, undefined)
    await store.dispatch(
      searchResults(
        requestBody,
        ALL_CUSTOM_AD_RESULT_INDICES,
        '',
        true
      )
    );
    const actions = store.getActions();

    expect(actions[0].type).toBe('ad/SEARCH_ANOMALY_RESULTS_REQUEST');
    expect(reducer(initialDetectorsState, actions[0])).toEqual({
      ...initialDetectorsState,
      requesting: true,
    });
    expect(actions[1].type).toBe('ad/SEARCH_ANOMALY_RESULTS_SUCCESS');
    expect(reducer(initialDetectorsState, actions[1])).toEqual({
      ...initialDetectorsState,
      requesting: false,
    });
    expect(httpMockedClient.post).toHaveBeenCalledWith(
      `..${
        AD_NODE_API.DETECTOR
      }/results/_search/${ALL_CUSTOM_AD_RESULT_INDICES}/true`,
      { body: JSON.stringify(requestBody) }
    );
  });
});
