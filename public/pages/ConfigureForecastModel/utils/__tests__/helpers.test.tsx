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
  Forecaster,
  UNITS,
} from '../../../../models/interfaces';
import { ImputationMethod, ImputationOption } from '../../../../models/types';
import {
  ModelConfigurationFormikValues
} from '../../models/interfaces';
import {
  clearModelConfiguration,
  createImputationFormikValues,
  focusOnCategoryField,
  focusOnImputationOption,
  formikToImputationMethod,
  formikToImputationOption,
  formikToModelConfiguration,
  getCustomValueStrArray,
  getShingleSizeFromObject,
  imputationMethodToFormik,
  modelConfigurationToFormik,
} from '../helpers';
import { SparseDataOptionValue } from '../constants';
import { DEFAULT_SHINGLE_SIZE } from '../../../../utils/constants';

// Helper to generate a forecaster object for tests
const getRandomForecaster = (
  imputation?: ImputationMethod,
  hasDefaultFill: boolean = true
): Forecaster => {
  let imputationOption: ImputationOption | undefined;
  if (imputation) {
    imputationOption = { method: imputation };
    if (imputation === ImputationMethod.FIXED_VALUES && hasDefaultFill) {
      imputationOption.defaultFill = [
        { featureName: 'test-feature', data: 42 },
      ];
    }
  }

  return {
    id: 'test-forecaster-id',
    name: 'test-forecaster',
    description: 'Test forecaster description',
    indices: ['test-index'],
    uiMetadata: { features: { 'test-id': { featureType: 'simple_aggs', aggregationBy: 'sum', aggregationOf: 'value' }} },
    featureAttributes: [{ featureId: 'test-id', featureName: 'test-feature', featureEnabled: true, importance: 1, aggregationQuery: {} }],
    forecastInterval: { period: { interval: 10, unit: UNITS.MINUTES } },
    windowDelay: { period: { interval: 5, unit: UNITS.MINUTES } },
    shingleSize: 8,
    imputationOption: imputationOption,
  };
};

