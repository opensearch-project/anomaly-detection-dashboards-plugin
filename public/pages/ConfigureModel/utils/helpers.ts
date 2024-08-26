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
  FEATURE_TYPE,
  FeatureAttributes,
  Detector,
} from '../../../models/interfaces';
import { v4 as uuidv4 } from 'uuid';
import { get, forOwn, cloneDeep, isEmpty } from 'lodash';
import { DataTypes } from '../../../redux/reducers/opensearch';
import {
  ModelConfigurationFormikValues,
  FeaturesFormikValues,
  CustomValueFormikValues,
  ImputationFormikValues,
} from '../../ConfigureModel/models/interfaces';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../ConfigureModel/utils/constants';
import {
  featuresToUIMetadata,
  formikToFeatureAttributes,
} from '../../ReviewAndCreate/utils/helpers';
import {
  ImputationMethod,
  ImputationOption,
} from '../../../models/types';
import {
  SparseDataOptionValue
} from './constants'

export const getFieldOptions = (
  allFields: { [key: string]: string[] },
  validTypes: DATA_TYPES[]
) =>
  validTypes
    .map((dataType) =>
      allFields[dataType]
        ? {
            label: dataType,
            options: allFields[dataType].map((field) => ({
              label: field,
              type: dataType,
            })),
          }
        : []
    )
    .filter(Boolean);

export const getNumberFieldOptions = (allFields: { [key: string]: string[] }) =>
  getFieldOptions(allFields, [DATA_TYPES.NUMBER]);

export const getCountableFieldOptions = (allFields: {
  [key: string]: string[];
}) => {
  const countableDataTypes = [
    DATA_TYPES.NUMBER,
    DATA_TYPES.BOOLEAN,
    DATA_TYPES.KEYWORD,
    DATA_TYPES.DATE,
  ];
  return getFieldOptions(
    allFields,
    Object.keys(allFields)
      .map((field) => field as DATA_TYPES)
      .filter((field) => countableDataTypes.includes(field))
  );
};

export const initialFeatureValue = () => ({
  featureId: uuidv4(),
  featureName: undefined,
  featureType: FEATURE_TYPE.SIMPLE,
  featureEnabled: true,
  importance: 1,
  aggregationBy: 'sum',
  aggregationQuery: JSON.stringify(
    {
      aggregation_name: { sum: { field: 'field_name' } },
    },
    null,
    4
  ),
  newFeature: true,
});

export const validateFeatures = (values: any) => {
  const featureList = get(values, 'featureList', []);
  let featureNameCount = new Map<string, number>();

  featureList.forEach((attribute: FeatureAttributes) => {
    if (attribute.featureName) {
      const featureName = attribute.featureName.toLowerCase();
      if (featureNameCount.has(featureName)) {
        featureNameCount.set(
          featureName,
          // @ts-ignore
          featureNameCount.get(featureName) + 1
        );
      } else {
        featureNameCount.set(featureName, 1);
      }
    }
  });

  let hasError = false;
  const featureErrors = featureList.map((attribute: FeatureAttributes) => {
    if (attribute.featureName) {
      // @ts-ignore
      if (featureNameCount.get(attribute.featureName.toLowerCase()) > 1) {
        hasError = true;
        return { featureName: 'Duplicate feature name' };
      } else {
        return undefined;
      }
    } else {
      hasError = true;
      // @ts-ignore
      return {
        featureName: 'You must enter a feature name',
      };
    }
  });

  return hasError ? { featureList: featureErrors } : undefined;
};

