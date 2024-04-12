/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CoreStart,
  IUiSettingsClient,
  NotificationsStart,
  OverlayStart,
} from '../../../src/core/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { DataSourceManagementPluginSetup } from '../../../src/plugins/data_source_management/public';
import { EmbeddableStart } from '../../../src/plugins/embeddable/public';
import { createGetterSetter } from '../../../src/plugins/opensearch_dashboards_utils/public';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { SavedAugmentVisLoader } from '../../../src/plugins/vis_augmenter/public';
import { DataSourcePluginSetup } from '../../../src/plugins/data_source/public';

export const [getSavedFeatureAnywhereLoader, setSavedFeatureAnywhereLoader] =
  createGetterSetter<SavedAugmentVisLoader>('savedFeatureAnywhereLoader');

export const [getClient, setClient] =
  createGetterSetter<CoreStart['http']>('http');

export const [getEmbeddable, setEmbeddable] =
  createGetterSetter<EmbeddableStart>('Embeddable');

export const [getOverlays, setOverlays] =
  createGetterSetter<OverlayStart>('Overlays');

export const [getNotifications, setNotifications] =
  createGetterSetter<NotificationsStart>('Notifications');

export const [getUiActions, setUiActions] =
  createGetterSetter<UiActionsStart>('UIActions');

export const [getUISettings, setUISettings] =
  createGetterSetter<IUiSettingsClient>('UISettings');

export const [getQueryService, setQueryService] =
  createGetterSetter<DataPublicPluginStart['query']>('Query');

export const [getSavedObjectsClient, setSavedObjectsClient] =
  createGetterSetter<CoreStart['savedObjects']['client']>('SavedObjectsClient');

export const [getDataSourceManagementPlugin, setDataSourceManagementPlugin] = 
  createGetterSetter<DataSourceManagementPluginSetup>('DataSourceManagement');

export const [getDataSourcePlugin, setDataSourcePlugin] = 
  createGetterSetter<DataSourcePluginSetup>('DataSource');

// This is primarily used for mocking this module and each of its fns in tests.
export default {
  getSavedFeatureAnywhereLoader,
  getUISettings,
  getUiActions,
  getEmbeddable,
  getNotifications,
  getOverlays,
  setUISettings,
  setQueryService,
  getSavedObjectsClient,
};
