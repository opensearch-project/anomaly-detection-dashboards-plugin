/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../src/core/public';
import { CONTEXT_MENU_TRIGGER } from '../../../src/plugins/embeddable/public';
import { ACTION_AD, createADAction } from './action/ad_dashboard_action';
import { PLUGIN_NAME } from './utils/constants';
import { getActions } from './utils/contextMenu/action';
import { setSavedFeatureAnywhereLoader } from './services';

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
  }

  public start(core: CoreStart, plugins) {
    setSavedFeatureAnywhereLoader(plugins.visAugmenter.savedAugmentVisLoader);
    return {};
  }

  public stop() {}
}