export const generateInitialFeatures = (
  detector: Detector
): FeaturesFormikValues[] => {
  const featureUiMetaData = get(detector, 'uiMetadata.features', []);
  const features = get(detector, 'featureAttributes', []);
  // @ts-ignore
  return features.map((feature: FeatureAttributes) => {
    return {
      ...featureUiMetaData[feature.featureName],
      ...feature,
      aggregationQuery: JSON.stringify(feature['aggregationQuery'], null, 4),
      aggregationOf: get(
        featureUiMetaData,
        `${feature.featureName}.aggregationOf`
      )
        ? [
            {
              label: get(
                featureUiMetaData,
                `${feature.featureName}.aggregationOf`
              ),
            },
          ]
        : [],
      featureType: get(featureUiMetaData, `${feature.featureName}.featureType`)
        ? get(featureUiMetaData, `${feature.featureName}.featureType`)
        : FEATURE_TYPE.CUSTOM,
    };
  });
};

export const focusOnFirstWrongFeature = (errors: any, setFieldTouched: any) => {
  if (
    //@ts-ignore
    !!get(errors, 'featureList', []).filter((featureError) => featureError)
      .length
  ) {
    const featureList = get(errors, 'featureList', []);
    for (let i = featureList.length - 1; i >= 0; i--) {
      if (featureList[i]) {
        forOwn(featureList[i], function (value, key) {
          setFieldTouched(`featureList.${i}.${key}`, true);
        });
        focusOnFeatureAccordion(i);
      }
    }
    return true;
  }
  return false;
};

export const focusOnFeatureAccordion = (index: number) => {
  const featureAccordion = document.getElementById(
    `featureAccordionHeaders.${index}`
  );
  //@ts-ignore
  featureAccordion.setAttribute('tabindex', '-1');
  //@ts-ignore
  featureAccordion.focus();
  const header =
    //@ts-ignore
    featureAccordion.parentElement.parentElement.parentElement.parentElement;
  //@ts-ignore
  if (!header.className.includes('euiAccordion-isOpen')) {
    //@ts-ignore
    featureAccordion.click();
  }
};

export const focusOnCategoryField = () => {
  const component = document.getElementById('categoryFieldCheckbox');
  component?.focus();
};

export const getCategoryFields = (dataTypes: DataTypes) => {
  const keywordFields = get(dataTypes, 'keyword', []);
  const ipFields = get(dataTypes, 'ip', []);
  return keywordFields.concat(ipFields);
};

export const focusOnImputationOption = () => {
  const component = document.getElementById('imputationOption');
  component?.focus();
};

export const getShingleSizeFromObject = (obj: object) => {
  return get(obj, 'shingleSize', DEFAULT_SHINGLE_SIZE);
};

export function clearModelConfiguration(ad: Detector): Detector {
  return {
    ...ad,
    featureAttributes: [],
    uiMetadata: {
      ...ad.uiMetadata,
      features: {},
    },
    categoryField: undefined,
    shingleSize: DEFAULT_SHINGLE_SIZE,
  };
}

export function modelConfigurationToFormik(
  detector: Detector
): ModelConfigurationFormikValues {
  const initialValues = cloneDeep(INITIAL_MODEL_CONFIGURATION_VALUES);
  if (isEmpty(detector)) {
    return initialValues;
  }

  var imputationMethod = imputationMethodToFormik(detector);

  var defaultFillArray: CustomValueFormikValues[] = [];

  if (SparseDataOptionValue.CUSTOM_VALUE === imputationMethod) {
    const defaultFill = get(detector, 'imputationOption.defaultFill', null) as Array<{ featureName: string; data: number }> | null;
    defaultFillArray = defaultFill
    ? defaultFill.map(({ featureName, data }) => ({
        featureName,
        data,
      }))
    : [];
  }

  const imputationFormikValues: ImputationFormikValues = {
    imputationMethod: imputationMethod,
    custom_value: SparseDataOptionValue.CUSTOM_VALUE === imputationMethod ? defaultFillArray : undefined,
  };

  return {
    ...initialValues,
    featureList: featuresToFormik(detector),
    categoryFieldEnabled: !isEmpty(get(detector, 'categoryField', [])),
    categoryField: get(detector, 'categoryField', []),
    shingleSize: get(detector, 'shingleSize', DEFAULT_SHINGLE_SIZE),
    imputationOption: imputationFormikValues,
  };
}

