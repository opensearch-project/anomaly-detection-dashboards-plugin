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

import { BASE_NODE_API_PATH, FORECAST_BASE_NODE_API_PATH } from '../utils/constants';
import { first } from 'rxjs/operators';
import { default as createRouter, Router } from './router';
import {
  AnomalyDetectionOpenSearchDashboardsPluginSetup,
  AnomalyDetectionOpenSearchDashboardsPluginStart,
} from '.';
import {
  Plugin,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Logger,
} from '../../../src/core/server';
import { ILegacyClusterClient } from '../../../src/core/server/';
import adPlugin from './cluster/ad/adPlugin';
import alertingPlugin from './cluster/ad/alertingPlugin';
import mlPlugin from './cluster/ad/mlPlugin';
import forecastFeature from './cluster/ad/forecastFeature';
import AdService, { registerADRoutes } from './routes/ad';
import AlertingService, { registerAlertingRoutes } from './routes/alerting';
import MLService, { registerMLRoutes } from './routes/ml';
import OpenSearchService, {
  registerOpenSearchRoutes,
} from './routes/opensearch';
import SampleDataService, {
  registerSampleDataRoutes,
} from './routes/sampleData';
import { DEFAULT_HEADERS } from './utils/constants';
import { DataSourcePluginSetup } from '../../../src/plugins/data_source/server/types';
import { DataSourceManagementPlugin } from '../../../src/plugins/data_source_management/public';
import ForecastService, { registerForecastRoutes } from './routes/forecast';
import { getAnomalyDetectionUiSettings } from './ui_settings';

export interface ADPluginSetupDependencies {
  dataSourceManagement?: ReturnType<DataSourceManagementPlugin['setup']>;
  dataSource?: DataSourcePluginSetup;
}

export class AnomalyDetectionOpenSearchDashboardsPlugin
  implements
    Plugin<
      AnomalyDetectionOpenSearchDashboardsPluginSetup,
      AnomalyDetectionOpenSearchDashboardsPluginStart
    >
{
  private readonly logger: Logger;
  private readonly globalConfig$: any;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.globalConfig$ = initializerContext.config.legacy.globalConfig$;
  }
  public async setup(
    core: CoreSetup,
    { dataSource }: ADPluginSetupDependencies
  ) {
    // Register UI settings
    core.uiSettings.register(getAnomalyDetectionUiSettings());

    // Get any custom/overridden headers
    const globalConfig = await this.globalConfig$.pipe(first()).toPromise();
    const { customHeaders, ...rest } = globalConfig.opensearch;

    // Create OpenSearch client w/ relevant plugins and headers
    const client: ILegacyClusterClient = core.opensearch.legacy.createClient(
      'anomaly_detection',
      {
        // forecastFeature is still inside adPlugin, but totally independent from adPlugin
        plugins: [adPlugin, alertingPlugin, forecastFeature, mlPlugin],
        customHeaders: { ...customHeaders, ...DEFAULT_HEADERS },
        ...rest,
      }
    );

    const dataSourceEnabled = !!dataSource;

    if (dataSourceEnabled) {
      dataSource.registerCustomApiSchema(adPlugin);
      dataSource.registerCustomApiSchema(alertingPlugin);
      dataSource.registerCustomApiSchema(forecastFeature);
      dataSource.registerCustomApiSchema(mlPlugin);
    }

    // Create router
    const apiRouter: Router = createRouter(
      core.http.createRouter(),
      BASE_NODE_API_PATH
    );
    const mlApiRouter: Router = createRouter(
      core.http.createRouter(),
      '/api/ml'
    );

    const forecastApiRouter: Router = createRouter(
      core.http.createRouter(),
      FORECAST_BASE_NODE_API_PATH
    );

    // Create services & register with OpenSearch client
    const adService = new AdService(client, dataSourceEnabled);
    const alertingService = new AlertingService(client, dataSourceEnabled);
    const mlService = new MLService(client, dataSourceEnabled);
    const opensearchService = new OpenSearchService(client, dataSourceEnabled);
    const sampleDataService = new SampleDataService(client, dataSourceEnabled);
    const forecastService = new ForecastService(client, dataSourceEnabled);

    // Register server routes with the service
    registerADRoutes(apiRouter, adService);
    registerAlertingRoutes(apiRouter, alertingService);
    registerMLRoutes(mlApiRouter, mlService);
    registerOpenSearchRoutes(apiRouter, opensearchService);
    registerSampleDataRoutes(apiRouter, sampleDataService);
    registerForecastRoutes(forecastApiRouter, forecastService);
    return {};
  }

  public async start(core: CoreStart) {
    return {};
  }
}
