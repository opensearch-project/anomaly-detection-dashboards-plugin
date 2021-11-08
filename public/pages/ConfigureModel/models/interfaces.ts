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
import { AggregationOption } from '../../../models/types';

// Formik values used when creating/editing the model configuration
export interface ModelConfigurationFormikValues {
  featureList: FeaturesFormikValues[];
  categoryFieldEnabled: boolean;
  categoryField: string[];
  shingleSize: number;
}

export interface FeaturesFormikValues {
  featureId: string;
  featureName: string | undefined;
  featureType: FEATURE_TYPE;
  featureEnabled: boolean;
  aggregationQuery: string;
  aggregationBy?: string;
  aggregationOf?: AggregationOption[];
  newFeature?: boolean;
}
