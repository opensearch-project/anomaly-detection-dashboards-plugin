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
import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
import { UsageCollectionSetup } from '../../../src/plugins/usage_collection/public/plugin';
import { AssistantPublicPluginStart } from '../../../plugins/dashboards-assistant/public/';

export interface DataSourceEnabled {
  enabled: boolean;
}

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

export const [getUsageCollection, setUsageCollection] =
  createGetterSetter<UsageCollectionSetup>('UsageCollection');

export const [getAssistantEnabled, setAssistantEnabled] =
  createGetterSetter<AssistantPublicPluginStart>('AssistantClient');

export const [getAssistantClient, setAssistantClient] =
  createGetterSetter<AssistantPublicPluginStart['assistantClient']>('AssistantClient');

export const [getSavedObjectsClient, setSavedObjectsClient] =
  createGetterSetter<CoreStart['savedObjects']['client']>('SavedObjectsClient');

export const [getDataSourceManagementPlugin, setDataSourceManagementPlugin] =
  createGetterSetter<DataSourceManagementPluginSetup>('DataSourceManagement');

export const [getDataSourceEnabled, setDataSourceEnabled] =
  createGetterSetter<DataSourceEnabled>('DataSourceEnabled');

export const [getNavigationUI, setNavigationUI] =
  createGetterSetter<NavigationPublicPluginStart['ui']>('navigation');

export const [getApplication, setApplication] =
  createGetterSetter<CoreStart['application']>('application');

// This is primarily used for mocking this module and each of its fns in tests.
// Testing frameworks (like Jest, which is commonly used in OpenSearch Dashboards plugins)
// make it easy to mock entire modules. By importing the default export (import services
// from './services';), a test setup can easily replace the entire services object or
// specific functions within it (e.g., services.getSavedObjectsClient = jest.fn().mockReturnValue(...)).
// This provides a convenient way to control the behavior of all these service accessors from
// a single point in the test setup.
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
