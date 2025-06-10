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

import { FILTER_TYPES, UIFilter } from '../../../models/interfaces';
import { OPERATORS_MAP } from '../../DefineDetector/components/DataFilterList/utils/constant';
import { ForecasterDefinitionFormikValues } from '../models/interfaces';
import { FEATURE_TYPE } from '../../../models/interfaces';
import {
  FeaturesFormikValues,
} from '../../ConfigureModel/models/interfaces';

export const EMPTY_UI_FILTER: UIFilter = {
  filterType: FILTER_TYPES.SIMPLE,
  fieldInfo: [],
  operator: OPERATORS_MAP.IS,
  fieldValue: '',
  query: '',
  label: '',
};

export const testForecasterDefinitionValues: ForecasterDefinitionFormikValues = {
  name: 'test',
  description: 'desc',
  index: [],
  filters: [],
  filterQuery: JSON.stringify({ bool: { filter: [] } }, null, 4),
  timeField: 'timestamp',
  featureList: [],
  categoryFieldEnabled: false,
  categoryField: [],
};

export const INITIAL_FORECASTER_DEFINITION_VALUES: ForecasterDefinitionFormikValues =
  {
    name: '',
    description: '',
    index: [],
    filters: [],
    filterQuery: JSON.stringify({ bool: { filter: [] } }, null, 4),
    timeField: '',
    featureList: [],
    categoryFieldEnabled: false,
    categoryField: [],
  };

  export const FEATURE_TYPES = [
    { text: 'Custom Aggregation', value: FEATURE_TYPE.CUSTOM },
    { text: 'Defined Aggregation', value: FEATURE_TYPE.SIMPLE },
  ];

  export const FEATURE_TYPE_OPTIONS = [
    { text: 'Field value', value: FEATURE_TYPE.SIMPLE },
    { text: 'Custom expression', value: FEATURE_TYPE.CUSTOM },
  ];

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

  export const AGGREGATION_TYPES = [
    { value: 'avg', text: 'average()' },
    { value: 'value_count', text: 'count()' },
    { value: 'sum', text: 'sum()' },
    { value: 'min', text: 'min()' },
    { value: 'max', text: 'max()' },
  ];

