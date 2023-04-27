/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createGetterSetter } from '../../../src/plugins/opensearch_dashboards_utils/public';
import { SavedObjectLoader } from '../../../src/plugins/saved_objects/public';

export const [getSavedFeatureAnywhereLoader, setSavedFeatureAnywhereLoader] =
  createGetterSetter<SavedObjectLoader>('savedFeatureAnywhereLoader');
