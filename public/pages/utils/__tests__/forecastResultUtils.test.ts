/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildParamsForGetForecasterResultsWithDateRange,
  composeLatestForecastRunQuery,
  parseLatestForecastRunResponse,
  extractEntitiesFromResponse,
  buildVisualizationParams,
  ALL_CATEGORICAL_FIELDS,
} from '../forecastResultUtils';
import {
  FORECASTER_DOC_FIELDS,
  SORT_DIRECTION,
} from '../../../../server/utils/constants';
import { MAX_ANOMALIES } from '../../../utils/constants';

describe('buildParamsForGetForecasterResultsWithDateRange', () => {
  test('builds params without entityList', () => {
    const result = buildParamsForGetForecasterResultsWithDateRange(
      1000,
      2000,
      500,
      10
    );
    expect(result).toEqual({
      from: 0,
      size: MAX_ANOMALIES,
      sortDirection: SORT_DIRECTION.DESC,
      sortField: FORECASTER_DOC_FIELDS.DATA_END_TIME,
      startTime: 1000,
      endTime: 2000,
      fieldName: FORECASTER_DOC_FIELDS.DATA_END_TIME,
      entityList: JSON.stringify(undefined),
      dawnEpoch: 500,
      maxEntities: 10,
    });
  });

  test('builds params with entityList', () => {
    const entities = [{ host: 'server1' }];
    const result = buildParamsForGetForecasterResultsWithDateRange(
      1000,
      2000,
      500,
      5,
      entities
    );
    expect(result.entityList).toBe(JSON.stringify(entities));
    expect(result.maxEntities).toBe(5);
  });
});

describe('composeLatestForecastRunQuery', () => {
  test('builds query without taskId', () => {
    const query = composeLatestForecastRunQuery();
    expect(query.size).toBe(0);
    expect(query.query.bool.must).toHaveLength(1);
    expect(query.query.bool.must[0]).toEqual({
      exists: { field: FORECASTER_DOC_FIELDS.FORECAST_DATA_END_TIME },
    });
    expect(query.aggs.max_plot_time.max.field).toBe(
      FORECASTER_DOC_FIELDS.DATA_END_TIME
    );
  });

  test('builds query with taskId', () => {
    const query = composeLatestForecastRunQuery('task-123');
    expect(query.query.bool.must).toHaveLength(2);
    expect(query.query.bool.must[1]).toEqual({
      term: { task_id: 'task-123' },
    });
  });

  test('does not add taskId filter for empty string', () => {
    const query = composeLatestForecastRunQuery('');
    expect(query.query.bool.must).toHaveLength(1);
  });

  test('does not add taskId filter for undefined', () => {
    const query = composeLatestForecastRunQuery(undefined);
    expect(query.query.bool.must).toHaveLength(1);
  });
});

describe('parseLatestForecastRunResponse', () => {
  test('extracts max_plot_time value', () => {
    const response = {
      response: {
        aggregations: {
          max_plot_time: { value: 1609459200000 },
        },
      },
    };
    expect(parseLatestForecastRunResponse(response)).toBe(1609459200000);
  });

  test('returns undefined for null value', () => {
    const response = {
      response: {
        aggregations: {
          max_plot_time: { value: null },
        },
      },
    };
    expect(parseLatestForecastRunResponse(response)).toBeUndefined();
  });

  test('returns undefined for missing aggregations', () => {
    expect(parseLatestForecastRunResponse({ response: {} })).toBeUndefined();
  });

  test('returns undefined for empty response', () => {
    expect(parseLatestForecastRunResponse({})).toBeUndefined();
  });

  test('returns undefined for undefined response', () => {
    expect(parseLatestForecastRunResponse(undefined)).toBeUndefined();
  });
});

