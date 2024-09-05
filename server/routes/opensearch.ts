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
  ClusterInfo,
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
import { CatAliases } from '@opensearch-project/opensearch/api/requestParams';
import _ from 'lodash';
import { Mappings } from 'public/redux/reducers/opensearch';
import { convertFieldCapsToMappingStructure } from './utils/opensearchHelpers';

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
  apiRouter.get('/_remote/info', opensearchService.getClustersInfo);
  apiRouter.get('/_remote/info/', opensearchService.getClustersInfo);
  apiRouter.get(
    '/_remote/info/{dataSourceId}',
    opensearchService.getClustersInfo
  );
  apiRouter.get(
    '/_indices_and_aliases',
    opensearchService.getIndicesAndAliases
  );
  apiRouter.get(
    '/_indices_and_aliases/{dataSourceId}',
    opensearchService.getIndicesAndAliases
  );
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
    const { index, clusters } = request.query as {
      index: string;
      clusters: string;
    };
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };
    try {
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );
      let indices: CatIndex[] = [];
      let resolve_resp;

      let response: CatIndex[] = await callWithRequest('cat.indices', {
        index,
        format: 'json',
        h: 'health,index',
      });
      response = response.map((item) => ({
        ...item,
        localCluster: true,
      }));

      // only call cat indices
      if (clusters != '') {
        if (index == '') {
          resolve_resp = await callWithRequest('transport.request', {
            method: 'GET',
            path: '/_resolve/index/' + clusters + ':*',
          });
        } else {
          resolve_resp = await callWithRequest('transport.request', {
            method: 'GET',
            path: '/_resolve/index/' + clusters + ':' + index,
          });
        }
        indices = resolve_resp.indices.map((item) => ({
          index: item.name,
          format: 'json',
          health: 'undefined',
          localCluster: false,
        }));

        response = response.concat(indices);
      }

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
    let { indices } = request.query as { indices: string[] };
    // If indices is not an array, convert it to an array, server framework auto converts single item in string array to a string
    if (!Array.isArray(indices)) {
      indices = [indices];
    }
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };

    try {
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      let mappings: Mappings = {};
      let remoteMappings: Mappings = {};
      let localIndices: string[] = indices.filter(
        (index: string) => !index.includes(':')
      );
      let remoteIndices: string[] = indices.filter((index: string) =>
        index.includes(':')
      );

      if (localIndices.length > 0) {
        mappings = await callWithRequest('indices.getMapping', {
          index: localIndices,
        });
      }

      // make call to fields_caps
      if (remoteIndices.length) {
        const fieldCapsResponse = await callWithRequest('transport.request', {
          method: 'GET',
          path:
            remoteIndices.toString() + '/_field_caps?fields=*&include_unmapped',
        });
        remoteMappings = convertFieldCapsToMappingStructure(fieldCapsResponse);
      }
      Object.assign(mappings, remoteMappings);

      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: { mappings: mappings } },
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

  // we use this to retrieve indices and aliases from both the local cluster and remote clusters
  // 3 different OS APIs are called here, _cat/indices, _cat/aliases and _resolve/index
  getIndicesAndAliases = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    const { indexOrAliasQuery, clusters, queryForLocalCluster } =
      request.query as {
        indexOrAliasQuery: string;
        clusters: string;
        queryForLocalCluster: string;
      };
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };
    try {
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );
      let indicesResponse: CatIndex[] = [];
      let aliasesResponse: IndexAlias[] = [];
      if (queryForLocalCluster == 'true') {
        indicesResponse = await callWithRequest('cat.indices', {
          index: indexOrAliasQuery,
          format: 'json',
          h: 'health,index',
        });
        indicesResponse = indicesResponse.map((item) => ({
          ...item,
          localCluster: true,
        }));
        aliasesResponse = await callWithRequest('cat.aliases', {
          alias: indexOrAliasQuery,
          format: 'json',
          h: 'alias,index',
        });

        aliasesResponse = aliasesResponse.map((item) => ({
          ...item,
          localCluster: true,
        }));
      }

      // only call cat indices and cat aliases
      if (clusters != '') {
        let remoteIndices: CatIndex[] = [];
        let remoteAliases: IndexAlias[] = [];
        let resolveResponse;
        const resolveIndexQuery =
          indexOrAliasQuery == ''
            ? clusters
                .split(',')
                .map((cluster) => `${cluster}:*`)
                .join(',')
            : clusters
                .split(',')
                .map((cluster) => `${cluster}:${indexOrAliasQuery}`)
                .join(',');
        resolveResponse = await callWithRequest('transport.request', {
          method: 'GET',
          path: '/_resolve/index/' + resolveIndexQuery,
        });
        remoteIndices = resolveResponse.indices.map((item) => ({
          index: item.name,
          format: 'json',
          health: 'undefined',
          localCluster: false,
        }));

        remoteAliases = resolveResponse.aliases.map((item) => ({
          alias: item.name,
          index: item.indices,
          format: 'json',
          localCluster: false,
        }));
        indicesResponse = indicesResponse.concat(remoteIndices);
        aliasesResponse = aliasesResponse.concat(remoteAliases);
      }

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: { aliases: aliasesResponse, indices: indicesResponse },
        },
      });
    } catch (err) {
      // In case no matching indices is found it throws an error.
      if (
        err.statusCode === 404 &&
        get<string>(err, 'body.error.type', '') === 'index_not_found_exception'
      ) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: { indices: [], aliases: [] } },
        });
      }
      console.log('Anomaly detector - Unable to get indices and aliases', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getClustersInfo = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };
    try {
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      let clustersResponse: ClusterInfo[] = [];

      const remoteInfo = await callWithRequest('transport.request', {
        method: 'GET',
        path: '/_remote/info',
      });
      clustersResponse = Object.keys(remoteInfo).map((key) => ({
        name: key,
        localCluster: false,
      }));

      const clusterHealth = await callWithRequest('cat.health', {
        format: 'json',
        h: 'cluster',
      });

      clustersResponse.push({
        name: clusterHealth[0].cluster,
        localCluster: true,
      });

      return opensearchDashboardsResponse.ok({
        body: { ok: true, response: { clusters: clustersResponse } },
      });
    } catch (err) {
      console.error('Alerting - OpensearchService - getClusterHealth:', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };
}
