/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { buildLLMPrompt, useClusterClickHandler } from '../useClusterClickHandler';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../redux/reducers/ad', () => ({
  getDetector: (detectorId: string, dataSourceId: string) => ({
    type: 'ad/GET_DETECTOR',
    detectorId,
    dataSourceId,
  }),
}));

jest.mock('../../../../redux/reducers/anomalyResults', () => ({
  searchResults: (query: any, resultIndex: string, dataSourceId: string, useResultIndex: boolean) => ({
    type: 'results/SEARCH_RESULTS',
    query,
    resultIndex,
    dataSourceId,
    useResultIndex,
  }),
}));

jest.mock('../../../../redux/reducers/ml', () => ({
  predictModel: (modelId: string, body: any, dataSourceId: string) => ({
    type: 'ml/PREDICT',
    modelId,
    body,
    dataSourceId,
  }),
}));

const cluster = {
  indices: ['logs-*'],
  detector_ids: ['det-1'],
  detector_names: ['CPU detector'],
  entities: ['service.name=checkout', 'host: api-1'],
  model_ids: ['model-1'],
  event_start: '2026-04-07T10:00:00.000Z',
  event_end: '2026-04-07T10:05:00.000Z',
  cluster_text: 'Detector found a correlated event.',
  anomalies: [
    {
      model_id: 'model-1',
      detector_id: 'det-1',
      data_start_time: '2026-04-07T10:00:00.000Z',
      data_end_time: '2026-04-07T10:05:00.000Z',
    },
  ],
};

const detectorConfig = {
  description: 'Tracks CPU spikes in checkout traffic',
  indices: ['logs-*'],
  timeField: '@timestamp',
  resultIndex: 'custom-ad-results',
  detectionInterval: {
    period: {
      interval: 5,
      unit: 'MINUTES',
    },
  },
  categoryField: ['service.name'],
  featureAttributes: [
    {
      featureEnabled: true,
      featureName: 'avg_cpu',
      aggregationQuery: {
        avg_cpu: {
          avg: {
            field: 'cpu_usage',
          },
        },
      },
    },
    {
      featureEnabled: false,
      featureName: 'ignored_feature',
      aggregationQuery: {},
    },
  ],
};

