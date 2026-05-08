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
  ILegacyClusterClient,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  RequestHandlerContext,
} from '../../../../src/core/server';

/**
 * Subset of the OpenSearch Dashboards Workspace plugin's start contract that
 * the AD plugin depends on for serverless / workspace-ACL enforcement.
 *
 * `aclEnforceEndpointPatterns` is the list of data-source endpoint substrings
 * that require ACL enforcement (e.g., AOSS collection hostnames). It is
 * configured via `workspace.aclEnforceEndpointPatterns` in
 * opensearch_dashboards.yml and exposed via `WorkspacePluginStart` (introduced
 * by OSD core PR #11770). When the OSD version in use predates that PR the
 * attribute will be absent and this file treats the plugin as if the list
 * were empty (no endpoints require ACL enforcement, so all requests pass
 * through unchanged).
 */
export interface WorkspaceAuthorizer {
  authorizeWorkspace: (
    request: OpenSearchDashboardsRequest,
    workspaceIds: string[],
    permissionModes?: string[]
  ) => Promise<
    | { authorized: true }
    | { authorized: false; unauthorizedWorkspaces: string[] }
  >;
  /** Optional — not present in older OSD versions. */
  aclEnforceEndpointPatterns?: string[];
}

/**
 * Shared base class for AD server services that need to enforce workspace
 * ACLs on per-handler request boundaries and reject API calls that are not
 * supported on an enforced endpoint (e.g., OpenSearch Serverless).
 *
 * This mirrors the pattern established by
 * alerting-dashboards-plugin's `MDSEnabledClientService` (see PR
 * opensearch-project/alerting-dashboards-plugin#1415). The two key
 * differences from Alerting's implementation are:
 *   1. This is TypeScript rather than JavaScript — AD's server code is TS.
 *   2. The constructor signature matches the existing AD services
 *      (`client: any, dataSourceEnabled: boolean`) so subclasses can migrate
 *      without changing their registration sites.
 *
 * Workspace plumbing (`workspaceStart` and `workspaceIdGetter`) is injected
 * post-construction from `plugin.ts#start()`, so services remain
 * instantiable without the workspace plugin (e.g., in unit tests or on
 * environments without workspaces configured).
 */
export abstract class MDSEnabledClientService {
  private workspaceStart?: WorkspaceAuthorizer;
  private workspaceIdGetter?: (
    request: OpenSearchDashboardsRequest
  ) => string | undefined;

  constructor(
    // `any` is preserved from the pre-existing AD service signatures rather
    // than narrowed to `ILegacyClusterClient` — narrowing would require
    // changes at every `new AdService(client, ...)` call site. The client is
    // only used by subclasses, so the looser typing is confined here.
    protected client: any,
    public dataSourceEnabled: boolean
  ) {}

  public setWorkspaceStart(workspaceStart: WorkspaceAuthorizer) {
    this.workspaceStart = workspaceStart;
  }

  public setWorkspaceIdGetter(
    fn: (request: OpenSearchDashboardsRequest) => string | undefined
  ) {
    this.workspaceIdGetter = fn;
  }

  private get aclEndpointPatterns(): string[] {
    return this.workspaceStart?.aclEnforceEndpointPatterns ?? [];
  }

  /**
   * Resolve the data source endpoint URL for the current request by reading
   * the `data-source` saved object. Returns undefined when the request is
   * targeting the local cluster (no dataSourceId) or when the saved object
   * lookup fails.
   *
   * Accepts dataSourceId from either request.query or request.params because
   * AD's routes carry the id in different positions depending on the handler
   * (query param for list APIs, path param for per-detector APIs).
   */
  private async getDataSourceEndpoint(
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest
  ): Promise<string | undefined> {
    const dataSourceId =
      (request.query as any)?.dataSourceId ||
      (request.params as any)?.dataSourceId;
    if (!dataSourceId) return undefined;
    try {
      const dataSource = await context.core.savedObjects.client.get(
        'data-source',
        dataSourceId.toString()
      );
      return (dataSource.attributes as any).endpoint as string | undefined;
    } catch {
      return undefined;
    }
  }

  private matchesAclPattern(endpoint: string): boolean {
    return this.aclEndpointPatterns.some((pattern) =>
      endpoint.includes(pattern)
    );
  }

  /**
   * True when the request targets an endpoint that requires ACL enforcement
   * (i.e., a serverless collection). Safe to call when workspace plumbing is
   * unavailable — returns false in that case.
   */
  protected async isUnsupportedEndpoint(
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest
  ): Promise<boolean> {
    if (!this.aclEndpointPatterns.length) return false;
    const endpoint = await this.getDataSourceEndpoint(context, request);
    return endpoint ? this.matchesAclPattern(endpoint) : false;
  }

  /**
   * Return a 501 Not Implemented response when the request targets an
   * ACL-enforced endpoint. Intended for the guarded-router wrapper in
   * `server/router.ts`, which drapes this check over routes the AD backend
   * plugin does not expose on serverless (`/api/ml/*`, `/api/forecasts/*`,
   * sample data, insights, etc.).
   */
  public async rejectIfUnsupported(
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory
  ): Promise<any | undefined> {
    if (await this.isUnsupportedEndpoint(context, request)) {
      return response.custom({
        statusCode: 501,
        body: { message: 'This operation is not supported on this endpoint.' },
      });
    }
    return undefined;
  }

  /**
   * Enforce workspace ACL for the current request. Returns a 401 Unauthorized
   * response when the caller lacks `permissionModes` on their active workspace;
   * returns undefined when the caller is authorized (or when no workspace
   * enforcement is configured for this endpoint). Callers should early-return
   * the response if defined.
   *
   * Default mode is `['read']` — callers should override with `['library_write']`
   * for write operations and `['library_write', 'library_read']` for reads
   * that should be visible to workspace viewers.
   */
  public async enforceWorkspaceAcl(
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    response: OpenSearchDashboardsResponseFactory,
    permissionModes: string[] = ['read']
  ): Promise<any | undefined> {
    const authorized = await this.checkWorkspaceAcl(
      context,
      request,
      permissionModes
    );
    if (!authorized) {
      return response.unauthorized({
        body: { message: 'Workspace ACL check failed: unauthorized' },
      });
    }
    return undefined;
  }

  private async checkWorkspaceAcl(
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    permissionModes: string[]
  ): Promise<boolean> {
    // Only enforce ACL for requests that target an ACL-enforced endpoint.
    const endpoint = await this.getDataSourceEndpoint(context, request);
    if (!endpoint || !this.matchesAclPattern(endpoint)) return true;

    const workspaceId = this.workspaceIdGetter?.(request);
    // If no workspace context is attached to the request, fall open. The
    // workspace plugin itself rejects workspace-scoped requests that lack a
    // workspace id; requests without a workspace id are out of workspace
    // scope and not subject to library_read / library_write enforcement.
    if (!workspaceId || !this.workspaceStart) return true;

    const result = await this.workspaceStart.authorizeWorkspace(
      request,
      [workspaceId],
      permissionModes
    );
    return result.authorized;
  }
}
