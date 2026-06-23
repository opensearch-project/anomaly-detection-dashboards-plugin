/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { MockStore } from 'redux-mock-store';
import httpMockedClient from '../../../../test/mocks/httpClientMock';
import { AD_NODE_API } from '../../../../utils/constants';
import { mockedStore } from '../../utils/testUtils';
import reducer, {
  getInsightsResults,
  getInsightsStatus,
  initialInsightsState,
  startInsightsJob,
  stopInsightsJob,
} from '../insights';

describe('insights reducer actions', () => {
  let store: MockStore;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    store = mockedStore();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('getInsightsStatus', () => {
    test('dispatches request and success actions', async () => {
      const response = {
        enabled: true,
        schedule: {
          interval: {
            start_time: 123,
            period: 24,
            unit: 'hours',
          },
        },
      };
      httpMockedClient.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response });

      await store.dispatch(getInsightsStatus());
      const actions = store.getActions();

      expect(actions[0].type).toBe('insights/GET_INSIGHTS_STATUS_REQUEST');
      expect(reducer(initialInsightsState, actions[0])).toEqual({
        ...initialInsightsState,
        requesting: true,
        errorMessage: '',
      });
      expect(actions[1].type).toBe('insights/GET_INSIGHTS_STATUS_SUCCESS');
      expect(reducer(initialInsightsState, actions[1])).toEqual({
        ...initialInsightsState,
        requesting: false,
        enabled: true,
        schedule: response.schedule,
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        AD_NODE_API.INSIGHTS_STATUS
      );
    });

    test('appends data source id and handles failure', async () => {
      httpMockedClient.get = jest.fn().mockRejectedValue('status failed');

      try {
        await store.dispatch(getInsightsStatus('ds-1'));
      } catch {
        const actions = store.getActions();
        expect(actions[1].type).toBe('insights/GET_INSIGHTS_STATUS_FAILURE');
        expect(reducer(initialInsightsState, actions[1])).toEqual({
          ...initialInsightsState,
          requesting: false,
          enabled: false,
          schedule: null,
          errorMessage: 'status failed',
        });
        expect(httpMockedClient.get).toHaveBeenCalledWith(
          `${AD_NODE_API.INSIGHTS_STATUS}/ds-1`
        );
      }
    });
  });

  describe('getInsightsResults', () => {
    test('dispatches request and success actions with a size-limited query', async () => {
      const results = [
        {
          generated_at: '2026-04-07T10:00:00.000Z',
          clusters: [{ cluster_text: 'cluster' }],
        },
      ];
      httpMockedClient.get = jest.fn().mockResolvedValue({
        ok: true,
        response: { results },
      });

      await store.dispatch(getInsightsResults('ds-2'));
      const actions = store.getActions();

      expect(actions[0].type).toBe('insights/GET_INSIGHTS_RESULTS_REQUEST');
      expect(reducer(initialInsightsState, actions[0]).requesting).toBe(true);
      expect(actions[1].type).toBe('insights/GET_INSIGHTS_RESULTS_SUCCESS');
      expect(reducer(initialInsightsState, actions[1])).toEqual({
        ...initialInsightsState,
        requesting: false,
        results,
      });
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `${AD_NODE_API.INSIGHTS_RESULTS}/ds-2`,
        {
          query: { from: 0, size: 1 },
        }
      );
    });

    test('clears results on failure', async () => {
      httpMockedClient.get = jest.fn().mockRejectedValue('results failed');

      try {
        await store.dispatch(getInsightsResults());
      } catch {
        const actions = store.getActions();
        expect(actions[1].type).toBe('insights/GET_INSIGHTS_RESULTS_FAILURE');
        expect(
          reducer(
            { ...initialInsightsState, results: [{ generated_at: 'old' }] },
            actions[1]
          )
        ).toEqual({
          ...initialInsightsState,
          requesting: false,
          results: [],
          errorMessage: 'results failed',
        });
      }
    });
  });

  describe('startInsightsJob', () => {
    test('posts the requested frequency and clears requesting on success', async () => {
      httpMockedClient.post = jest.fn().mockResolvedValue({ ok: true });

      await store.dispatch(startInsightsJob('24h', 'ds-3'));
      const actions = store.getActions();

      expect(actions[0].type).toBe('insights/START_INSIGHTS_JOB_REQUEST');
      expect(reducer(initialInsightsState, actions[0]).requesting).toBe(true);
      expect(actions[1].type).toBe('insights/START_INSIGHTS_JOB_SUCCESS');
      expect(
        reducer({ ...initialInsightsState, requesting: true }, actions[1])
      ).toEqual({
        ...initialInsightsState,
        requesting: false,
        errorMessage: '',
      });
      expect(httpMockedClient.post).toHaveBeenCalledWith(
        `${AD_NODE_API.INSIGHTS_START}/ds-3`,
        {
          body: JSON.stringify({ frequency: '24h' }),
        }
      );
    });

    test('sets errorMessage on failure', async () => {
      httpMockedClient.post = jest.fn().mockRejectedValue('start failed');

      try {
        await store.dispatch(startInsightsJob('1h'));
      } catch {
        const actions = store.getActions();
        expect(actions[1].type).toBe('insights/START_INSIGHTS_JOB_FAILURE');
        expect(reducer(initialInsightsState, actions[1]).errorMessage).toBe(
          'start failed'
        );
        expect(httpMockedClient.post).toHaveBeenCalledWith(
          AD_NODE_API.INSIGHTS_START,
          {
            body: JSON.stringify({ frequency: '1h' }),
          }
        );
      }
    });
  });

  describe('stopInsightsJob', () => {
    test('posts to the stop endpoint and clears requesting on success', async () => {
      httpMockedClient.post = jest.fn().mockResolvedValue({ ok: true });

      await store.dispatch(stopInsightsJob('ds-4'));
      const actions = store.getActions();

      expect(actions[0].type).toBe('insights/STOP_INSIGHTS_JOB_REQUEST');
      expect(reducer(initialInsightsState, actions[0]).requesting).toBe(true);
      expect(actions[1].type).toBe('insights/STOP_INSIGHTS_JOB_SUCCESS');
      expect(
        reducer({ ...initialInsightsState, requesting: true }, actions[1])
      ).toEqual({
        ...initialInsightsState,
        requesting: false,
        errorMessage: '',
      });
      expect(httpMockedClient.post).toHaveBeenCalledWith(
        `${AD_NODE_API.INSIGHTS_STOP}/ds-4`
      );
    });

    test('sets errorMessage on failure', async () => {
      httpMockedClient.post = jest.fn().mockRejectedValue('stop failed');

      try {
        await store.dispatch(stopInsightsJob());
      } catch {
        const actions = store.getActions();
        expect(actions[1].type).toBe('insights/STOP_INSIGHTS_JOB_FAILURE');
        expect(reducer(initialInsightsState, actions[1]).errorMessage).toBe(
          'stop failed'
        );
        expect(httpMockedClient.post).toHaveBeenCalledWith(
          AD_NODE_API.INSIGHTS_STOP
        );
      }
    });
  });
});
