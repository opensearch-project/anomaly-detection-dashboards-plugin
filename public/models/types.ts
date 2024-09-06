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

// Constants for field names
export const RULES_FIELD = "rules";
export const ACTION_FIELD = "action";
export const CONDITIONS_FIELD = "conditions";
export const FEATURE_NAME_FIELD = "feature_name";
export const THRESHOLD_TYPE_FIELD = "threshold_type";
export const OPERATOR_FIELD = "operator";
export const VALUE_FIELD = "value";

// Enums
export enum Action {
  IGNORE_ANOMALY = "IGNORE_ANOMALY", // ignore anomaly if found
}

export enum ThresholdType {
  /**
   * Specifies a threshold for ignoring anomalies where the actual value
   * exceeds the expected value by a certain margin.
   *
   * Assume a represents the actual value and b signifies the expected value.
   * IGNORE_SIMILAR_FROM_ABOVE implies the anomaly should be disregarded if a-b
   * is less than or equal to ignoreSimilarFromAbove.
   */
  ACTUAL_OVER_EXPECTED_MARGIN = "ACTUAL_OVER_EXPECTED_MARGIN",

  /**
   * Specifies a threshold for ignoring anomalies where the actual value
   * is below the expected value by a certain margin.
   *
   * Assume a represents the actual value and b signifies the expected value.
   * Likewise, IGNORE_SIMILAR_FROM_BELOW
   * implies the anomaly should be disregarded if b-a is less than or equal to
   * ignoreSimilarFromBelow.
   */
  EXPECTED_OVER_ACTUAL_MARGIN = "EXPECTED_OVER_ACTUAL_MARGIN",

  /**
   * Specifies a threshold for ignoring anomalies based on the ratio of
   * the difference to the actual value when the actual value exceeds
   * the expected value.
   *
   * Assume a represents the actual value and b signifies the expected value.
   * The variable IGNORE_NEAR_EXPECTED_FROM_ABOVE_BY_RATIO presumably implies the
   * anomaly should be disregarded if the ratio of the deviation from the actual
   * to the expected (a-b)/|a| is less than or equal to IGNORE_NEAR_EXPECTED_FROM_ABOVE_BY_RATIO.
   */
  ACTUAL_OVER_EXPECTED_RATIO = "ACTUAL_OVER_EXPECTED_RATIO",

  /**
   * Specifies a threshold for ignoring anomalies based on the ratio of
   * the difference to the actual value when the actual value is below
   * the expected value.
   *
   * Assume a represents the actual value and b signifies the expected value.
   * Likewise, IGNORE_NEAR_EXPECTED_FROM_BELOW_BY_RATIO appears to indicate that the anomaly
   * should be ignored if the ratio of the deviation from the expected to the actual
   * (b-a)/|a| is less than or equal to ignoreNearExpectedFromBelowByRatio.
   */
  EXPECTED_OVER_ACTUAL_RATIO = "EXPECTED_OVER_ACTUAL_RATIO",
}

// Method to get the description of ThresholdType
export function getThresholdTypeDescription(thresholdType: ThresholdType): string {
  return thresholdType; // In TypeScript, the enum itself holds the description.
}

// Enums for Operators
export enum Operator {
  LTE = "LTE",
}

// Interfaces for Rule and Condition
export interface Rule {
  action: Action;
  conditions: Condition[];
}

export interface Condition {
  featureName: string;
  thresholdType: ThresholdType;
  operator: Operator;
  value: number;
}