function featuresToFormik(detector: Detector): FeaturesFormikValues[] {
  const featureUiMetaData = get(detector, 'uiMetadata.features', []);
  const features = get(detector, 'featureAttributes', []);
  // @ts-ignore
  return features.map((feature: FeatureAttributes) => {
    return {
      ...featureUiMetaData[feature.featureName],
      ...feature,
      aggregationQuery: JSON.stringify(feature['aggregationQuery'], null, 4),
      aggregationOf: get(
        featureUiMetaData,
        `${feature.featureName}.aggregationOf`
      )
        ? [
            {
              label: get(
                featureUiMetaData,
                `${feature.featureName}.aggregationOf`
              ),
            },
          ]
        : [],
      featureType: get(featureUiMetaData, `${feature.featureName}.featureType`)
        ? get(featureUiMetaData, `${feature.featureName}.featureType`)
        : FEATURE_TYPE.CUSTOM,
    };
  });
}

export function formikToModelConfiguration(
  values: ModelConfigurationFormikValues,
  detector: Detector
): Detector {
  let detectorBody = {
    ...detector,
    uiMetadata: {
      ...detector.uiMetadata,
      features: { ...featuresToUIMetadata(values.featureList) },
    },
    featureAttributes: formikToFeatureAttributes(values.featureList),
    shingleSize: values.shingleSize,
    categoryField: !isEmpty(values?.categoryField)
      ? values.categoryField
      : undefined,
    imputationOption: formikToImputationOption(values.imputationOption),
  } as Detector;

  return detectorBody;
}

export function prepareDetector(
  featureValues: FeaturesFormikValues[],
  shingleSizeValue: number,
  categoryFields: string[],
  ad: Detector,
  forPreview: boolean = false
): Detector {
  const detector = cloneDeep(ad);
  const featureAttributes = formikToFeatures(featureValues, forPreview);

  return {
    ...detector,
    featureAttributes: [...featureAttributes],
    shingleSize: shingleSizeValue,
    categoryField: isEmpty(categoryFields) ? undefined : categoryFields,
    uiMetadata: {
      ...detector.uiMetadata,
      features: { ...featuresToUIMetadata(featureValues) },
    },
  };
}

function formikToFeatures(values: FeaturesFormikValues[], forPreview: boolean) {
  const featureAttribute = formikToFeatureAttributes(values, forPreview);
  return featureAttribute;
}

export function formikToSimpleAggregation(value: FeaturesFormikValues) {
  if (
    value.aggregationBy &&
    value.aggregationOf &&
    value.aggregationOf.length > 0
  ) {
    return {
      [value.featureName]: {
        [value.aggregationBy]: { field: value.aggregationOf[0].label },
      },
    };
  } else {
    return {};
  }
}

export function formikToImputationOption(imputationFormikValues?: ImputationFormikValues): ImputationOption | undefined {
  // Map the formik method to the imputation method; return undefined if method is not recognized.
  const method = formikToImputationMethod(imputationFormikValues?.imputationMethod);
  if (!method) return undefined;

  // Convert custom_value array to defaultFill if the method is FIXED_VALUES.
  const defaultFill = method === ImputationMethod.FIXED_VALUES
    ? imputationFormikValues?.custom_value?.map(({ featureName, data }) => ({
        featureName,
        data,
      }))
    : undefined;

  // Construct and return the ImputationOption object.
  return { method, defaultFill };
}

export function imputationMethodToFormik(
  detector: Detector
): string {
  var imputationMethod = get(detector, 'imputationOption.method', undefined) as ImputationMethod;

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

export const getCustomValueStrArray = (imputationMethodStr : string, detector: Detector): string[] => {
  if (SparseDataOptionValue.CUSTOM_VALUE === imputationMethodStr) {
    const defaultFill : Array<{ featureName: string; data: number }> = get(detector, 'imputationOption.defaultFill', []);

    return defaultFill
      .map(({ featureName, data }) => `${featureName}: ${data}`);
  }
  return []
}