describe('ConfigureForecastModel helpers', () => {
  describe('focusOnCategoryField and focusOnImputationOption', () => {
    const mockElement = { focus: jest.fn() };
    const originalGetElementById = document.getElementById;

    beforeEach(() => {
      document.getElementById = jest.fn().mockReturnValue(mockElement);
      mockElement.focus.mockClear();
    });

    afterAll(() => {
      document.getElementById = originalGetElementById;
    });

    test('focusOnCategoryField should focus on the correct element', () => {
      focusOnCategoryField();
      expect(document.getElementById).toHaveBeenCalledWith(
        'categoryFieldCheckbox'
      );
      expect(mockElement.focus).toHaveBeenCalledTimes(1);
    });

    test('focusOnImputationOption should focus on the correct element', () => {
      focusOnImputationOption();
      expect(document.getElementById).toHaveBeenCalledWith('imputationOption');
      expect(mockElement.focus).toHaveBeenCalledTimes(1);
    });
  });

  describe('getShingleSizeFromObject', () => {
    test('should return shingle size if it exists', () => {
      expect(getShingleSizeFromObject({ shingleSize: 10 })).toBe(10);
    });
    test('should return default shingle size if it does not exist', () => {
      expect(getShingleSizeFromObject({ otherProp: 'value' })).toBe(
        DEFAULT_SHINGLE_SIZE
      );
    });
    test('should return default shingle size for empty object', () => {
      expect(getShingleSizeFromObject({})).toBe(DEFAULT_SHINGLE_SIZE);
    });
  });

  describe('clearModelConfiguration', () => {
    test('should clear relevant fields from the forecaster', () => {
      const forecaster = getRandomForecaster();
      forecaster.categoryField = ['some-field'];
      const cleared = clearModelConfiguration(forecaster);
      expect(cleared.featureAttributes).toEqual([]);
      expect(cleared.uiMetadata.features).toEqual({});
      expect(cleared.categoryField).toBeUndefined();
      expect(cleared.shingleSize).toBe(DEFAULT_SHINGLE_SIZE);
    });
  });
  
  describe('imputationMethodToFormik and createImputationFormikValues', () => {
    test('should handle FIXED_VALUES with default fill', () => {
      const forecaster = getRandomForecaster(ImputationMethod.FIXED_VALUES);
      const formikValues = createImputationFormikValues(forecaster);
      expect(formikValues.imputationMethod).toBe(SparseDataOptionValue.CUSTOM_VALUE);
      expect(formikValues.custom_value).toEqual([{ featureName: 'test-feature', data: 42 }]);
    });
    test('should handle PREVIOUS_VALUE', () => {
      const forecaster = getRandomForecaster(ImputationMethod.PREVIOUS);
      const formikValues = createImputationFormikValues(forecaster);
      expect(formikValues.imputationMethod).toBe(SparseDataOptionValue.PREVIOUS_VALUE);
      expect(formikValues.custom_value).toBeUndefined();
    });
    test('should handle ZERO', () => {
      const forecaster = getRandomForecaster(ImputationMethod.ZERO);
      const formikValues = createImputationFormikValues(forecaster);
      expect(formikValues.imputationMethod).toBe(SparseDataOptionValue.SET_TO_ZERO);
      expect(formikValues.custom_value).toBeUndefined();
    });
    test('should handle undefined imputation method', () => {
      const forecaster = getRandomForecaster(undefined);
      const formikValues = createImputationFormikValues(forecaster);
      expect(formikValues.imputationMethod).toBe(SparseDataOptionValue.IGNORE);
      expect(formikValues.custom_value).toBeUndefined();
    });
  });

  describe('modelConfigurationToFormik', () => {
    test('should correctly convert a full forecaster to formik values', () => {
      const forecaster = getRandomForecaster(ImputationMethod.FIXED_VALUES);
      const formikValues = modelConfigurationToFormik(forecaster);
      expect(formikValues.shingleSize).toBe(8);
      expect(formikValues.interval).toBe(10);
      expect(formikValues.windowDelay).toBe(5);
      expect(formikValues.imputationOption?.imputationMethod).toBe(SparseDataOptionValue.CUSTOM_VALUE);
    });
    test('should handle empty forecaster object', () => {
      const formikValues = modelConfigurationToFormik({} as Forecaster);
      expect(formikValues.shingleSize).toBe(DEFAULT_SHINGLE_SIZE);
      expect(formikValues.interval).toBe(undefined);
    });
  });
  
  describe('formikToImputationMethod and formikToImputationOption', () => {
    test('should correctly convert formik values to ImputationOption for CUSTOM_VALUE', () => {
      const formikValues = { imputationMethod: SparseDataOptionValue.CUSTOM_VALUE, custom_value: [{ featureName: 'test-feature', data: 123 }]};
      const option = formikToImputationOption('test-feature', formikValues);
      expect(option?.method).toBe(ImputationMethod.FIXED_VALUES);
      expect(option?.defaultFill).toEqual([{ featureName: 'test-feature', data: 123 }]);
    });
    test('should handle PREVIOUS_VALUE', () => {
      const formikValues = { imputationMethod: SparseDataOptionValue.PREVIOUS_VALUE };
      const option = formikToImputationOption('test-feature', formikValues);
      expect(option?.method).toBe(ImputationMethod.PREVIOUS);
      expect(option?.defaultFill).toBeUndefined();
    });
    test('should return undefined if featureName is missing', () => {
      const formikValues = { imputationMethod: SparseDataOptionValue.CUSTOM_VALUE };
      const option = formikToImputationOption(undefined, formikValues);
      expect(option).toBeUndefined();
    });
    test('should return undefined for IGNORE', () => {
      const formikValues = { imputationMethod: SparseDataOptionValue.IGNORE };
      const option = formikToImputationOption('test-feature', formikValues);
      expect(option).toBeUndefined();
    });
  });

  describe('formikToModelConfiguration', () => {
    test('should correctly convert formik values to a forecaster model', () => {
      const formikValues: ModelConfigurationFormikValues = {
        name: 'test',
        description: '',
        shingleSize: 4,
        interval: 15,
        windowDelay: 2,
        imputationOption: { imputationMethod: SparseDataOptionValue.SET_TO_ZERO },
      };
      const forecaster = formikToModelConfiguration(formikValues, getRandomForecaster());
      expect(forecaster.shingleSize).toBe(4);
      expect(forecaster.forecastInterval.period.interval).toBe(15);
      expect(forecaster.windowDelay.period.interval).toBe(2);
      expect(forecaster.imputationOption?.method).toBe(ImputationMethod.ZERO);
    });
  });

  describe('getCustomValueStrArray', () => {
    test('should return formatted string array for custom values', () => {
      const forecaster = getRandomForecaster(ImputationMethod.FIXED_VALUES);
      const result = getCustomValueStrArray(SparseDataOptionValue.CUSTOM_VALUE, forecaster);
      expect(result).toEqual(['test-feature: 42']);
    });
    test('should return empty array for non-custom methods', () => {
      const forecaster = getRandomForecaster(ImputationMethod.ZERO);
      const result = getCustomValueStrArray(SparseDataOptionValue.SET_TO_ZERO, forecaster);
      expect(result).toEqual([]);
    });
  });
});
