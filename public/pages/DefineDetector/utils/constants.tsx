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
import { DetectorDefinitionFormikValues } from '../../DefineDetector/models/interfaces';

export const EMPTY_UI_FILTER: UIFilter = {
  filterType: FILTER_TYPES.SIMPLE,
  fieldInfo: [],
  operator: OPERATORS_MAP.IS,
  fieldValue: '',
  query: '',
  label: '',
};

export const INITIAL_DETECTOR_DEFINITION_VALUES: DetectorDefinitionFormikValues =
  {
    name: '',
    description: '',
    index: [],
    filters: [],
    filterQuery: JSON.stringify({ bool: { filter: [] } }, null, 4),
    timeField: '',
    interval: 10,
    windowDelay: 1,
    resultIndex: undefined,
  };