describe('useClusterClickHandler', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('buildLLMPrompt', () => {
    test('builds a detailed prompt from detector config and entity values', () => {
      const prompt = buildLLMPrompt(cluster as any, { 'det-1': detectorConfig });
      const message = JSON.parse(prompt.messages)[0].content[0].text;

      expect(prompt.system_prompt).toContain('observability expert');
      expect(message).toContain('Affected entities: checkout, api-1');
      expect(message).toContain('Description: Tracks CPU spikes in checkout traffic');
      expect(message).toContain('Index: logs-*');
      expect(message).toContain('Interval: 5 MINUTES');
      expect(message).toContain('Category: split by service.name');
      expect(message).toContain('Features: avg_cpu (avg on cpu_usage)');
    });

    test('falls back cleanly when config and entities are missing', () => {
      const prompt = buildLLMPrompt(
        {
          ...cluster,
          detector_names: [],
          entities: [],
          anomalies: [],
        } as any,
        {}
      );
      const message = JSON.parse(prompt.messages)[0].content[0].text;

      expect(message).toContain('No specific entities affected.');
      expect(message).toContain('0 anomalies detected');
      expect(message).toContain('- det-1');
    });
  });

  test('fetches detector metadata, opens the modal, and stores anomaly entities', async () => {
    mockDispatch.mockImplementation(async (action: any) => {
      if (action.type === 'ad/GET_DETECTOR') {
        return { response: detectorConfig };
      }
      if (action.type === 'results/SEARCH_RESULTS') {
        return {
          response: {
            hits: {
              hits: [
                {
                  _source: {
                    model_id: 'model-1',
                    entity: [
                      { name: 'service.name', value: 'checkout' },
                      { name: 'host', value: 'api-1' },
                    ],
                  },
                },
              ],
            },
          },
        };
      }
      return {};
    });

    const resultMeta = { generated_at: '2026-04-07T10:30:00.000Z' };
    const { result } = renderHook(() => useClusterClickHandler('ds-1'));

    await act(async () => {
      await result.current.handleClusterClick(cluster as any, resultMeta);
    });

    await waitFor(() => {
      expect(result.current.selectedEvent).toEqual({ cluster, result: resultMeta });
    });

    await waitFor(() => {
      expect(result.current.detectorDescriptions['det-1']).toBe(detectorConfig.description);
      expect(result.current.detectorFeatures['det-1']).toEqual(['avg_cpu']);
      expect(result.current.detectorTimeFields['det-1']).toBe('@timestamp');
      expect(result.current.anomalyEntities['model-1']).toEqual([
        'service.name=checkout',
        'host=api-1',
      ]);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ad/GET_DETECTOR',
      detectorId: 'det-1',
      dataSourceId: 'ds-1',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'results/SEARCH_RESULTS',
        resultIndex: 'custom-ad-results',
        dataSourceId: 'ds-1',
        useResultIndex: true,
      })
    );
  });

  test('warns when detector fetch fails but still opens the selected event', async () => {
    mockDispatch.mockImplementation(async (action: any) => {
      if (action.type === 'ad/GET_DETECTOR') {
        throw new Error('detector lookup failed');
      }
      if (action.type === 'results/SEARCH_RESULTS') {
        return { response: { hits: { hits: [] } } };
      }
      return {};
    });

    const { result } = renderHook(() => useClusterClickHandler('ds-1'));

    await act(async () => {
      await result.current.handleClusterClick(cluster as any, { source: 'warning-test' });
    });

    await waitFor(() => {
      expect(result.current.selectedEvent?.cluster).toEqual(cluster);
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to fetch detector config:',
      'det-1',
      expect.any(Error)
    );
    expect(result.current.detectorFeatures).toEqual({});
  });

  test('reuses cached detector data and clears caches when the data source changes', async () => {
    const getDetectorCalls: string[] = [];

    mockDispatch.mockImplementation(async (action: any) => {
      if (action.type === 'ad/GET_DETECTOR') {
        getDetectorCalls.push(`${action.detectorId}:${action.dataSourceId}`);
        return { response: detectorConfig };
      }
      if (action.type === 'results/SEARCH_RESULTS') {
        return {
          response: {
            hits: {
              hits: [
                {
                  _source: {
                    model_id: 'model-1',
                    entity: [{ name: 'service.name', value: 'checkout' }],
                  },
                },
              ],
            },
          },
        };
      }
      return {};
    });

    const { result, rerender } = renderHook(
      ({ dataSourceId }) => useClusterClickHandler(dataSourceId),
      { initialProps: { dataSourceId: 'ds-1' } }
    );

    await act(async () => {
      await result.current.handleClusterClick(cluster as any, { source: 'first' });
    });

    await waitFor(() => {
      expect(result.current.detectorFeatures['det-1']).toEqual(['avg_cpu']);
      expect(result.current.anomalyEntities['model-1']).toEqual(['service.name=checkout']);
    });

    await act(async () => {
      await result.current.handleClusterClick(cluster as any, { source: 'second' });
    });

    expect(getDetectorCalls).toEqual(['det-1:ds-1']);

    rerender({ dataSourceId: 'ds-2' });

    await waitFor(() => {
      expect(result.current.selectedEvent).toBeNull();
      expect(result.current.detectorFeatures).toEqual({});
      expect(result.current.detectorDescriptions).toEqual({});
      expect(result.current.detectorTimeFields).toEqual({});
      expect(result.current.anomalyEntities).toEqual({});
      expect(result.current.llmSummaries).toEqual({});
    });

    await act(async () => {
      await result.current.handleClusterClick(cluster as any, { source: 'third' });
    });

    expect(getDetectorCalls).toEqual(['det-1:ds-1', 'det-1:ds-2']);
  });
});
