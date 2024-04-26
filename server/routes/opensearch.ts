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

import { get } from 'lodash';
import { SearchResponse } from '../models/interfaces';
import {
  CatIndex,
  GetAliasesResponse,
  GetIndicesResponse,
  GetMappingResponse,
  IndexAlias,
  ServerResponse,
} from '../models/types';
import { Router } from '../router';
import { getErrorMessage, isIndexNotFoundError } from './utils/adHelpers';
import {
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
} from '../../../../src/core/server';
import { getClientBasedOnDataSource } from '../utils/helpers';

type SearchParams = {
  index: string;
  size: number;
  body: object;
};

export function registerOpenSearchRoutes(
  apiRouter: Router,
  opensearchService: OpenSearchService
) {
  apiRouter.get('/_indices', opensearchService.getIndices);
  apiRouter.get('/_indices/{dataSourceId}', opensearchService.getIndices);

  apiRouter.get('/_aliases', opensearchService.getAliases);
  apiRouter.get('/_aliases/{dataSourceId}', opensearchService.getAliases);

  apiRouter.get('/_mappings', opensearchService.getMapping);
  apiRouter.get('/_mappings/{dataSourceId}', opensearchService.getMapping);

  apiRouter.post('/_search', opensearchService.executeSearch);

  apiRouter.put('/create_index', opensearchService.createIndex);
  apiRouter.put('/create_index/{dataSourceId}', opensearchService.createIndex);

  apiRouter.post('/bulk', opensearchService.bulk);
  apiRouter.post('/bulk/{dataSourceId}', opensearchService.bulk);

  apiRouter.post('/delete_index', opensearchService.deleteIndex);
}

export default class OpenSearchService {
  private client: any;
  dataSourceEnabled: boolean;

  constructor(client: any, dataSourceEnabled: boolean) {
    this.client = client;
    this.dataSourceEnabled = dataSourceEnabled;
  }

  executeSearch = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const {
        index,
        query,
        size = 0,
        sort = undefined,
        collapse = undefined,
        aggs = undefined,
        rawQuery = undefined,
      } = request.body as {
        index: string;
        query?: object;
        size?: number;
        sort?: object;
        collapse?: object;
        aggs?: object;
        rawQuery: object;
      };
      const requestBody = rawQuery
        ? rawQuery
        : {
            query: query,
            ...(sort !== undefined && { sort: sort }),
            ...(collapse !== undefined && { collapse: collapse }),
            ...(aggs !== undefined && { aggs: aggs }),
          };

      const params: SearchParams = { index, size, body: requestBody };

      const results: SearchResponse<any> = await this.client
        .asScoped(request)
        .callAsCurrentUser('search', params);

      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: results },
      });
    } catch (err) {
      console.error('Anomaly detector - Unable to execute search', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getIndices = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    const { index } = request.query as { index: string };
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };
    try {
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response: CatIndex[] = await callWithRequest('cat.indices', {
        index,
        format: 'json',
        h: 'health,index',
      });

      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: { indices: response } },
      });
    } catch (err) {
      // In case no matching indices is found it throws an error.
      if (
        err.statusCode === 404 &&
        get<string>(err, 'body.error.type', '') === 'index_not_found_exception'
      ) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: { indices: [] } },
        });
      }
      console.log('Anomaly detector - Unable to get indices', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getAliases = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    const { alias } = request.query as { alias: string };
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };

    try {
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response: IndexAlias[] = await callWithRequest('cat.aliases', {
        alias,
        format: 'json',
        h: 'alias,index',
      });
      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: { aliases: response } },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to get aliases', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  createIndex = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };

    //@ts-ignore
    const index = request.body.index;
    //@ts-ignore
    const body = request.body.body;
    const callWithRequest = getClientBasedOnDataSource(
      context,
      this.dataSourceEnabled,
      request,
      dataSourceId,
      this.client
    );
    try {
      await callWithRequest('indices.create', {
        index: index,
        body: body,
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to create index', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
    try {
      const response: CatIndex[] = await callWithRequest('cat.indices', {
        index,
        format: 'json',
        h: 'health,index',
      });
      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: { indices: response } },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to get indices', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  bulk = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };
    const body = request.body;
    try {
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response: any = await callWithRequest('bulk', {
        body: body,
      });
      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: { response } },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to perform bulk action', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  deleteIndex = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    const index = request.query as { index: string };
    try {
      await callWithRequest('indices.delete', {
        index: index,
      });
    } catch (err) {
      console.log(
        'Anomaly detector - Unable to perform delete index action',
        err
      );
      // Ignore the error if it's an index_not_found_exception
      if (!isIndexNotFoundError(err)) {
        return opensearchDashboardsResponse.ok({
          body: {
            ok: false,
            error: getErrorMessage(err),
          },
        });
      }
    }
    try {
      const response: CatIndex[] = await this.client
        .asScoped(request)
        .callAsCurrentUser('cat.indices', {
          index,
          format: 'json',
          h: 'health,index',
        });
      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: { indices: response } },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to get indices', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getMapping = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    const { index } = request.query as { index: string };
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };

    try {
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response = await callWithRequest(
        'indices.getMapping', {
          index,
        });
      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: { mappings: response } },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to get mappings', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };
}
