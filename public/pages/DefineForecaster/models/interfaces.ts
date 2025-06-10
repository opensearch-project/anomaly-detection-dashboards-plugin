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

import { UIFilter } from '../../../models/interfaces';
import { FEATURE_TYPE } from '../../../models/interfaces';
import { AggregationOption } from '../../../models/types';
import { ClusterOption } from '../utils/helpers';

// Formik values used when creating/editing the forecaster definition
export interface ForecasterDefinitionFormikValues {
  name: string;
  description: string;
  index: { label: string }[];
  filters: UIFilter[];
  filterQuery: string;
  timeField: string;
  clusters?: ClusterOption[]; 
  featureList: FeaturesFormikValues[];
  categoryFieldEnabled: boolean;
  categoryField: string[];
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
