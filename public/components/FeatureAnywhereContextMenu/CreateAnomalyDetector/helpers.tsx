import { dispatch } from 'd3';
import { matchDetector } from 'public/redux/reducers/ad';
import { validateDetectorName } from 'public/utils/utils';
import { FEATURE_TYPE } from '../../../../public/models/interfaces';
import { FeaturesFormikValues } from '../../../../public/pages/ConfigureModel/models/interfaces';
import { find, get, isEmpty, snakeCase } from 'lodash';

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
      aggregationBy: 'sum',
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
  return [
    {
      label: value.params.field.name,
      type: 'number',
    },
  ];
}

function visAggregationQueryToFormik(value, seriesParams) {
  return {
    [snakeCase(getFeatureNameFromVisParams(value.id, seriesParams))]: {
      sum: { field: value.params.field.name },
    },
  };
}
