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
import { default as createRouter, Router, UnsupportedRouteRejector } from './router';
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
  OpenSearchDashboardsRequest,
} from '../../../src/core/server';
import { ILegacyClusterClient } from '../../../src/core/server/';
import { getWorkspaceState } from '../../../src/core/server/utils';
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
import {
  MDSEnabledClientService,
  WorkspaceAuthorizer,
} from './services/MDSEnabledClientService';

export interface ADPluginSetupDependencies {
  dataSourceManagement?: ReturnType<DataSourceManagementPlugin['setup']>;
  dataSource?: DataSourcePluginSetup;
}

export interface ADPluginStartDependencies {
  /**
   * Workspace plugin's start contract. Optional because not all deployments
   * enable workspaces; when absent the plugin continues to operate without
   * workspace ACL enforcement (defaults to "allow" for every request, which
   * matches pre-workspaces behavior).
   */
  workspace?: WorkspaceAuthorizer;
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

  // Services are held so that `start()` can inject workspace plumbing into
  // the subset (AdService, AlertingService) that extends MDSEnabledClientService.
  // The other four services do not participate in workspace ACL enforcement
  // — their routes are blocked wholesale by the guarded router below.
  private services: {
    adService?: AdService;
    alertingService?: AlertingService;
  } = {};

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

    // Create services & register with OpenSearch client.
    // Instantiated before the router so that the guarded-router's
    // rejector can close over `adService.rejectIfUnsupported`.
    const adService = new AdService(client, dataSourceEnabled);
    const alertingService = new AlertingService(client, dataSourceEnabled);
    const mlService = new MLService(client, dataSourceEnabled);
    const opensearchService = new OpenSearchService(client, dataSourceEnabled);
    const sampleDataService = new SampleDataService(client, dataSourceEnabled);
    const forecastService = new ForecastService(client, dataSourceEnabled);
    this.services.adService = adService;
    this.services.alertingService = alertingService;

    // Shared 501 rejector for routes unsupported on serverless.
    // Delegates to AdService.rejectIfUnsupported, which consults
    // the workspace plugin's `aclEnforceEndpointPatterns` config.
    const unsupportedRouteRejector: UnsupportedRouteRejector = (
      context,
      request,
      response
    ) => adService.rejectIfUnsupported(context, request, response);

    // Minimal `unsupportedRoutes` set for the main AD router: just the
    // insights subtree, which is not part of the serverless AD API surface
    // per the design doc. The AD CRUD, search, preview, start/stop, results,
    // match, count, profile, and alerting/monitor endpoints remain live on
    // serverless (but gated by workspace ACL inside the handlers).
    //
    // Historical-start and historical-stop are NOT blocked at the router
    // layer because `startDetector` / `stopDetector` are shared handlers
    // (the isHistorical branch is inside the handler body). Those handlers
    // return 501 themselves when the endpoint is unsupported.
    //
    // Sample data routes are intentionally supported: they are
    // Dashboards-owned ingestion helpers that write through the selected data
    // source, so authorization is governed by the data source itself (for
    // example, an AOSS data access policy).
    const adUnsupportedRoutes = new Set<string>([
      `POST ${BASE_NODE_API_PATH}/insights/_start`,
      `POST ${BASE_NODE_API_PATH}/insights/_start/{dataSourceId}`,
      `POST ${BASE_NODE_API_PATH}/insights/_stop`,
      `POST ${BASE_NODE_API_PATH}/insights/_stop/{dataSourceId}`,
      `GET ${BASE_NODE_API_PATH}/insights/_status`,
      `GET ${BASE_NODE_API_PATH}/insights/_status/{dataSourceId}`,
      `GET ${BASE_NODE_API_PATH}/insights/_results`,
      `GET ${BASE_NODE_API_PATH}/insights/_results/{dataSourceId}`,
    ]);

    // Create routers. The ML and forecast subtrees are blocked wholesale —
    // Oasis AD does not expose either on serverless in Milestone 1.
    const apiRouter: Router = createRouter(
      core.http.createRouter(),
      BASE_NODE_API_PATH,
      {
        unsupportedRoutes: adUnsupportedRoutes,
        unsupportedRouteRejector,
      }
    );
    const mlApiRouter: Router = createRouter(
      core.http.createRouter(),
      '/api/ml',
      {
        allRoutesUnsupported: true,
        unsupportedRouteRejector,
      }
    );
    const forecastApiRouter: Router = createRouter(
      core.http.createRouter(),
      FORECAST_BASE_NODE_API_PATH,
      {
        allRoutesUnsupported: true,
        unsupportedRouteRejector,
      }
    );

    // Register server routes with the service
    registerADRoutes(apiRouter, adService);
    registerAlertingRoutes(apiRouter, alertingService);
    registerMLRoutes(mlApiRouter, mlService);
    registerOpenSearchRoutes(apiRouter, opensearchService);
    registerSampleDataRoutes(apiRouter, sampleDataService);
    registerForecastRoutes(forecastApiRouter, forecastService);
    return {};
  }

  public async start(core: CoreStart, plugins?: ADPluginStartDependencies) {
    // Inject workspace plumbing into services that support ACL enforcement.
    // Keep this resilient to the workspace plugin being absent (e.g., when
    // `workspace.enabled: false` in opensearch_dashboards.yml) — services
    // were constructed in setup() without knowledge of workspaces and
    // default to "allow" when no workspaceStart is supplied.
    const workspaceIdGetter = (request: OpenSearchDashboardsRequest) => {
      try {
        return getWorkspaceState(request).requestWorkspaceId;
      } catch {
        return undefined;
      }
    };

    const servicesWithAcl: Array<MDSEnabledClientService | undefined> = [
      this.services.adService,
      this.services.alertingService,
    ];
    for (const service of servicesWithAcl) {
      if (!service) continue;
      if (plugins?.workspace) service.setWorkspaceStart(plugins.workspace);
      service.setWorkspaceIdGetter(workspaceIdGetter);
    }
    return {};
  }
}
