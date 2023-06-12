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
} from './services';
import { AnomalyDetectionOpenSearchDashboardsPluginStart } from 'public';
import {
  VisAugmenterSetup,
  VisAugmenterStart,
} from '../../../src/plugins/vis_augmenter/public';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';

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

    // // set embeddable plugin for feature anywhere create flyout
    // setEmbeddable(embeddable);

    // // set vis argumenter loader for feature anywhere associated flyout
    // setSavedFeatureAnywhereLoader(visAugmenter.savedAugmentVisLoader);

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
    { embeddable, visAugmenter, uiActions }: AnomalyDetectionStartDeps
  ): AnomalyDetectionOpenSearchDashboardsPluginStart {
    setUISettings(core.uiSettings);
    setEmbeddable(embeddable);
    setOverlays(core.overlays);
    setSavedFeatureAnywhereLoader(visAugmenter.savedAugmentVisLoader);
    setNotifications(core.notifications);
    setUiActions(uiActions);
    return {};
  }
}
