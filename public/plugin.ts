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
import { APP_PATH, DASHBOARD_PAGE_NAV_ID, DETECTORS_PAGE_NAV_ID, OVERVIEW_PAGE_NAV_ID, PLUGIN_NAME, FORECASTING_FEATURE_NAME,
  FORECASTING_OVERVIEW_PAGE_NAV_ID, FORECASTING_DASHBOARD_PAGE_NAV_ID, FORECASTERS_PAGE_NAV_ID, DAILY_INSIGHTS_FEATURE_NAME,
  DAILY_INSIGHTS_OVERVIEW_PAGE_NAV_ID, DAILY_INSIGHTS_INDICES_PAGE_NAV_ID
} from './utils/constants';
import { DAILY_INSIGHTS_ENABLED } from '../utils/constants';
import { ACTION_SUGGEST_AD, getActions, getSuggestAnomalyDetectorAction } from './utils/contextMenu/getActions';
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
  setNavigationUI,
  setApplication,
  setUsageCollection,
  setAssistantClient,
} from './services';
import { AnomalyDetectionOpenSearchDashboardsPluginStart } from 'public';
import {
  VisAugmenterSetup,
  VisAugmenterStart,
} from '../../../src/plugins/vis_augmenter/public';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../src/plugins/data/public';
import { DataSourceManagementPluginSetup } from '../../../src/plugins/data_source_management/public';
import { DataSourcePluginSetup } from '../../../src/plugins/data_source/public';
import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
import { AssistantPublicPluginStart } from '../../dashboards-assistant/public';

declare module '../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_AD]: {};
    [ACTION_SUGGEST_AD]: {}
  }
}

//TODO: there is currently no savedAugmentVisLoader in VisAugmentSetup interface, this needs to be fixed
export interface AnomalyDetectionSetupDeps {
  embeddable: EmbeddableSetup;
  notifications: NotificationsSetup;
  visAugmenter: VisAugmenterSetup;
  dataSourceManagement: DataSourceManagementPluginSetup;
  dataSource: DataSourcePluginSetup;
  data: DataPublicPluginSetup;
}

export interface AnomalyDetectionStartDeps {
  embeddable: EmbeddableStart;
  notifications: NotificationsStart;
  visAugmenter: VisAugmenterStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  assistantDashboards: AssistantPublicPluginStart;
}

