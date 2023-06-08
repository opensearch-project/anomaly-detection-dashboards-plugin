/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { FEATURE_TYPE } from '../../../../public/models/interfaces';
import { FeaturesFormikValues } from '../../../../public/pages/ConfigureModel/models/interfaces';
import { find, snakeCase } from 'lodash';
import { AGGREGATION_TYPES } from '../../../../public/pages/ConfigureModel/utils/constants';

export function visFeatureListToFormik(
  featureList,
  seriesParams
): FeaturesFormikValues[] {
  return featureList.map((feature) => {
    return {
      featureId: feature.id,
      featureName: getFeatureNameFromVisParams(feature.id, seriesParams),
      featureEnabled: true,
      featureType: FEATURE_TYPE.SIMPLE,
      importance: 1,
      newFeature: false,
      aggregationBy: visAggregationTypeToFormik(feature),
      aggregationOf: visAggregationToFormik(feature),
      aggregationQuery: JSON.stringify(
        visAggregationQueryToFormik(feature, seriesParams)
      ),
    };
  });
}

export function formikToDetectorName(title) {
  const detectorName =
    title + '_anomaly_detector_' + Math.floor(100000 + Math.random() * 900000);
  detectorName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return detectorName;
}

const getFeatureNameFromVisParams = (id, seriesParams) => {
  let name = find(seriesParams, function (param) {
    if (param.data.id === id) {
      return true;
    }
  });

  return name.data.label.replace(/[^a-zA-Z0-9-_]/g, '_');
};

function visAggregationToFormik(value) {
  if (Object.values(value.params).length !== 0) {
    return [
      {
        label: value.params?.field?.name,
        type: value.type,
      },
    ];
  }
  // for count type of vis, there's no field name in the embeddable-vis schema
  return [];
}

function visAggregationQueryToFormik(value, seriesParams) {
  if (Object.values(value.params).length !== 0) {
    return {
      [snakeCase(getFeatureNameFromVisParams(value.id, seriesParams))]: {
        [visAggregationTypeToFormik(value)]: {
          field: value.params?.field?.name,
        },
      },
    };
  }
  // for count type of vis, there's no field name in the embeddable-vis schema
  // return '' as the custom expression query
  return '';
}

function visAggregationTypeToFormik(feature) {
  const aggType = feature.__type.name;
  if (AGGREGATION_TYPES.some((type) => type.value === aggType)) {
    return aggType;
  }
  if (aggType === 'count') {
    return 'value_count';
  }
  return 'sum';
}
