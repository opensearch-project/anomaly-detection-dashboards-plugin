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
  ModelConfigurationFormikValues,
} from '../../ConfigureForecastModel/models/interfaces';
import { DEFAULT_SHINGLE_SIZE } from '../../../utils/constants';

// FIXME: We intentionally leave some parameters undefined to encourage customers to click 
// the "Suggest parameters" button rather than providing default values like "10 minutes" for interval
export const INITIAL_MODEL_CONFIGURATION_VALUES: ModelConfigurationFormikValues =
  {
    shingleSize: DEFAULT_SHINGLE_SIZE,
    imputationOption: undefined,
    interval: undefined,
    windowDelay: undefined,
    suggestedSeasonality: undefined,
    recencyEmphasis: undefined,
    resultIndex: undefined,
    resultIndexMinAge: 7,
    resultIndexMinSize: 51200,
    resultIndexTtl: 60,
    flattenCustomResultIndex: false,
  };

// an enum for the sparse data handling options
export enum SparseDataOptionValue {
  IGNORE = 'ignore',
  PREVIOUS_VALUE = 'previous_value',
  SET_TO_ZERO = 'set_to_zero',
  CUSTOM_VALUE = 'custom_value',
}
