/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreStart } from '../../../src/core/public';
import { createGetterSetter } from '../../../src/plugins/opensearch_dashboards_utils/public';
import { SavedObjectLoader } from '../../../src/plugins/saved_objects/public';

export const [getSavedFeatureAnywhereLoader, setSavedFeatureAnywhereLoader] =
  createGetterSetter<SavedObjectLoader>('savedFeatureAnywhereLoader');


export const [getClient, setClient] =
createGetterSetter<CoreStart['http']>('http');