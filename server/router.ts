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
// Router factory
export default (iRouter: IRouter, basePath: String): Router => {
  if (basePath == null || basePath == '') {
    throw new TypeError('Base path is null');
  }
  const requestHandler = (handler: RouteHandler) => async (
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
  return ['get', 'put', 'post', 'delete'].reduce(
    (router: any, method: string) => {
      router[method] = (path: String, handler: RouteHandler) => {
        switch (method) {
          case 'get': {
            iRouter.get(
              {
                path: `${basePath}${path}`,
                validate: {
                  params: schema.any(),
                  query: schema.any(),
                  body: schema.any(),
                },
              },
              requestHandler(handler)
            );
            break;
          }
          case 'put': {
            iRouter.put(
              {
                path: `${basePath}${path}`,
                validate: {
                  params: schema.any(),
                  query: schema.any(),
                  body: schema.any(),
                },
              },
              requestHandler(handler)
            );
            break;
          }
          case 'post': {
            iRouter.post(
              {
                path: `${basePath}${path}`,
                validate: {
                  params: schema.any(),
                  query: schema.any(),
                  body: schema.any(),
                },
              },
              requestHandler(handler)
            );
            break;
          }
          case 'delete': {
            iRouter.delete(
              {
                path: `${basePath}${path}`,
                validate: {
                  params: schema.any(),
                  query: schema.any(),
                  body: schema.any(),
                },
              },
              requestHandler(handler)
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
