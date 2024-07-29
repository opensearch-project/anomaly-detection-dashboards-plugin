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
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  DEFAULT_NAV_GROUPS,
  NotificationsSetup,
  NotificationsStart,
  Plugin,
  WorkspaceAvailability,
} from '../../../src/core/public';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableSetup,
  EmbeddableStart,
} from '../../../src/plugins/embeddable/public';
import { ACTION_AD } from './action/ad_dashboard_action';
import { APP_PATH, DASHBOARD_PAGE_NAV_ID, DETECTORS_PAGE_NAV_ID, OVERVIEW_PAGE_NAV_ID, PLUGIN_NAME } from './utils/constants';
import { getActions } from './utils/contextMenu/getActions';
import { overlayAnomaliesFunction } from './expressions/overlay_anomalies';
import {
  setClient,
  setEmbeddable,
  setNotifications,
  setOverlays,
  setSavedFeatureAnywhereLoader,
  setUiActions,
  setUISettings,
  setQueryService,
  setSavedObjectsClient,
  setDataSourceManagementPlugin,
  setDataSourceEnabled,
} from './services';
import { AnomalyDetectionOpenSearchDashboardsPluginStart } from 'public';
import {
  VisAugmenterSetup,
  VisAugmenterStart,
} from '../../../src/plugins/vis_augmenter/public';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';
import { DataSourceManagementPluginSetup } from '../../../src/plugins/data_source_management/public';
import { DataSourcePluginSetup } from '../../../src/plugins/data_source/public';

declare module '../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_AD]: {};
  }
}

//TODO: there is currently no savedAugmentVisLoader in VisAugmentSetup interface, this needs to be fixed
export interface AnomalyDetectionSetupDeps {
  embeddable: EmbeddableSetup;
  notifications: NotificationsSetup;
  visAugmenter: VisAugmenterSetup;
  dataSourceManagement: DataSourceManagementPluginSetup;
  dataSource: DataSourcePluginSetup;
}

export interface AnomalyDetectionStartDeps {
  embeddable: EmbeddableStart;
  notifications: NotificationsStart;
  visAugmenter: VisAugmenterStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
}

export class AnomalyDetectionOpenSearchDashboardsPlugin
  implements Plugin<AnomalyDetectionSetupDeps, AnomalyDetectionStartDeps>
{
  public setup(core: CoreSetup, plugins: any) {
    const hideInAppSideNavBar = core.chrome.navGroup.getNavGroupEnabled();

    core.application.register({
      id: PLUGIN_NAME,
      title: 'Anomaly Detection',
      category: {
        id: 'opensearch',
        label: 'OpenSearch Plugins',
        order: 2000,
      },
      order: 5000,
      mount: async (params: AppMountParameters) => {
        const { renderApp } = await import('./anomaly_detection_app');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params, undefined, hideInAppSideNavBar);
      },
    });

    // register applications with category and use case information
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability,[
      {
        id: PLUGIN_NAME,
        category: DEFAULT_APP_CATEGORIES.detect,
      }
    ])

    // register sub applications as standard OSD applications with use case
    if (core.chrome.navGroup.getNavGroupEnabled()) {
      core.application.register({
        id: OVERVIEW_PAGE_NAV_ID,
        title: 'Get started',
        order: 8040,
        category: DEFAULT_APP_CATEGORIES.detect,
        mount: async (params: AppMountParameters) => {
          const { renderApp } = await import('./anomaly_detection_app');
          const [coreStart] = await core.getStartServices();
          return renderApp(coreStart, params, APP_PATH.OVERVIEW, hideInAppSideNavBar);
        },
      }); 
    }

    if (core.chrome.navGroup.getNavGroupEnabled()) {
      core.application.register({
        id: DASHBOARD_PAGE_NAV_ID,
        title: 'Dashboard',
        order: 8040,
        category: DEFAULT_APP_CATEGORIES.detect,
        mount: async (params: AppMountParameters) => {
          const { renderApp } = await import('./anomaly_detection_app');
          const [coreStart] = await core.getStartServices();
          return renderApp(coreStart, params, APP_PATH.DASHBOARD, hideInAppSideNavBar);
        },
      }); 
    }

    if (core.chrome.navGroup.getNavGroupEnabled()) {
      core.application.register({
        id: DETECTORS_PAGE_NAV_ID,
        title: 'Detectors',
        order: 8040,
        category: DEFAULT_APP_CATEGORIES.detect,
        mount: async (params: AppMountParameters) => {
          const { renderApp } = await import('./anomaly_detection_app');
          const [coreStart] = await core.getStartServices();
          return renderApp(coreStart, params, APP_PATH.LIST_DETECTORS, hideInAppSideNavBar);
        },
      }); 
    }

    // link the sub applications to the parent application
    core.chrome.navGroup.addNavLinksToGroup(
      DEFAULT_NAV_GROUPS.observability,
      [{
          id: OVERVIEW_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
      },
      {
        id: DASHBOARD_PAGE_NAV_ID,
        parentNavLinkId: PLUGIN_NAME
      },
      {
        id: DETECTORS_PAGE_NAV_ID,
        parentNavLinkId: PLUGIN_NAME
      }]
    );

    setUISettings(core.uiSettings);

    // Set the HTTP client so it can be pulled into expression fns to make
    // direct server-side calls
    setClient(core.http);

    setDataSourceManagementPlugin(plugins.dataSourceManagement);

    const enabled = !!plugins.dataSource;

    setDataSourceEnabled({ enabled });

    // Create context menu actions
    const actions = getActions();

    // Add actions to uiActions
    actions.forEach((action) => {
      plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, action);
    });

    // registers the expression function used to render anomalies on an Augmented Visualization
    plugins.expressions.registerFunction(overlayAnomaliesFunction);
    return {};
  }

  public start(
    core: CoreStart,
    { embeddable, visAugmenter, uiActions, data }: AnomalyDetectionStartDeps
  ): AnomalyDetectionOpenSearchDashboardsPluginStart {
    setUISettings(core.uiSettings);
    setEmbeddable(embeddable);
    setOverlays(core.overlays);
    setSavedFeatureAnywhereLoader(visAugmenter.savedAugmentVisLoader);
    setNotifications(core.notifications);
    setUiActions(uiActions);
    setQueryService(data.query);
    setSavedObjectsClient(core.savedObjects.client);
    return {};
  }
}
