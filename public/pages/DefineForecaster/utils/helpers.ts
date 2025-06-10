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
  FILTER_TYPES,
  UNITS,
  UIFilter,
  Forecaster,
  FEATURE_TYPE,
  UiFeature,
  FeatureAttributes,
} from '../../../models/interfaces';
import { get, cloneDeep, isEmpty, snakeCase, forOwn, } from 'lodash';
import { FeaturesFormikValues, ForecasterDefinitionFormikValues } from '../models/interfaces';
import { INITIAL_FORECASTER_DEFINITION_VALUES } from '../utils/constants';
import { DATA_TYPES, DEFAULT_SHINGLE_SIZE } from '../../../utils/constants';
import { v4 as uuidv4 } from 'uuid'
import { CreateForecasterFormikValues } from '../../CreateForecasterSteps/models/interfaces';
import { DataTypes } from '../../../redux/reducers/opensearch';


export function forecasterDefinitionToFormik(
  forecaster: Forecaster
): ForecasterDefinitionFormikValues {
  const initialValues = cloneDeep(INITIAL_FORECASTER_DEFINITION_VALUES);
  if (isEmpty(forecaster)) return initialValues;

  return {
    ...initialValues,
    name: forecaster.name,
    description: forecaster.description,
    index: [...forecaster.indices.map(index => ({ label: index }))],
    filters: filtersToFormik(forecaster),
    filterQuery: JSON.stringify(
      get(forecaster, 'filterQuery', { match_all: {} }),
      null,
      4
    ),
    timeField: forecaster.timeField,
    featureList: featuresToFormik(forecaster),
    categoryFieldEnabled: !isEmpty(get(forecaster, 'categoryField', [])),
    categoryField: get(forecaster, 'categoryField', []),
  };
}

