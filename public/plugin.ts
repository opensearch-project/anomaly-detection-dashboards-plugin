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
  NotificationsSetup,
  NotificationsStart,
  Plugin,
} from '../../../src/core/public';
import {
  CONTEXT_MENU_TRIGGER,
  EmbeddableSetup,
  EmbeddableStart,
} from '../../../src/plugins/embeddable/public';
import { ACTION_AD } from './action/ad_dashboard_action';
import { PLUGIN_NAME } from './utils/constants';
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
  setQueryService
} from './services';
import { AnomalyDetectionOpenSearchDashboardsPluginStart } from 'public';
import {
  VisAugmenterSetup,
  VisAugmenterStart,
} from '../../../src/plugins/vis_augmenter/public';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';
import { DataPublicPluginStart } from '../../../src/plugins/data/public';

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
  //uiActions: UiActionsSetup;
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
        return renderApp(coreStart, params);
      },
    });

    setUISettings(core.uiSettings);

    // Set the HTTP client so it can be pulled into expression fns to make
    // direct server-side calls
    setClient(core.http);

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
    return {};
  }
}
