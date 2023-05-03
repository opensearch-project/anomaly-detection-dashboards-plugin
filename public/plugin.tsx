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
  Plugin,
  PluginInitializerContext,
} from '../../../src/core/public';
import { CONTEXT_MENU_TRIGGER } from '../../../src/plugins/embeddable/public';
import { ACTION_AD } from './action/ad_dashboard_action';
import { PLUGIN_NAME } from './utils/constants';
import { getActions } from './utils/contextMenu/getActions';
import { setSavedFeatureAnywhereLoader } from './services';
import { overlayAnomaliesFunction } from './expressions/overlay_anomalies';
import { setClient } from './services';

declare module '../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_AD]: {};
  }
}

export class AnomalyDetectionOpenSearchDashboardsPlugin implements Plugin {
  public setup(core: CoreSetup, plugins) {
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

    // Create context menu actions. Pass core, to access service for flyouts.
    const actions = getActions({ core });

    // Add  actions to uiActions
    actions.forEach((action) => {
      plugins.uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, action);
    });

    // Set the HTTP client so it can be pulled into expression fns to make
    // direct server-side calls
    setClient(core.http);

    // registers the expression function used to render anomalies on an Augmented Visualization
    plugins.expressions.registerFunction(overlayAnomaliesFunction);
    return {};
  }

  public start(core: CoreStart, plugins) {
    setSavedFeatureAnywhereLoader(plugins.visAugmenter.savedAugmentVisLoader);
    return {};
  }
  public stop() {}
}
