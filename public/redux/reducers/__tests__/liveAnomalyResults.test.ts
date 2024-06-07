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
import { ALL_CUSTOM_AD_RESULT_INDICES } from '../../../pages/utils/constants';
import reducer, {
  getDetectorLiveResults,
  initialDetectorLiveResults,
} from '../liveAnomalyResults';

jest.mock('../../../services', () => ({
  ...jest.requireActual('../../../services'),

  getDataSourceEnabled: () => ({
    enabled: false,
  }),
}));

describe('live anomaly results reducer actions', () => {
  let store: MockStore;
  beforeEach(() => {
    store = mockedStore();
  });
  describe('getDetectorLiveResults', () => {
    test('getDetectorLiveResults should append wildcard star at the end of custom result index', async () => {
      const response = {
        totalAnomalies: 1,
        results: [{ anomalyGrade: 0, confidence: 1, starTime: 1, endTime: 2 }],
      };

      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response });
      const tempDetectorId = '123';
      const resultIndex = 'opensearch-ad-plugin-result-test';
      let queryParams: DetectorResultsQueryParams = {
        from: 0,
        size: 20,
        sortDirection: SORT_DIRECTION.ASC,
        sortField: 'startTime',
      };
      await store.dispatch(
        getDetectorLiveResults(
          tempDetectorId,
          '',
          queryParams,
          false,
          resultIndex,
          true
        )
      );
      const actions = store.getActions();

      expect(actions[0].type).toBe('ad/DETECTOR_LIVE_RESULTS_REQUEST');
      expect(reducer(initialDetectorLiveResults, actions[0])).toEqual({
        ...initialDetectorLiveResults,
        requesting: true,
      });
      expect(actions[1].type).toBe('ad/DETECTOR_LIVE_RESULTS_SUCCESS');
      expect(reducer(initialDetectorLiveResults, actions[1])).toEqual({
        ...initialDetectorLiveResults,
        requesting: false,
        totalLiveAnomalies: response.totalAnomalies,
        liveAnomalies: response.results,
        errorMessage: '',
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${
          AD_NODE_API.DETECTOR
        }/${tempDetectorId}/results/${false}/${resultIndex}*/true`,
        { query: queryParams }
      );
    });
    test('getDetectorLiveResults should not append wildcard star at the end of custom result index', async () => {
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
        getDetectorLiveResults(
          tempDetectorId,
          '',
          queryParams,
          false,
          ALL_CUSTOM_AD_RESULT_INDICES,
          true
        )
      );
      const actions = store.getActions();

      expect(actions[0].type).toBe('ad/DETECTOR_LIVE_RESULTS_REQUEST');
      expect(reducer(initialDetectorLiveResults, actions[0])).toEqual({
        ...initialDetectorLiveResults,
        requesting: true,
      });
      expect(actions[1].type).toBe('ad/DETECTOR_LIVE_RESULTS_SUCCESS');
      expect(reducer(initialDetectorLiveResults, actions[1])).toEqual({
        ...initialDetectorLiveResults,
        requesting: false,
        totalLiveAnomalies: response.totalAnomalies,
        liveAnomalies: response.results,
        errorMessage: '',
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `..${
          AD_NODE_API.DETECTOR
        }/${tempDetectorId}/results/${false}/${ALL_CUSTOM_AD_RESULT_INDICES}/true`,
        { query: queryParams }
      );
    });
  });
});
