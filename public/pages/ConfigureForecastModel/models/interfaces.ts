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

// Formik values used when creating the model configuration
export interface ModelConfigurationFormikValues {
  shingleSize: number;
  imputationOption?: ImputationFormikValues;
  interval: number | undefined;
  windowDelay: number | undefined;
  suggestedSeasonality?: number;
  recencyEmphasis?: number;
  resultIndexMinAge?: number | string;
  resultIndexMinSize?: number | string;
  resultIndexTtl?:number | string;
  flattenCustomResultIndex?: boolean;
  resultIndex?: string;
  horizon?: number;
  history?: number;
}

export interface ImputationFormikValues {
  imputationMethod?: string;
  custom_value?: CustomValueFormikValues[];
}

export interface CustomValueFormikValues {
  // forecasting has only one feature and we don't need to specify the feature name
  featureName?: string;
  data: number;
}
