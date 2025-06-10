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

import { DATA_TYPES, DEFAULT_SHINGLE_SIZE } from '../../../utils/constants';
import {
  Forecaster,
  UNITS,
} from '../../../models/interfaces';
import { get, cloneDeep, isEmpty } from 'lodash';
import {
  ModelConfigurationFormikValues,
  CustomValueFormikValues,
  ImputationFormikValues,
} from '../../ConfigureForecastModel/models/interfaces';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../ConfigureForecastModel/utils/constants';
import {
  ImputationMethod,
  ImputationOption,
} from '../../../models/types';
import {
  SparseDataOptionValue
} from './constants'

export const focusOnCategoryField = () => {
  const component = document.getElementById('categoryFieldCheckbox');
  component?.focus();
};

export const focusOnImputationOption = () => {
  const component = document.getElementById('imputationOption');
  component?.focus();
};

export const getShingleSizeFromObject = (obj: object) => {
  return get(obj, 'shingleSize', DEFAULT_SHINGLE_SIZE);
};

export function clearModelConfiguration(forecast: Forecaster): Forecaster {
  return {
    ...forecast,
    featureAttributes: [],
    uiMetadata: {
      ...forecast.uiMetadata,
      features: {},
    },
    categoryField: undefined,
    shingleSize: DEFAULT_SHINGLE_SIZE,
  };
}

export function createImputationFormikValues(
  forecaster: Forecaster
): ImputationFormikValues {
  const imputationMethod = imputationMethodToFormik(forecaster);
  let defaultFillArray: CustomValueFormikValues[] = [];

  if (SparseDataOptionValue.CUSTOM_VALUE === imputationMethod) {
    const defaultFill = get(forecaster, 'imputationOption.defaultFill', null) as Array<{ featureName: string; data: number }> | null;
    defaultFillArray = defaultFill
      ? defaultFill.map(({ featureName, data }) => ({
          featureName,
          data,
        }))
      : [];
  }

  return {
    imputationMethod: imputationMethod,
    custom_value: SparseDataOptionValue.CUSTOM_VALUE === imputationMethod ? defaultFillArray : undefined,
  };
}

export function modelConfigurationToFormik(
  forecaster: Forecaster
): ModelConfigurationFormikValues {
  const initialValues = cloneDeep(INITIAL_MODEL_CONFIGURATION_VALUES);
  if (isEmpty(forecaster)) {
    return initialValues;
  }

  const imputationFormikValues = createImputationFormikValues(forecaster);

  return {
    ...initialValues,
    shingleSize: get(forecaster, 'shingleSize', DEFAULT_SHINGLE_SIZE),
    imputationOption: imputationFormikValues,
    interval: get(forecaster, 'forecastInterval.period.interval', 10),
    windowDelay: get(forecaster, 'windowDelay.period.interval', 0),
    suggestedSeasonality: get(forecaster, 'suggestedSeasonality', undefined),
    recencyEmphasis: get(forecaster, 'recencyEmphasis', undefined),
    resultIndexMinAge: get(forecaster, 'resultIndexMinAge', undefined),
    resultIndexMinSize:get(forecaster, 'resultIndexMinSize', undefined),
    resultIndexTtl: get(forecaster, 'resultIndexTtl', undefined),
    flattenCustomResultIndex: get(forecaster, 'flattenCustomResultIndex', false),
    resultIndex: forecaster.resultIndex,
    horizon: get(forecaster, 'horizon', undefined),
    history: get(forecaster, 'history', undefined),
  };
}

export function formikToModelConfiguration(
  values: ModelConfigurationFormikValues,
  forecaster: Forecaster
): Forecaster {
  let forecasterBody = {
    ...forecaster,
    shingleSize: values.shingleSize,
    imputationOption: formikToImputationOption(
      forecaster.featureAttributes?.[0]?.featureName,
      values.imputationOption,
    ),
    forecastInterval: {
      period: { interval: values.interval, unit: UNITS.MINUTES },
    },
    windowDelay: {
      period: { interval: values.windowDelay, unit: UNITS.MINUTES },
    },
    resultIndexMinAge: values.resultIndexMinAge,
    resultIndexMinSize: values.resultIndexMinSize,
    resultIndexTtl: values.resultIndexTtl,
    flattenCustomResultIndex: values.flattenCustomResultIndex,
    resultIndex: values.resultIndex,
    horizon: values.horizon,
    history: values.history,
  } as Forecaster;

  return forecasterBody;
}

export function formikToImputationOption(
  featureName: string | undefined,
  imputationFormikValues?: ImputationFormikValues,
): ImputationOption | undefined {
  // If no feature name is provided, return undefined
  if (!featureName) return undefined;

  // Map the formik method to the imputation method; return undefined if method is not recognized.
  const method = formikToImputationMethod(imputationFormikValues?.imputationMethod);
  if (!method) return undefined;

  // Convert custom_value array to defaultFill if the method is FIXED_VALUES.
  const defaultFill = method === ImputationMethod.FIXED_VALUES
    ? imputationFormikValues?.custom_value?.map(({ data }) => ({
        featureName: featureName,
        data,
      }))
    : undefined;

  // Construct and return the ImputationOption object.
  return { method, defaultFill };
}

export function imputationMethodToFormik(
  forecaster: Forecaster
): string {
  var imputationMethod = get(forecaster, 'imputationOption.method', undefined) as ImputationMethod;

  switch (imputationMethod) {
    case ImputationMethod.FIXED_VALUES:
      return SparseDataOptionValue.CUSTOM_VALUE;
    case ImputationMethod.PREVIOUS:
      return SparseDataOptionValue.PREVIOUS_VALUE;
    case ImputationMethod.ZERO:
      return SparseDataOptionValue.SET_TO_ZERO;
    default:
      break;
  }

  return SparseDataOptionValue.IGNORE;
}

export function formikToImputationMethod(
  formikValue: string | undefined
): ImputationMethod | undefined {
  switch (formikValue) {
    case SparseDataOptionValue.CUSTOM_VALUE:
      return ImputationMethod.FIXED_VALUES;
    case SparseDataOptionValue.PREVIOUS_VALUE:
      return ImputationMethod.PREVIOUS;
    case SparseDataOptionValue.SET_TO_ZERO:
      return ImputationMethod.ZERO;
    default:
      return undefined;
  }
}

export const getCustomValueStrArray = (imputationMethodStr : string, forecaster: Forecaster): string[] => {
  if (SparseDataOptionValue.CUSTOM_VALUE === imputationMethodStr) {
    const defaultFill : Array<{ featureName: string; data: number }> = get(forecaster, 'imputationOption.defaultFill', []);

    return defaultFill
      .map(({ featureName, data }) => `${featureName}: ${data}`);
  }
  return []
}

export const toNumberOrEmpty = (value: string): number | '' => {
  return value === '' ? '' : Number(value);
};
