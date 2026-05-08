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
  IRouter,
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
} from '../../../src/core/server';
import { schema } from '@osd/config-schema';

type RouteHandler = (
  context: RequestHandlerContext,
  request: OpenSearchDashboardsRequest,
  response: OpenSearchDashboardsResponseFactory
) => Promise<IOpenSearchDashboardsResponse<any>>;

type Route = (path: string, handler: RouteHandler) => Router;

export interface Router {
  get: Route;
  post: Route;
  put: Route;
  delete: Route;
}

/**
 * Callback invoked for routes registered in `unsupportedRoutes`. When it
 * returns a response (rather than undefined) the wrapped handler is
 * short-circuited and that response is returned to the client. Used to
 * serve 501 Not Implemented for API paths that do not exist on the
 * serverless AD data plane (see `plugin.ts` for the configured set).
 *
 * This is the same pattern as alerting-dashboards-plugin#1415's
 * `guardedRouter` — adapted to fit AD's existing router factory instead of
 * wrapping the raw `IRouter` at the call site.
 */
export type UnsupportedRouteRejector = (
  context: RequestHandlerContext,
  request: OpenSearchDashboardsRequest,
  response: OpenSearchDashboardsResponseFactory
) => Promise<IOpenSearchDashboardsResponse<any> | undefined>;

export interface RouterOptions {
  /**
   * Routes registered through the returned Router whose METHOD + path match
   * an entry in this set will be wrapped with `unsupportedRouteRejector`.
   * Entries are compared as `${METHOD} ${basePath}${path}` strings, so
   * callers should include the base path in the entry.
   */
  unsupportedRoutes?: Set<string>;
  /**
   * When true, every route registered through this router is wrapped with
   * `unsupportedRouteRejector`. Takes precedence over `unsupportedRoutes`.
   * Use this when an entire subtree (e.g., `/api/ml/*`, `/api/forecasts/*`)
   * is unsupported on the target endpoint.
   */
  allRoutesUnsupported?: boolean;
  unsupportedRouteRejector?: UnsupportedRouteRejector;
}

// Router factory
export default (
  iRouter: IRouter,
  basePath: String,
  options: RouterOptions = {}
): Router => {
  if (basePath == null || basePath == '') {
    throw new TypeError('Base path is null');
  }
  const { unsupportedRoutes, allRoutesUnsupported, unsupportedRouteRejector } =
    options;

  const requestHandler =
    (handler: RouteHandler) =>
    async (
      context: RequestHandlerContext,
      request: OpenSearchDashboardsRequest,
      response: OpenSearchDashboardsResponseFactory
    ) => {
      try {
        return await handler(context, request, response);
      } catch (e) {
        throw e;
      }
    };

  // Wrap a handler so that when the route matches `unsupportedRoutes` (or
  // `allRoutesUnsupported` is set), the rejector runs first; a non-undefined
  // rejector result short-circuits the handler. If the rejector is absent,
  // the handler is returned unchanged (zero overhead on non-serverless paths).
  const maybeGuard =
    (method: string, fullPath: string) =>
    (handler: RouteHandler): RouteHandler => {
      if (!unsupportedRouteRejector) return handler;
      const matches =
        allRoutesUnsupported ||
        (unsupportedRoutes &&
          unsupportedRoutes.has(`${method.toUpperCase()} ${fullPath}`));
      if (!matches) return handler;
      return async (context, request, response) => {
        const rejection = await unsupportedRouteRejector(
          context,
          request,
          response
        );
        if (rejection) return rejection;
        return handler(context, request, response);
      };
    };

  return ['get', 'put', 'post', 'delete'].reduce(
    (router: any, method: string) => {
      router[method] = (path: String, handler: RouteHandler) => {
        const fullPath = `${basePath}${path}`;
        const wrappedHandler = maybeGuard(method, fullPath)(handler);
        switch (method) {
          case 'get': {
            iRouter.get(
              {
                path: fullPath,
                validate: {
                  params: schema.any(),
                  query: schema.any(),
                },
              },
              requestHandler(wrappedHandler)
            );
            break;
          }
          case 'put': {
            iRouter.put(
              {
                path: fullPath,
                validate: {
                  params: schema.any(),
                  query: schema.any(),
                  body: schema.any(),
                },
              },
              requestHandler(wrappedHandler)
            );
            break;
          }
          case 'post': {
            iRouter.post(
              {
                path: fullPath,
                validate: {
                  params: schema.any(),
                  query: schema.any(),
                  body: schema.any(),
                },
              },
              requestHandler(wrappedHandler)
            );
            break;
          }
          case 'delete': {
            iRouter.delete(
              {
                path: fullPath,
                validate: {
                  params: schema.any(),
                  query: schema.any(),
                  body: schema.any(),
                },
              },
              requestHandler(wrappedHandler)
            );
            break;
          }
          default: {
            break;
          }
        }
      };
      return router;
    },
    {}
  );
};
