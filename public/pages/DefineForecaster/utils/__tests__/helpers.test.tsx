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
  forecasterDefinitionToFormik,
  filtersToFormik,
  featuresToFormik,
} from '../helpers';
import {
  Forecaster,
  FILTER_TYPES,
  FEATURE_TYPE,
} from '../../../../models/interfaces';
import { INITIAL_FORECASTER_DEFINITION_VALUES } from '../constants';
import { DATA_TYPES } from '../../../../utils/constants';

const getRandomForecaster = (): Forecaster => ({
  name: 'test-forecaster',
  description: 'Test forecaster description',
  indices: ['test-index'],
  timeField: 'timestamp',
  forecastInterval: { period: { interval: 10, unit: 'Minutes' } },
  horizon: { period: { interval: 24, unit: 'Hours' } },
  filterQuery: { match_all: {} },
  featureAttributes: [
    {
      featureId: 'feature_1',
      featureName: 'test-feature',
      featureEnabled: true,
      importance: 1,
      aggregationQuery: { sum_value: { sum: { field: 'value' } } },
    },
  ],
  uiMetadata: {
    filterType: FILTER_TYPES.SIMPLE,
    filters: [
      {
        fieldInfo: [{ label: 'service', type: DATA_TYPES.KEYWORD }],
        operator: 'is',
        fieldValue: 'test_service',
        filterType: FILTER_TYPES.SIMPLE,
      },
    ],
    features: {
      'test-feature': {
        featureType: FEATURE_TYPE.SIMPLE,
        aggregationOf: 'value',
        aggregationBy: 'sum',
      },
    },
  },
  categoryField: ['category'],
  shingleSize: 8,
});

describe('DefineForecaster helpers', () => {
  describe('forecasterDefinitionToFormik', () => {
    test('should return initialValues if forecaster is empty', () => {
      const emptyForecaster = {} as Forecaster;
      const formikValues = forecasterDefinitionToFormik(emptyForecaster);
      expect(formikValues).toEqual(INITIAL_FORECASTER_DEFINITION_VALUES);
    });

    test('should return correct formik values for a given forecaster', () => {
      const randomForecaster = getRandomForecaster();
      const formikValues = forecasterDefinitionToFormik(randomForecaster);
      expect(formikValues).toEqual({
        name: randomForecaster.name,
        description: randomForecaster.description,
        index: [{ label: randomForecaster.indices[0] }],
        filters: filtersToFormik(randomForecaster),
        filterQuery: JSON.stringify(randomForecaster.filterQuery, null, 4),
        timeField: randomForecaster.timeField,
        featureList: featuresToFormik(randomForecaster),
        categoryFieldEnabled: true,
        categoryField: randomForecaster.categoryField,
      });
    });

    test('should handle forecaster with no UI metadata', () => {
      const randomForecaster = getRandomForecaster();
      //@ts-ignore
      randomForecaster.uiMetadata = undefined;
      const formikValues = forecasterDefinitionToFormik(randomForecaster);
      expect(formikValues.filters[0].filterType).toBe(FILTER_TYPES.CUSTOM);
    });
  });

  describe('filtersToFormik', () => {
    test('should add filterType to each filter', () => {
      const randomForecaster = getRandomForecaster();
      const formikFilters = filtersToFormik(randomForecaster);
      expect(formikFilters).toHaveLength(1);
      expect(formikFilters[0].filterType).toBe(FILTER_TYPES.SIMPLE);
    });

    test('should handle custom filters if no metadata', () => {
      const randomForecaster = getRandomForecaster();
      //@ts-ignore
      randomForecaster.uiMetadata = {};
      const formikFilters = filtersToFormik(randomForecaster);
      expect(formikFilters).toHaveLength(1);
      expect(formikFilters[0].filterType).toBe(FILTER_TYPES.CUSTOM);
      expect(formikFilters[0].query).toBeDefined();
    });
  });

  describe('featuresToFormik', () => {
    test('should convert feature attributes to formik values', () => {
      const randomForecaster = getRandomForecaster();
      const formikFeatures = featuresToFormik(randomForecaster);
      expect(formikFeatures).toHaveLength(1);
      const feature = formikFeatures[0];
      expect(feature.featureId).toBe('feature_1');
      expect(feature.featureName).toBe('test-feature');
      expect(feature.featureType).toBe(FEATURE_TYPE.SIMPLE);
      expect(feature.aggregationOf).toEqual([{ label: 'value' }]);
      expect(feature.aggregationBy).toBe('sum');
    });

    test('should handle features with no UI metadata', () => {
      const randomForecaster = getRandomForecaster();
      //@ts-ignore
      randomForecaster.uiMetadata.features = {};
      const formikFeatures = featuresToFormik(randomForecaster);
      expect(formikFeatures[0].featureType).toBe(FEATURE_TYPE.CUSTOM);
    });
  });
});
