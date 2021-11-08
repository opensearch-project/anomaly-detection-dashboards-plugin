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


import { mapKeysDeep, toSnake } from '../helpers';

describe('server helpers', () => {
  describe('mapKeysDeep', () => {
    test('should convert keys to snake_case', () => {
      const snake = mapKeysDeep({ helloWorld: 'value' }, toSnake);
      expect(snake).toEqual({ hello_world: 'value' });
    });
    test('should not convert keys to snake_case for filterQuery', () => {
      const snake = mapKeysDeep(
        {
          helloWorld: 'value',
          filterQuery: {
            aggs: { sumAggregation: { sum: { field: 'totalSales' } } },
          },
        },
        toSnake
      );
      expect(snake).toEqual({
        hello_world: 'value',
        filter_query: {
          aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
        },
      });
    });

    test('should not convert keys to snake_case for uiMetadata', () => {
      const snake = mapKeysDeep(
        {
          helloWorld: 'value',
          filterQuery: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
          uiMetadata: { newFeatures: [{ featureName: 'Name' }] },
        },
        toSnake
      );
      expect(snake).toEqual({
        hello_world: 'value',
        filter_query: {
          aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
        },
        ui_metadata: { new_features: [{ feature_name: 'Name' }] },
      });
    });
  });
});
