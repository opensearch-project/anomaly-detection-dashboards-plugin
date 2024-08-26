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

export type AggregationOption = {
  label: string;
};

export type ImputationOption = {
  method: ImputationMethod;
  defaultFill?: Array<{ featureName: string; data: number }>;
};

export enum ImputationMethod {
  /**
   * This method replaces all missing values with 0's. It's a simple approach, but it may introduce bias if the data is not centered around zero.
   */
  ZERO = 'ZERO',
  /**
   * This method replaces missing values with a predefined set of values. The values are the same for each input dimension, and they need to be specified by the user.
   */
  FIXED_VALUES = 'FIXED_VALUES',
  /**
   * This method replaces missing values with the last known value in the respective input dimension. It's a commonly used method for time series data, where temporal continuity is expected.
   */
  PREVIOUS = 'PREVIOUS',
}

