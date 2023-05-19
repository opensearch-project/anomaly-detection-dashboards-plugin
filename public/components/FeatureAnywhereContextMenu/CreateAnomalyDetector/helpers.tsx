import { find, get, isEmpty, snakeCase } from "lodash";
import { formikToFilterQuery, featuresToUIMetadata, formikToFeatureAttributes, formikToAggregation } from "../../../../public/pages/ReviewAndCreate/utils/helpers";
import { convertTimestampToNumber } from '../../../../public/utils/utils';
import { CUSTOM_AD_RESULT_INDEX_PREFIX } from "../../../../server/utils/constants";
import { FEATURE_TYPE } from "../../../../public/models/interfaces";
import { FeaturesFormikValues } from "../../../../public/pages/ConfigureModel/models/interfaces";


export function formikToDetectorName(title) {
  const detectorName =
    title +
    '_anomaly_detector_' +
    Math.floor(100000 + Math.random() * 900000);
  detectorName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return detectorName;
}

export function formikToAggregationOf(value) {
  return [
    {
      label: value.aggregationOf[0].label,
      type: 'number',
    },
  ];
}