export class AnomalyDetectionOpenSearchDashboardsPlugin
  implements Plugin<AnomalyDetectionSetupDeps, AnomalyDetectionStartDeps>
{
  public setup(core: CoreSetup, plugins: any) {
    const hideInAppSideNavBar = core.chrome.navGroup.getNavGroupEnabled();
    const forecastingEnabled = true;
    const dailyInsightsEnabled = core.uiSettings.get(DAILY_INSIGHTS_ENABLED, false);

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

    if (forecastingEnabled) {
      core.application.register({
        id: FORECASTING_FEATURE_NAME,
        title: 'Forecasting',
        category: {
          id: 'opensearch',
          label: 'OpenSearch Plugins',
          order: 2000,
        },
        // 5010 as the following plugin Maps uses 5100
        // read https://tinyurl.com/4255uk9r
        order: 5010,
        mount: async (params: AppMountParameters) => {
          const { renderApp } = await import('./forecasting_app');
          const [coreStart] = await core.getStartServices();
          return renderApp(coreStart, params, APP_PATH.LIST_FORECASTERS, hideInAppSideNavBar);
        },
      });
    }

    if (dailyInsightsEnabled) {
      // Daily Insights parent (for navigation grouping only)
      core.application.register({
        id: DAILY_INSIGHTS_FEATURE_NAME,
        title: 'Daily Insights',
        category: {
          id: 'opensearch',
          label: 'OpenSearch Plugins',
          order: 2000,
        },
        order: 5020,
        mount: async (params: AppMountParameters) => {
          // Redirect to overview by default
          window.location.hash = `#/${APP_PATH.DAILY_INSIGHTS_OVERVIEW}`;
          return () => {};
        },
      });
    }

    // register applications with category and use case information
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
      {
        id: PLUGIN_NAME,
        category: DEFAULT_APP_CATEGORIES.detect,
      }
    ]);
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.all, [
      {
        id: PLUGIN_NAME,
        category: DEFAULT_APP_CATEGORIES.detect,
      }
    ]);
    core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS['security-analytics'], [
      {
        id: PLUGIN_NAME,
        category: DEFAULT_APP_CATEGORIES.detect,
      }
    ]);

    if (forecastingEnabled) {
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
        {
          id: FORECASTING_FEATURE_NAME,
          category: DEFAULT_APP_CATEGORIES.detect,
        }
      ]);
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.all, [
        {
          id: FORECASTING_FEATURE_NAME,
          category: DEFAULT_APP_CATEGORIES.detect,
        }
      ]);
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS['security-analytics'], [
        {
          id: FORECASTING_FEATURE_NAME,
          category: DEFAULT_APP_CATEGORIES.detect,
        }
        ]);
    }

    if (dailyInsightsEnabled) {
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.observability, [
        {
          id: DAILY_INSIGHTS_FEATURE_NAME,
          category: DEFAULT_APP_CATEGORIES.detectionInsights,
        },
        {
          id: DAILY_INSIGHTS_OVERVIEW_PAGE_NAV_ID,
          parentNavLinkId: DAILY_INSIGHTS_FEATURE_NAME
        },
        {
          id: DAILY_INSIGHTS_INDICES_PAGE_NAV_ID,
          parentNavLinkId: DAILY_INSIGHTS_FEATURE_NAME
        }
      ]);
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS.all, [
        {
          id: DAILY_INSIGHTS_FEATURE_NAME,
          category: DEFAULT_APP_CATEGORIES.detectionInsights,
        },
        {
          id: DAILY_INSIGHTS_OVERVIEW_PAGE_NAV_ID,
          parentNavLinkId: DAILY_INSIGHTS_FEATURE_NAME
        },
        {
          id: DAILY_INSIGHTS_INDICES_PAGE_NAV_ID,
          parentNavLinkId: DAILY_INSIGHTS_FEATURE_NAME
        }
      ]);
      core.chrome.navGroup.addNavLinksToGroup(DEFAULT_NAV_GROUPS['security-analytics'], [
        {
          id: DAILY_INSIGHTS_FEATURE_NAME,
          category: DEFAULT_APP_CATEGORIES.detectionInsights,
        },
        {
          id: DAILY_INSIGHTS_OVERVIEW_PAGE_NAV_ID,
          parentNavLinkId: DAILY_INSIGHTS_FEATURE_NAME
        },
        {
          id: DAILY_INSIGHTS_INDICES_PAGE_NAV_ID,
          parentNavLinkId: DAILY_INSIGHTS_FEATURE_NAME
        }
      ]);
    }

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

      if (dailyInsightsEnabled) {
        core.application.register({
          id: DAILY_INSIGHTS_OVERVIEW_PAGE_NAV_ID,
          title: 'Overview',
          order: 8050,
          category: DEFAULT_APP_CATEGORIES.detectionInsights,
          mount: async (params: AppMountParameters) => {
            const { renderApp } = await import('./daily_insights_app');
            const [coreStart] = await core.getStartServices();
            return renderApp(coreStart, params, APP_PATH.DAILY_INSIGHTS_OVERVIEW);
          },
        });

        // Indices Management sub-page (new functionality)
        core.application.register({
          id: DAILY_INSIGHTS_INDICES_PAGE_NAV_ID,
          title: 'Insight Management',
          order: 8051,
          category: DEFAULT_APP_CATEGORIES.detectionInsights,
          mount: async (params: AppMountParameters) => {
            const { renderApp } = await import('./daily_insights_app');
            const [coreStart] = await core.getStartServices();
            return renderApp(coreStart, params, APP_PATH.DAILY_INSIGHTS_INDICES);
          },
        });
      }
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

    core.chrome.navGroup.addNavLinksToGroup(
      DEFAULT_NAV_GROUPS.all,
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

    core.chrome.navGroup.addNavLinksToGroup(
      DEFAULT_NAV_GROUPS['security-analytics'],
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

    if (forecastingEnabled) {
      core.chrome.navGroup.addNavLinksToGroup(
        DEFAULT_NAV_GROUPS.observability,
        [{
          id: FORECASTING_OVERVIEW_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        },
        {
          id: FORECASTING_DASHBOARD_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        },
        {
          id: FORECASTERS_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        }]
      );
  
      core.chrome.navGroup.addNavLinksToGroup(
        DEFAULT_NAV_GROUPS.all,
        [{
          id: FORECASTING_OVERVIEW_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        },
        {
          id: FORECASTING_DASHBOARD_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        },
        {
          id: FORECASTERS_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        }]
      );
  
      core.chrome.navGroup.addNavLinksToGroup(
        DEFAULT_NAV_GROUPS['security-analytics'],
        [{
          id: FORECASTING_OVERVIEW_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        },
        {
          id: FORECASTING_DASHBOARD_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        },
        {
          id: FORECASTERS_PAGE_NAV_ID,
          parentNavLinkId: PLUGIN_NAME
        }]
      );
    }

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

    // register suggest anomaly detector action to Discover only if the feature flag is enabled 
    if (plugins.assistantDashboards?.getFeatureStatus().smartAnomalyDetector && plugins.assistantDashboards?.assistantTriggers?.AI_ASSISTANT_QUERY_EDITOR_TRIGGER) {
      const checkAndRegisterAction = async () => {
        const [coreStart] = await core.getStartServices();
        const assistantEnabled = coreStart.application.capabilities?.assistant?.enabled === true;
        if (assistantEnabled) {
          // Add suggest anomaly detector action to the uiActions in Discover
          const suggestAnomalyDetectorAction = getSuggestAnomalyDetectorAction();
          plugins.uiActions.addTriggerAction(plugins.assistantDashboards.assistantTriggers.AI_ASSISTANT_QUERY_EDITOR_TRIGGER, suggestAnomalyDetectorAction);
          // set usageCollection for metric report
          setUsageCollection(plugins.usageCollection);
        }
      }
      checkAndRegisterAction();
    }
    // registers the expression function used to render anomalies on an Augmented Visualization
    plugins.expressions.registerFunction(overlayAnomaliesFunction);
    return {};
  }

  public start(
    core: CoreStart,
    { embeddable, visAugmenter, uiActions, data, navigation, assistantDashboards }: AnomalyDetectionStartDeps
  ): AnomalyDetectionOpenSearchDashboardsPluginStart {
    setUISettings(core.uiSettings);
    setEmbeddable(embeddable);
    setOverlays(core.overlays);
    setSavedFeatureAnywhereLoader(visAugmenter.savedAugmentVisLoader);
    setNotifications(core.notifications);
    setUiActions(uiActions);
    setQueryService(data.query);
    setSavedObjectsClient(core.savedObjects.client);
    setNavigationUI(navigation.ui);
    if (assistantDashboards) {
      setAssistantClient(assistantDashboards.assistantClient);
    }
    setApplication(core.application);
    return {};
  }
}
