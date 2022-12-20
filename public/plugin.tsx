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
import { ACTION_AD, createADAction } from './action/ad_dashboard_action';

declare module '../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_AD]: {};
  }
}

export class AnomalyDetectionOpenSearchDashboardsPlugin
  implements
    Plugin
{
  constructor(private readonly initializerContext: PluginInitializerContext) {
    // can retrieve config from initializerContext
  }

  public setup(core: CoreSetup, plugins) {
    core.application.register({
      id: 'anomaly-detection-dashboards',
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

    const adAction = createADAction();
    const { uiActions } = plugins;
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, adAction);
  }

  public start() {}

  public stop() {}
}


