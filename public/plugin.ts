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
  Plugin,
  PluginInitializerContext,
} from '../../../src/core/public';
import {
  AnomalyDetectionOpenSearchDashboardsPluginSetup,
  AnomalyDetectionOpenSearchDashboardsPluginStart,
} from '.';

export class AnomalyDetectionOpenSearchDashboardsPlugin
  implements
    Plugin<
      AnomalyDetectionOpenSearchDashboardsPluginSetup,
      AnomalyDetectionOpenSearchDashboardsPluginStart
    > {
  constructor(private readonly initializerContext: PluginInitializerContext) {
    // can retrieve config from initializerContext
  }

  public setup(
    core: CoreSetup
  ): AnomalyDetectionOpenSearchDashboardsPluginSetup {
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
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });
    return {};
  }

  public start(
    core: CoreStart
  ): AnomalyDetectionOpenSearchDashboardsPluginStart {
    return {};
  }
}
