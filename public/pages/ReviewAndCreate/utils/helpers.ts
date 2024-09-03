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
  FEATURE_TYPE,
  FILTER_TYPES,
  UNITS,
  FeatureAttributes,
  Detector,
  UiFeature,
} from '../../../models/interfaces';
import moment from 'moment';
import { get, isEmpty, snakeCase } from 'lodash';
import { DetectorDefinitionFormikValues } from '../../DefineDetector/models/interfaces';
import { FeaturesFormikValues } from '../../ConfigureModel/models/interfaces';
import { CreateDetectorFormikValues } from '../../CreateDetectorSteps/models/interfaces';
import { OPERATORS_QUERY_MAP } from '../../DefineDetector/utils/whereFilters';
import { convertTimestampToNumber } from '../../../utils/utils';
import { CUSTOM_AD_RESULT_INDEX_PREFIX } from '../../../../server/utils/constants';
import { formikToImputationOption, formikToRules } from '../../ConfigureModel/utils/helpers';

export function formikToDetector(values: CreateDetectorFormikValues): Detector {
  const detectionDateRange = values.historical
    ? {
        startTime: convertTimestampToNumber(values.startTime),
        endTime: convertTimestampToNumber(values.endTime),
      }
    : undefined;
  var resultIndex = values.resultIndex;
  if (resultIndex && resultIndex.trim().length > 0) {
    resultIndex = CUSTOM_AD_RESULT_INDEX_PREFIX + resultIndex;
  }
  let detectorBody = {
    name: values.name,
    description: values.description,
    indices: formikToIndices(values.index),
    resultIndex: resultIndex,
    filterQuery: formikToFilterQuery(values),
    uiMetadata: {
      features: { ...featuresToUIMetadata(values.featureList) },
      filters: get(values, 'filters', []),
    },
    featureAttributes: formikToFeatureAttributes(values.featureList),
    timeField: values.timeField,
    detectionInterval: {
      period: { interval: values.interval, unit: UNITS.MINUTES },
    },
    windowDelay: {
      period: { interval: values.windowDelay, unit: UNITS.MINUTES },
    },
    shingleSize: values.shingleSize,
    categoryField: !isEmpty(values?.categoryField)
      ? values.categoryField
      : undefined,
    resultIndexMinAge:
      resultIndex && resultIndex.trim().length > 0
        ? values.resultIndexMinAge
        : undefined,
    resultIndexMinSize:
      resultIndex && resultIndex.trim().length > 0
        ? values.resultIndexMinSize
        : undefined,
    resultIndexTtl:
      resultIndex && resultIndex.trim().length > 0
        ? values.resultIndexTtl
        : undefined,
    flattenCustomResultIndex:
      resultIndex && resultIndex.trim().length > 0
        ? values.flattenCustomResultIndex
        : undefined,
    imputationOption: formikToImputationOption(values.imputationOption),
    rules: formikToRules(values.suppressionRules),
  } as Detector;

  // Optionally add detection date range
  if (detectionDateRange) {
    detectorBody = {
      ...detectorBody,
      //@ts-ignore
      detectionDateRange: detectionDateRange,
    };
  }

  return detectorBody;
}

export const formikToIndices = (indices: { label: string }[]) =>
  indices.map((index) => index.label);

export const formikToFilterQuery = (
  values: CreateDetectorFormikValues | DetectorDefinitionFormikValues
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

export function toStringConfigCell(obj: any): string {
  if (typeof obj != 'undefined') {
    if (obj.hasOwnProperty('period')) {
      let period = obj.period;
      return period.interval + ' ' + period.unit;
    } else if (typeof obj == 'number') {
      // epoch
      return moment(obj).format('MM/DD/YY hh:mm A');
    }
  }
  return '-';
}