describe('extractEntitiesFromResponse', () => {
  test('extracts entities from buckets', () => {
    const response = {
      response: {
        buckets: [
          { key: { host: 'server1', region: 'us-east' } },
          { key: { host: 'server2', region: 'us-west' } },
        ],
      },
    };
    const result = extractEntitiesFromResponse(response);
    expect(result).toEqual([
      { host: 'server1', region: 'us-east' },
      { host: 'server2', region: 'us-west' },
    ]);
  });

  test('returns empty array for missing buckets', () => {
    expect(extractEntitiesFromResponse({ response: {} })).toEqual([]);
  });

  test('returns empty array for undefined response', () => {
    expect(extractEntitiesFromResponse(undefined)).toEqual([]);
  });

  test('skips buckets without key', () => {
    const response = {
      response: {
        buckets: [{ key: { host: 'server1' } }, { noKey: true }],
      },
    };
    const result = extractEntitiesFromResponse(response);
    expect(result).toHaveLength(1);
  });

  test('converts numeric values to strings', () => {
    const response = {
      response: {
        buckets: [{ key: { count: 42 } }],
      },
    };
    const result = extractEntitiesFromResponse(response);
    expect(result[0].count).toBe('42');
  });
});

describe('buildVisualizationParams', () => {
  const baseOptions = {
    filterByOption: 'builtin',
    filterByValue: '',
    sortByOption: 'min_ci_width',
    thresholdValue: 0,
    thresholdDirection: '',
    forecast_from: undefined,
    splitByOption: ALL_CATEGORICAL_FIELDS,
    operatorValue: '>',
    filterQuery: {},
    subaggregations: [],
  };

  test('builds params with builtin filter and all categorical fields', () => {
    const forecaster = { categoryField: ['host', 'region'] };
    const result = buildVisualizationParams(forecaster, baseOptions, 5000, 5);
    expect(result.split_by).toBe('host,region');
    expect(result.filter_by).toBe('BUILD_IN_QUERY');
    expect(result.build_in_query).toBe('MIN_CONFIDENCE_INTERVAL_WIDTH');
    expect(result.forecast_from).toBe(5000);
  });

  test('builds params with specific split field', () => {
    const options = { ...baseOptions, splitByOption: 'host' };
    const result = buildVisualizationParams(
      { categoryField: ['host', 'region'] },
      options,
      5000,
      5
    );
    expect(result.split_by).toBe('host');
  });

  test('builds params with threshold distance', () => {
    const options = {
      ...baseOptions,
      sortByOption: 'threshold_dist',
      thresholdValue: 100,
      operatorValue: '>=',
    };
    const result = buildVisualizationParams({}, options, 5000, 5);
    expect(result.build_in_query).toBe('DISTANCE_TO_THRESHOLD_VALUE');
    expect(result.threshold).toBe(100);
    expect(result.relation_to_threshold).toBe('GREATER_THAN_OR_EQUAL_TO');
  });

  test('builds params with custom filter', () => {
    const options = {
      ...baseOptions,
      filterByOption: 'custom',
      filterQuery: { match_all: {} },
      subaggregations: [
        { aggregation_query: { avg: { field: 'val' } }, order: 'asc' },
      ],
    };
    const result = buildVisualizationParams({}, options, 5000, 10);
    expect(result.filter_by).toBe('CUSTOM_QUERY');
    expect(result.filter_query).toEqual({ match_all: {} });
    expect(result.size).toBe(10);
  });

  test('throws when maxPlotTime is falsy', () => {
    expect(() => buildVisualizationParams({}, baseOptions, 0, 5)).toThrow(
      'No max plot time found'
    );
  });

  test('handles undefined forecaster categoryField', () => {
    const result = buildVisualizationParams(undefined, baseOptions, 5000, 5);
    expect(result.split_by).toBe('');
  });

  test('maps all operator values', () => {
    const operators = ['>', '<', '>=', '<=', '=='];
    const expected = [
      'GREATER_THAN',
      'LESS_THAN',
      'GREATER_THAN_OR_EQUAL_TO',
      'LESS_THAN_OR_EQUAL_TO',
      'EQUAL_TO',
    ];
    operators.forEach((op, i) => {
      const options = {
        ...baseOptions,
        sortByOption: 'threshold_dist',
        thresholdValue: 50,
        operatorValue: op,
      };
      const result = buildVisualizationParams({}, options, 5000, 5);
      expect(result.relation_to_threshold).toBe(expected[i]);
    });
  });
});
