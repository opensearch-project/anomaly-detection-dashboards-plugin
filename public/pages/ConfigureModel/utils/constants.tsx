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

import { FEATURE_TYPE } from '../../../models/interfaces';
import {
  ModelConfigurationFormikValues,
  FeaturesFormikValues,
} from '../../ConfigureModel/models/interfaces';
import { DEFAULT_SHINGLE_SIZE } from '../../../utils/constants';

export const INITIAL_MODEL_CONFIGURATION_VALUES: ModelConfigurationFormikValues =
  {
    featureList: [],
    categoryFieldEnabled: false,
    categoryField: [],
    shingleSize: DEFAULT_SHINGLE_SIZE,
  };

export const INITIAL_FEATURE_VALUES: FeaturesFormikValues = {
  featureId: '',
  featureName: '',
  featureEnabled: true,
  featureType: FEATURE_TYPE.SIMPLE,
  aggregationQuery: JSON.stringify(
    { aggregation_name: { sum: { field: 'field_name' } } },
    null,
    4
  ),
  aggregationBy: '',
  aggregationOf: [],
};

export const FEATURE_TYPES = [
  { text: 'Custom Aggregation', value: FEATURE_TYPE.CUSTOM },
  { text: 'Defined Aggregation', value: FEATURE_TYPE.SIMPLE },
];

export const FEATURE_TYPE_OPTIONS = [
  { text: 'Field value', value: FEATURE_TYPE.SIMPLE },
  { text: 'Custom expression', value: FEATURE_TYPE.CUSTOM },
];

export enum SAVE_FEATURE_OPTIONS {
  START_AD_JOB = 'start_ad_job',
  KEEP_AD_JOB_STOPPED = 'keep_ad_job_stopped',
}

export const AGGREGATION_TYPES = [
  { value: 'avg', text: 'average()' },
  { value: 'value_count', text: 'count()' },
  { value: 'sum', text: 'sum()' },
  { value: 'min', text: 'min()' },
  { value: 'max', text: 'max()' },
];

export const FEATURE_FIELDS = [
  'featureName',
  'aggregationOf',
  'aggregationBy',
  'aggregationQuery',
];