export function featuresToFormik(forecaster: Forecaster): FeaturesFormikValues[] {
  const featureUiMetaData = get(forecaster, 'uiMetadata.features', []);
  const features = get(forecaster, 'featureAttributes', []);
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

export function filtersToFormik(forecaster: Forecaster): UIFilter[] {
  // Detectors created or updated using the API will not have metadata - create a custom filter in this case.
  const noMetadata =
    get(forecaster, 'uiMetadata.filterType') === undefined &&
    get(forecaster, 'uiMetadata.filters') === undefined;

  if (noMetadata) {
    return [
      {
        filterType: FILTER_TYPES.CUSTOM,
        query: JSON.stringify(
          get(forecaster, 'filterQuery', { match_all: {} }),
          null,
          4
        ),
      },
    ];
  }

  const curFilterType = get(forecaster, 'uiMetadata.filterType');
  const curFilters = get(forecaster, 'uiMetadata.filters', []);

  
  curFilters.forEach(
    (filter: UIFilter) => (filter.filterType = curFilterType)
  );

  return curFilters;
}

export function formikToForecasterDefinition(
  values: ForecasterDefinitionFormikValues,
  forecaster: Forecaster
): Forecaster {
  let forecasterBody = {
    ...forecaster,
    name: values.name,
    description: values.description,
    indices: formikToIndices(values.index),
    filterQuery: formikToFilterQuery(values),
    timeField: values.timeField,
    uiMetadata: {
      ...forecaster.uiMetadata,
      features: { ...featuresToUIMetadata(values.featureList) },
      filters: get(values, 'filters', []),
    },
    featureAttributes: formikToFeatureAttributes(values.featureList),
    categoryField: !isEmpty(values?.categoryField)
      ? values.categoryField
      : undefined,
  } as Forecaster;

  return forecasterBody;
}

export function formikToForecasterForSuggestion(values: ForecasterDefinitionFormikValues, 
  interval: number | undefined,
  shingleSize: number | undefined
): Forecaster {
  let forecasterBody = {
    name: values.name,
    description: values.description,
    indices: formikToIndices(values.index),
    filterQuery: formikToFilterQuery(values),
    timeField: values.timeField,
    categoryField: !isEmpty(values?.categoryField)
      ? values.categoryField
      : undefined,
    ...(interval !== undefined && {
      forecastInterval: {
        period: { interval: interval, unit: UNITS.MINUTES },
      },
    }),
    ...(shingleSize !== undefined && { shingleSize }),
  } as Forecaster;

  return forecasterBody;
}

export const formikToFilterQuery = (
  values: CreateForecasterFormikValues | ForecasterDefinitionFormikValues
) => {
  let filterQuery = {};
  const filters = get(values, 'filters', []);

  // If we have filters: need to combine into a single filter query.
  // Need to handle each filter type differently when converting
  if (filters.length > 0) {
    let filterArr = [] as any[];
    filters.forEach((filter) => {
      if (filter.filterType === FILTER_TYPES.SIMPLE) {
        filterArr.push(
          //@ts-ignore
          OPERATORS_QUERY_MAP[filter.operator]?.query(filter)
        );
      } else {
        filterArr.push(
          //@ts-ignore
          JSON.parse(filter.query)
        );
      }
    });
    filterQuery = {
      bool: {
        filter: [...filterArr],
      },
    };
  } else {
    filterQuery = { match_all: {} };
  }
  return filterQuery;
};

export function clearModelConfiguration(forecaster: Forecaster): Forecaster {
  return {
    ...forecaster,
    featureAttributes: [],
    uiMetadata: {
      ...forecaster.uiMetadata,
      features: {},
    },
    categoryField: undefined,
    shingleSize: DEFAULT_SHINGLE_SIZE,
  };
}

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

export const generateInitialFeatures = (
  forecaster: Forecaster
): FeaturesFormikValues[] => {
  const featureUiMetaData = get(forecaster, 'uiMetadata.features', []);
  const features = get(forecaster, 'featureAttributes', []);
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

export const formikToIndices = (indices: { label: string }[]) =>
  indices.map((index) => index.label);

export function featuresToUIMetadata(values: FeaturesFormikValues[]) {
  // TODO:: Delete Stale metadata if name is changed
  let features: {
    [key: string]: UiFeature;
  } = {};
  values.forEach((value) => {
    if (value.featureType === FEATURE_TYPE.SIMPLE) {
      features[value.featureName] = {
        featureType: value.featureType,
        aggregationBy: value.aggregationBy,
        aggregationOf:
          value.aggregationOf && value.aggregationOf.length
            ? value.aggregationOf[0].label
            : undefined,
      };
    } else {
      features[value.featureName] = {
        featureType: value.featureType,
      };
    }
  });
  return features;
}

export function formikToFeatureAttributes(
  values: FeaturesFormikValues[],
  forPreview: boolean = false
): FeatureAttributes[] {
  //@ts-ignore
  return values.map(function (value) {
    const id = forPreview
      ? value.featureId
      : value.newFeature
      ? undefined
      : value.featureId;
    return {
      featureId: id,
      featureName: value.featureName,
      featureEnabled: value.featureEnabled,
      importance: 1,
      aggregationQuery: formikToAggregation(value),
    };
  });
}

export function formikToAggregation(values: FeaturesFormikValues) {
  if (values.featureType === FEATURE_TYPE.SIMPLE) {
    return values.aggregationBy &&
      values.aggregationOf &&
      values.aggregationOf.length > 0
      ? {
          [snakeCase(values.featureName)]: {
            [values.aggregationBy]: { field: values.aggregationOf[0].label },
          },
        }
      : {};
  }
  return JSON.parse(values.aggregationQuery);
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
        focusOnFeaturePanel(i);
      }
    }
    return true;
  }
  return false;
};

export const focusOnFeaturePanel = (index: number) => {
  const featurePanel = document.getElementById(`feature-panel-${index}`);
  if (featurePanel) {
    featurePanel.setAttribute('tabindex', '-1');
    featurePanel.focus();
  }
};

export const getCategoryFields = (dataTypes: DataTypes) => {
  const keywordFields = get(dataTypes, 'keyword', []);
  const ipFields = get(dataTypes, 'ip', []);
  return keywordFields.concat(ipFields);
};

export interface ClusterOption {
  label: string;
  cluster: string;
  localcluster: string;
}
