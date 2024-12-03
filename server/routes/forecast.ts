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

import { get, orderBy, isEmpty } from 'lodash';
import { SearchResponse } from '../models/interfaces';
import {
  ForecastResult,
  Forecaster,
  FeatureResult,
  GetForecastersQueryParams,
} from '../models/types';
import { Router } from '../router';
import {
  SORT_DIRECTION,
  CUSTOM_FORECAST_RESULT_INDEX_PREFIX,
  CUSTOM_FORECAST_RESULT_INDEX_WILDCARD,
  FORECASTER_DOC_FIELDS,
} from '../utils/constants';
import {
  getClientBasedOnDataSource,
  toFixedNumberForForecast,
} from '../utils/helpers';
import {
  convertForecastKeysToCamelCase,
  convertForecastKeysToSnakeCase,
  isIndexNotFoundError,
  getErrorMessage,
  getLatestForecasterTasksQuery,
  buildEntityListQuery,
  convertStaticFieldsToCamelCase,
  convertTaskAndJobFieldsToCamelCase,
  combineTaskState,
} from './utils/forecastHelpers';
import { isNumber, set } from 'lodash';
import {
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
} from '../../../../src/core/server';

type PutForecasterParams = {
  forecasterId: string;
  ifSeqNo?: string;
  ifPrimaryTerm?: string;
  body: string;
};


export function registerForecastRoutes(apiRouter: Router, forecastService: ForecastService) {
  // create forecaster
  apiRouter.post('/forecasters', forecastService.putForecaster);
  apiRouter.post('/forecasters/{dataSourceId}', forecastService.putForecaster);

  // put forecaster
  apiRouter.put('/forecasters/{forecasterId}', forecastService.putForecaster);
  apiRouter.put(
    '/forecasters/{forecasterId}/{dataSourceId}',
    forecastService.putForecaster
  );

  // FIXME: routes not used in the UI, therefore no data source id
  apiRouter.post('/forecasters/_search', forecastService.searchForecaster);

  /**
   * Search forecast results routes
   * 
   * We use 'by-source' and 'by-index' path segments to avoid route conflicts between
   * paths with different parameter types. Without these segments, routes like:
   *   /forecasters/results/_search/{resultIndex}
   *   /forecasters/results/_search/{dataSourceId}
   * would conflict because OpenSearch can't distinguish between parameter types in the same position.
   * 
   * Current route structure:
   * 1. Search by source (no params)     : /by-source/_search
   * 2. Search by source with ID         : /by-source/{dataSourceId}/_search
   * 3. Search by index pattern          : /by-index/{resultIndex}/_search
   * 4. Search by both index and source  : /by-index/{resultIndex}/by-source/{dataSourceId}/_search
   */

  // Search with no parameters
  apiRouter.post('/forecasters/results/by-source/_search', forecastService.searchResults);

  // Search by data source ID
  apiRouter.post(
    '/forecasters/results/by-source/{dataSourceId}/_search',
    forecastService.searchResults
  );

  // Search by result index pattern
  apiRouter.post(
    '/forecasters/results/by-index/{resultIndex}/_search',
    forecastService.searchResults
  );

  // Search by both result index and data source ID
  apiRouter.post(
    '/forecasters/results/by-index/{resultIndex}/by-source/{dataSourceId}/_search',
    forecastService.searchResults
  );

  // list forecasters
  apiRouter.get('/forecasters/_list', forecastService.getForecasters);
  apiRouter.get('/forecasters/_list/{dataSourceId}', forecastService.getForecasters);

  // run once forecaster
  apiRouter.post('/forecasters/{forecasterId}/_run_once', forecastService.runOnceForecaster);
  apiRouter.post('/forecasters/{forecasterId}/_run_once/{dataSourceId}', forecastService.runOnceForecaster);

  // get forecaster forecast results
  apiRouter.get(
    '/forecasters/{id}/results/{isRunOnce}/{resultIndex}',
    forecastService.getForecastResults
  );
  apiRouter.get(
    '/forecasters/{id}/results/{isRunOnce}/{resultIndex}/{dataSourceId}',
    forecastService.getForecastResults
  );

  // delete forecaster
  apiRouter.delete('/forecasters/{forecasterId}', forecastService.deleteForecaster);
  apiRouter.delete(
    '/forecasters/{forecasterId}/{dataSourceId}',
    forecastService.deleteForecaster
  );

  // start forecaster
  apiRouter.post('/forecasters/{forecasterId}/start', forecastService.startForecaster);
  apiRouter.post(
    '/forecasters/{forecasterId}/start/{dataSourceId}',
    forecastService.startForecaster
  );

  // stop forecaster
  apiRouter.post(
    '/forecasters/{forecasterId}/stop',
    forecastService.stopForecaster
  );
  apiRouter.post(
    '/forecasters/{forecasterId}/stop/{dataSourceId}',
    forecastService.stopForecaster
  );

  apiRouter.get(
    '/forecasters/{forecasterId}/_profile',
    forecastService.getForecasterProfile
  );

  // get forecaster
  apiRouter.get('/forecasters/{forecasterId}', forecastService.getForecaster);
  apiRouter.get(
    '/forecasters/{forecasterId}/{dataSourceId}',
    forecastService.getForecaster
  );

  // match forecaster
  apiRouter.get('/forecasters/{forecasterName}/_match', forecastService.matchForecaster);
  apiRouter.get('/forecasters/{forecasterName}/_match/{dataSourceId}', forecastService.matchForecaster);

  // get forecaster count
  apiRouter.get('/forecasters/_count', forecastService.getForecasterCount);
  apiRouter.get('/forecasters/_count/{dataSourceId}', forecastService.getForecasterCount);

  // post get top forecast results
  apiRouter.post(
    '/forecasters/{forecasterId}/_topForecasts/{isRunOnce}',
    forecastService.getTopForecastResults
  );
  apiRouter.post(
    '/forecasters/{forecasterId}/_topForecasts/{isRunOnce}/{dataSourceId}',
    forecastService.getTopForecastResults
  );

  // validate forecaster
  apiRouter.post(
    '/forecasters/_validate/{validationType}',
    forecastService.validateForecaster
  );
  apiRouter.post(
    '/forecasters/_validate/{validationType}/{dataSourceId}',
    forecastService.validateForecaster
  );

  // suggest forecaster
  apiRouter.post(
    '/forecasters/_suggest/{suggestType}',
    forecastService.suggestForecaster
  );
  apiRouter.post(
    '/forecasters/_suggest/{suggestType}/{dataSourceId}',
    forecastService.suggestForecaster
  );
}

export default class ForecastService {
  private client: any;
  dataSourceEnabled: boolean;

  constructor(client: any, dataSourceEnabled: boolean) {
    this.client = client;
    this.dataSourceEnabled = dataSourceEnabled;
  }

  deleteForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { forecasterId } = request.params as { forecasterId: string };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };
      // dataSourceId will be "" and fall back to use the existing client for local cluster
      // On the other hand, in MDS world, the open search legacy client (this.client) will
      // be undefined and it will pickup the data source client 
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response = await callWithRequest('forecast.deleteForecaster', {
        forecasterId,
      });

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - deleteForecaster', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  runOnceForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { forecasterId = '', dataSourceId = '' } = request.params as { forecasterId?: string, dataSourceId?: string };

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );
      const response = await callWithRequest(
        'forecast.runOnceForecaster', {
        forecasterId,
      });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          // return taskId
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - runOnceForecaster', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  putForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { forecasterId } = request.params as { forecasterId: string };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      //@ts-ignore
      const ifSeqNo = request.body.seqNo;
      //@ts-ignore
      const ifPrimaryTerm = request.body.primaryTerm;

      const requestBody = JSON.stringify(
        convertForecastKeysToSnakeCase(request.body)
      );

      console.log('create forecaster requestBody', requestBody);

      let params: PutForecasterParams = {
        forecasterId: forecasterId,
        ifSeqNo: ifSeqNo,
        ifPrimaryTerm: ifPrimaryTerm,
        body: requestBody,
      };
      let response;

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      console.log('params', params);

      if (isNumber(ifSeqNo) && isNumber(ifPrimaryTerm)) {
        response = await callWithRequest('forecast.updateForecaster', params);
      } else {
        response = await callWithRequest('forecast.createForecaster', {
          body: params.body,
        });
      }
      const resp = {
        ...response.forecaster,
        id: response._id,
        primaryTerm: response._primary_term,
        seqNo: response._seq_no,
      };
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: convertForecastKeysToCamelCase(resp) as Forecaster,
        },
      });
    } catch (err) {
      console.log('Forecast - PutForecaster', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  validateForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      let { validationType } = request.params as {
        validationType: string;
      };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const requestBody = JSON.stringify(
        convertForecastKeysToSnakeCase(request.body)
      );
      console.log('requestBody', requestBody);
      const response = await callWithRequest(
        'forecast.validateForecaster', {
        body: requestBody,
        validationType: validationType,
      });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - validateForecaster', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  suggestForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      let { suggestType } = request.params as {
        suggestType: string;
      };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const requestBody = JSON.stringify(
        convertForecastKeysToSnakeCase(request.body)
      );
      const response = await callWithRequest(
        'forecast.suggestForecaster', {
        body: requestBody,
        suggestType: suggestType,
      });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - suggestForecaster', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { forecasterId } = request.params as { forecasterId: string };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const forecasterResponse = await callWithRequest('forecast.getForecaster', {
        forecasterId,
      });

      // Populating static forecaster fields
      const staticFields = {
        id: forecasterResponse._id,
        primaryTerm: forecasterResponse._primary_term,
        seqNo: forecasterResponse._seq_no,
        // the backend returns a response with forecaster field.
        ...convertStaticFieldsToCamelCase(forecasterResponse.forecaster),
      };

      // Get real-time and run-once task info to populate the
      // task and job-related fields
      // We wrap these calls in a try/catch, and suppress any index_not_found_exceptions
      // which can occur if no forecaster jobs have been ran on a new cluster.
      // let realtimeTasksResponse = {} as any;
      // let runOnceTasksResponse = {} as any;
      // try {
      //   const callWithRequest = getClientBasedOnDataSource(
      //     context,
      //     this.dataSourceEnabled,
      //     request,
      //     dataSourceId,
      //     this.client
      //   );

      //   realtimeTasksResponse = await callWithRequest('forecast.searchTasks', {
      //     body: getLatestTaskForForecasterQuery(forecasterId, true),
      //   });

      //   runOnceTasksResponse = await callWithRequest('forecast.searchTasks', {
      //     body: getLatestTaskForForecasterQuery(forecasterId, false),
      //   });
      // } catch (err) {
      //   if (!isIndexNotFoundError(err)) {
      //     throw err;
      //   }
      // }

      // const realtimeTask = get(
      //   get(realtimeTasksResponse, 'hits.hits', []).map((taskResponse: any) => {
      //     return {
      //       id: get(taskResponse, '_id'),
      //       ...get(taskResponse, '_source'),
      //     };
      //   }),
      //   0
      // );
      // const runOnceTask = get(
      //   get(runOnceTasksResponse, 'hits.hits', []).map(
      //     (taskResponse: any) => {
      //       return {
      //         id: get(taskResponse, '_id'),
      //         ...get(taskResponse, '_source'),
      //       };
      //     }
      //   ),
      //   0
      // );

      const taskAndJobFields = convertTaskAndJobFieldsToCamelCase(
        forecasterResponse.realtime_task,
        forecasterResponse.run_once_task,
        forecasterResponse.forecaster_job
      );

      // Combine the static and task-and-job-related fields into
      // a final response
      const finalResponse = {
        ...staticFields,
        ...taskAndJobFields,
      };

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: finalResponse,
        },
      });
    } catch (err) {
      // if the forecaster is not found (e.g., deleted while on the detail page), return an empty response
      // this is to avoid the error message from the frontend where the forecaster is not found
      // the error is triggered by useEffect of useFetchForecasterInfo in ForecasterDetail
      if (
        err.statusCode === 404
      ) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: {} },
        });
      }
      console.log('Forecast - Unable to get forecaster', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  startForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { forecasterId } = request.params as { forecasterId: string };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };
      //@ts-ignore
      const startTime = request.body?.startTime;
      //@ts-ignore
      const endTime = request.body?.endTime;
      let requestParams = { forecasterId: forecasterId } as {};
      let requestPath = 'forecast.startForecaster';

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response = await callWithRequest(requestPath, requestParams);

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - startForecaster', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  stopForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      // Extract required parameters with specific type assertion.
      // 'forecasterId' is expected to always be present in the route path.
      let { forecasterId } = request.params as {
        forecasterId: string;
      };
      // Extract optional parameters separately.
      // 'dataSourceId' might be missing from the route path (hence '?').
      // Provide a default value ('') if it's not present using destructuring default assignment.
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      const requestPath = 'forecast.stopForecaster';

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response = await callWithRequest(requestPath, {
        forecasterId: forecasterId,
      });

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - stopForecaster', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getForecasterProfile = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { forecasterId } = request.params as { forecasterId: string };
      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser('forecast.forecasterProfile', {
          forecasterId,
        });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response,
        },
      });
    } catch (err) {
      console.log('Forecast - forecasterProfile', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  searchForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const requestBody = JSON.stringify(request.body);
      const response: SearchResponse<Forecaster> = await this.client
        .asScoped(request)
        .callAsCurrentUser('forecast.searchForecaster', { body: requestBody });
      const totalForecasters = get(response, 'hits.total.value', 0);
      const forecasters = get(response, 'hits.hits', []).map((forecaster: any) => ({
        ...convertForecastKeysToCamelCase(forecaster._source),
        id: forecaster._id,
        seqNo: forecaster._seq_no,
        primaryTerm: forecaster._primary_term,
      }));
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: {
            totalForecasters,
            forecasters,
          },
        },
      });
    } catch (err) {
      console.log('Forecast - Unable to search forecasters', err);
      if (isIndexNotFoundError(err)) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: { totalForecasters: 0, forecasters: [] } },
        });
      }
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getForecasters = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      console.log("request.query", request.query);
      const {
        dataSourceId = '',
      } = request.params as { dataSourceId?: string };

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );
      const response = await callWithRequest('forecast.searchForecaster', {
        body: {},
      });
      console.log('response', JSON.stringify(response));
      const totalForecasters = get(response, 'hits.total.value', 0);

      //Get all forecasters from search forecaster API
      const allForecasters = get(response, 'hits.hits', []).reduce(
        (acc: any, forecasterResponse: any) => ({
          ...acc,
          [forecasterResponse._id]: {
            id: forecasterResponse._id,
            primaryTerm: forecasterResponse._primary_term,
            seqNo: forecasterResponse._seq_no,
            ...convertStaticFieldsToCamelCase(forecasterResponse._source),
          },
        }),
        {}
      );
      console.log('allForecasters', JSON.stringify(allForecasters));

      // Fetch the latest realtime and runOnce tasks for all forecasters
      // using terms aggregations
      // We wrap these calls in a try/catch, and suppress any index_not_found_exceptions
      // which can occur if no forecaster jobs have been ran on a new cluster.
      let realtimeTasksResponse = {} as any;
      let runOnceTasksResponse = {} as any;
      try {
        realtimeTasksResponse = await callWithRequest('forecast.searchTasks', {
          body: getLatestForecasterTasksQuery(true),
        });
        runOnceTasksResponse = await callWithRequest('forecast.searchTasks', {
          body: getLatestForecasterTasksQuery(false),
        });
      } catch (err) {
        if (!isIndexNotFoundError(err)) {
          throw err;
        }
      }

      const realtimeTasks = get(
        realtimeTasksResponse,
        'aggregations.forecasters.buckets',
        []
      ).reduce((acc: any, bucket: any) => {
        return {
          ...acc,
          [bucket.key]: {
            realtimeTask: get(bucket, 'latest_tasks.hits.hits.0', undefined),
          },
        };
      }, {});

      const runOnceTasks = get(
        runOnceTasksResponse,
        'aggregations.forecasters.buckets',
        []
      ).reduce((acc: any, bucket: any) => {
        return {
          ...acc,
          [bucket.key]: {
            runOnceTask: get(bucket, 'latest_tasks.hits.hits.0', undefined),
          },
        };
      }, {});

      // Get real-time and runOnce task info by looping through each forecaster & retrieving
      //    - curState by getting real-time task state
      //    - enabledTime by getting real-time task's execution_start time
      //    - taskId by getting historical task's _id
      const forecastersArray = Object.values(allForecasters);
      forecastersArray.forEach((forecaster: any) => {
        const realtimeTask = get(
          realtimeTasks[forecaster.id],
          'realtimeTask._source'
        );
        const runOnceTask = get(
          runOnceTasks[forecaster.id],
          'runOnceTask._source'
        );

        forecaster.curState = combineTaskState(realtimeTask, runOnceTask);
        forecaster.realTimeLastUpdateTime = get(realtimeTask, 'last_update_time');
        forecaster.runOnceLastUpdateTime = get(runOnceTask, 'last_update_time');
        forecaster.stateError = get(realtimeTask, 'error') || get(runOnceTask, 'error');
      });

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: {
            totalForecasters: totalForecasters,
            forecasterList: forecastersArray,
          },
        },
      });
    } catch (err) {
      console.log('Forecaster - Unable to search forecasters', err);
      if (isIndexNotFoundError(err)) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: { totalForecasters: 0, forecasterList: [] } },
        });
      }
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getForecastResults = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    let { id, isRunOnce, resultIndex,  } =
      request.params as {
        id: string;
        isRunOnce: any;
        resultIndex: string;
      };
    console.log("getForecastResults request.params", request.params);
    const { dataSourceId = '' } = request.params as { dataSourceId?: string };

    if (!resultIndex) {
      // Not strictly querying custom ⇒ default to ''
      resultIndex = '';
    } else if (!resultIndex.startsWith(CUSTOM_FORECAST_RESULT_INDEX_PREFIX)) {
      // If resultIndex is given but not valid, revert to default
      resultIndex = '';
    }

    isRunOnce = JSON.parse(isRunOnce);

    // Search by task id if runOnce, or by forecaster id if realtime
    const searchTerm = isRunOnce ? { task_id: id } : { forecaster_id: id };

    try {
      const {
        size = 20,
        sortDirection = SORT_DIRECTION.DESC,
        sortField = FORECASTER_DOC_FIELDS.DATA_START_TIME,
        startTime = 0,
        endTime = 0,
        fieldName = '',
        entityList = '',
        dawnEpoch = 0,
        maxEntities = 0,
      } = request.query as {
        size: number;
        sortDirection: SORT_DIRECTION;
        sortField?: string;
        startTime: number;
        endTime: number;
        fieldName: string;
        entityList: string;
        dawnEpoch: number;
        maxEntities?: number; // we default to 0 if not provided
      };

      //Allowed sorting columns
      const sortQueryMap = {
        [FORECASTER_DOC_FIELDS.DATA_START_TIME]: {
          [FORECASTER_DOC_FIELDS.DATA_START_TIME]: sortDirection,
        },
        [FORECASTER_DOC_FIELDS.DATA_END_TIME]: {
          [FORECASTER_DOC_FIELDS.DATA_END_TIME]: sortDirection,
        },
      } as { [key: string]: object };
      let sort = {};
      const sortQuery = sortQueryMap[sortField];
      if (sortQuery) {
        sort = sortQuery;
      }

      //Preparing search request
      const requestBody = {
        sort,
        size,
        query: {
          bool: {
            filter: [
              {
                term: searchTerm,
              },
            ],
          },
        },
      };

      // If querying RT results: remove any results that include a task_id, as this indicates
      // a runOnce result from a runOnce task.
      if (!isRunOnce) {
        requestBody.query.bool = {
          ...requestBody.query.bool,
          ...{
            must_not: {
              exists: {
                field: 'task_id',
              },
            },
          },
        };
      }

      try {
        // Get current number of filters to determine the index for adding new date range filter
        // This includes the initial term filter and any entity filters that were added
        let filterSize = requestBody.query.bool.filter.length;
        if (fieldName) {
          (startTime || endTime) &&
            set(
              requestBody.query.bool.filter,
              `${filterSize}.range.${fieldName}.format`,
              'epoch_millis'
            );

          startTime &&
            set(
              requestBody.query.bool.filter,
              `${filterSize}.range.${fieldName}.gte`,
              startTime
            );

          endTime &&
            set(
              requestBody.query.bool.filter,
              `${filterSize}.range.${fieldName}.lte`,
              endTime
            );
        }

        filterSize = requestBody.query.bool.filter.length;

        // Add dawnEpoch filter if it exists
        if (dawnEpoch > 0) {
          set(
            requestBody.query.bool.filter,
            `${filterSize}.range.${FORECASTER_DOC_FIELDS.EXECUTION_END_TIME}.gte`,
            dawnEpoch
          );
        }
      } catch (error) {
        console.log('wrong date range filter', error);
      }

      // ─────────────────────────────────────────────────────────────
      // If maxEntities > 0, find top N entity_ids.
      // ─────────────────────────────────────────────────────────────
      let restrictedEntityIds: string[] = [];

      if (maxEntities > 0) {
        const entityListAsObj =
          entityList.length === 0 ? {} : JSON.parse(entityList);
        console.log('entityListAsObj', entityList, entityListAsObj);

        const entityFilters = isEmpty(entityListAsObj)
          ? {}
          : buildEntityListQuery(entityListAsObj);

        // Only clone and modify requestBody if entityFilters exists and is not empty/null
        let queryForAggregation;
        if (entityFilters && typeof entityFilters === 'object' && Object.keys(entityFilters).length > 0) {
          // Create a deep clone of the request body
          const clonedRequestBody = JSON.parse(JSON.stringify(requestBody));

          // Add entity filters to the filter array of the cloned request body
          if (!clonedRequestBody.query) {
            clonedRequestBody.query = { bool: { filter: [] } };
          } else if (!clonedRequestBody.query.bool) {
            clonedRequestBody.query.bool = { filter: [] };
          } else if (!clonedRequestBody.query.bool.filter) {
            clonedRequestBody.query.bool.filter = [];
          }

          // Add the entity filter object to the filter array
          clonedRequestBody.query.bool.filter.push(entityFilters);

          queryForAggregation = clonedRequestBody.query;
        } else {
          // Use the original requestBody if no entity filters to add
          queryForAggregation = requestBody.query;
        }

        // Example aggregatorRequestBody:
        // {
        //   "size": 0,
        //   "query": {
        //     "bool": {
        //       "filter": [
        //         {"term": {"task_id": "BsLQbZUBxkwQb14j93bF"}},
        //         {"range": {"execution_end_time": {"gte": "0"}}},
        //         {
        //           "bool": {
        //             "should": [
        //               {
        //                 "bool": {
        //                   "must": [
        //                     {
        //                       "nested": {
        //                         "path": "entity",
        //                         "query": {"bool": {"must": [{"term": {"entity.name": "service"}}, {"term": {"entity.value": "app_6"}}]}},
        //                         "ignore_unmapped": false,
        //                         "score_mode": "avg"
        //                       }
        //                     },
        //                     {
        //                       "nested": {
        //                         "path": "entity",
        //                         "query": {"bool": {"must": [{"term": {"entity.name": "host"}}, {"term": {"entity.value": "server_3"}}]}},
        //                         "ignore_unmapped": false,
        //                         "score_mode": "avg"
        //                       }
        //                     }
        //                   ]
        //                 }
        //               },
        //               {
        //                 "bool": {
        //                   "must": [
        //                     {
        //                       "nested": {
        //                         "path": "entity",
        //                         "query": {"bool": {"must": [{"term": {"entity.name": "service"}}, {"term": {"entity.value": "app_6"}}]}},
        //                         "ignore_unmapped": false,
        //                         "score_mode": "avg"
        //                       }
        //                     },
        //                     {
        //                       "nested": {
        //                         "path": "entity",
        //                         "query": {"bool": {"must": [{"term": {"entity.name": "host"}}, {"term": {"entity.value": "server_1"}}]}},
        //                         "ignore_unmapped": false,
        //                         "score_mode": "avg"
        //                       }
        //                     }
        //                   ]
        //                 }
        //               }
        //             ],
        //             "minimum_should_match": 1
        //           }
        //         }
        //       ]
        //     }
        //   },
        //   "aggs": {
        //     "top_entities": {
        //       "terms": {
        //         "field": "entity_id",
        //         "size": 5,
        //         "order": {"_count": "desc"}
        //       }
        //     }
        //   }
        // }

        // Now use the appropriate query in aggregatorRequestBody
        const aggregatorRequestBody = {
          size: 0,
          query: queryForAggregation,
          aggs: {
            top_entities: {
              terms: {
                field: 'entity_id',
                size: maxEntities,
                order: { _count: 'desc' },
              },
            },
          },
        };

        // We'll call the same or custom search method:
        const callWithRequest = getClientBasedOnDataSource(
          context,
          this.dataSourceEnabled,
          request,
          dataSourceId,
          this.client
        );

        console.log('getForecastResults aggregatorRequestBody', JSON.stringify(aggregatorRequestBody));

        const aggResponse = !resultIndex
          ? await callWithRequest('forecast.searchResults', {
            body: aggregatorRequestBody,
          })
          : await callWithRequest(
            'forecast.searchResultsFromCustomResultIndex',
            {
              resultIndex: resultIndex,
              body: aggregatorRequestBody,
            }
          );

        // Extract top entity_ids
        const topEntityBuckets = get(aggResponse, 'aggregations.top_entities.buckets', []);
        restrictedEntityIds = topEntityBuckets.map((b: any) => b.key);
        console.log('Found top entities:', restrictedEntityIds);

        // If no entities matched, return empty
        if (!restrictedEntityIds.length) {
          return opensearchDashboardsResponse.ok({
            body: {
              ok: true,
              response: {
                totalResults: 0,
                results: [],
              },
            },
          });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // Add a terms filter to restrict final hits if we have top entities
      // ─────────────────────────────────────────────────────────────
      if (restrictedEntityIds.length > 0) {
        requestBody.query.bool.filter.push({
          terms: { entity_id: restrictedEntityIds },
        });
      }

      let requestParams = {
        resultIndex: resultIndex,
      } as {};

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      console.log('getForecastResults requestBody', JSON.stringify(requestBody));

      // Add pagination with search_after
      let allResults = [];
      let lastSort = null;
      let hasMoreResults = true;
      let totalHits = 0;

      // Create a copy of your existing requestBody to use in the pagination loop
      const paginatedRequestBody = {
        ...requestBody,
        "track_total_hits": true  // Add this to ensure accurate total count for large result sets
      };

      // Add sort if not already present
      if (!paginatedRequestBody.sort) {
        paginatedRequestBody.sort = [
          { [sortField]: sortDirection.toLowerCase() },
          { "_id": "asc" }  // Secondary sort for tiebreaker
        ];
      }

      // Execute paginated search
      while (hasMoreResults) {
        // Add search_after for subsequent pages
        if (lastSort) {
          paginatedRequestBody.search_after = lastSort;
        }

        console.log('getForecastResults paginatedRequestBody', JSON.stringify(paginatedRequestBody));

        // Your existing API call, but with our paginated request body
        const response = !resultIndex
          ? await callWithRequest('forecast.searchResults', {
            body: paginatedRequestBody,
          })
          : await callWithRequest('forecast.searchResultsFromCustomResultIndex', {
            ...requestParams,
            body: paginatedRequestBody,
          });

        const hits = get(response, 'hits.hits', []);

        // Track total hits from first page
        if (!lastSort) {
          totalHits = get(response, 'hits.total.value', 0);
        }

        if (hits.length === 0 || hits.length < size) {
          hasMoreResults = false;
        }

        if (hits.length > 0) {
          // Save sort values from last hit for next iteration
          lastSort = hits[hits.length - 1].sort;

          // Collect results
          allResults.push(...hits);
        }
      }

      console.log('getForecastResults allResults', allResults.length);

      const groupedResults = new Map();
      allResults.forEach((result) => {
        const source = result._source;
        const key = `${source.forecaster_id}|${source.entity_id || 'default'}|${source.data_end_time}`;

        if (!groupedResults.has(key)) {
          groupedResults.set(key, {
            featureData: null,
            forecasts: []
          });
        }

        if (source.feature_data) {
          groupedResults.get(key).featureData = result;
        } else {
          groupedResults.get(key).forecasts.push(result);
        }
      });

      // Convert Map to object for logging
      // const groupedResultsObj = Object.fromEntries(groupedResults);
      // console.log('groupedResults:', JSON.stringify(groupedResultsObj));

      const forecastResult: ForecastResult[] = [];

      // Process each group
      groupedResults.forEach(({ featureData, forecasts }) => {
        if (!featureData) return; // Skip if no feature data found

        // Check if any forecast has horizon_index
        const hasHorizonIndex = forecasts.some(forecast => forecast._source.horizon_index != null);

        if (hasHorizonIndex) {
          // Sort forecasts by horizon_index and combine into arrays
          const sortedForecasts = orderBy(forecasts, ['_source.horizon_index'], ['asc']);
          // console.log('sortedForecasts', sortedForecasts);

          const forecastValues: number[] = [];
          const forecastLowerBounds: number[] = [];
          const forecastUpperBounds: number[] = [];
          const forecastStartTimes: number[] = [];
          const forecastEndTimes: number[] = [];

          sortedForecasts.forEach((forecast: any) => {
            const source = forecast._source;

            forecastValues.push(
              source.forecast_value != null && source.forecast_value !== 'NaN'
                ? toFixedNumberForForecast(Number.parseFloat(source.forecast_value))
                : 0
            );

            forecastLowerBounds.push(
              source.forecast_lower_bound != null && source.forecast_lower_bound !== 'NaN'
                ? toFixedNumberForForecast(Number.parseFloat(source.forecast_lower_bound))
                : 0
            );

            forecastUpperBounds.push(
              source.forecast_upper_bound != null && source.forecast_upper_bound !== 'NaN'
                ? toFixedNumberForForecast(Number.parseFloat(source.forecast_upper_bound))
                : 0
            );

            forecastStartTimes.push(source.forecast_data_start_time);
            forecastEndTimes.push(source.forecast_data_end_time);
          });

          forecastResult.push({
            startTime: featureData._source.data_start_time,
            endTime: featureData._source.data_end_time,
            plotTime: featureData._source.data_end_time,
            forecastValue: forecastValues,
            forecastLowerBound: forecastLowerBounds,
            forecastUpperBound: forecastUpperBounds,
            forecastStartTime: forecastStartTimes,
            forecastEndTime: forecastEndTimes,
            ...(featureData._source.entity != null ? { entity: featureData._source.entity, entityId: featureData._source.entity_id } : {}),
            features: this.getFeatureData(featureData)
          });
        } else {
          // Direct push for single forecasts without horizon_index
          forecastResult.push({
            startTime: featureData._source.data_start_time,
            endTime: featureData._source.data_end_time,
            plotTime: featureData._source.data_end_time,
            forecastValue: [],
            forecastLowerBound: [],
            forecastUpperBound: [],
            forecastStartTime: [],
            forecastEndTime: [],
            ...(featureData._source.entity != null ? { entity: featureData._source.entity, entityId: featureData._source.entity_id } : {}),
            features: this.getFeatureData(featureData)
          });
        }
      });

      // Sort final results by plotTime
      const sortedForecastResult = orderBy(forecastResult, ['plotTime'], ['asc']);

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: {
            totalResults: totalHits,
            results: sortedForecastResult,
          },
        },
      });
    } catch (err) {
      console.log('Forecast - Unable to get results', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getTopForecastResults = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      let { forecasterId, isRunOnce } = request.params as {
        forecasterId: string;
        isRunOnce: any;
      };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      isRunOnce = JSON.parse(isRunOnce) as boolean;
      const requestPath = 'forecast.topForecastResults';

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      // Define proper types for OpenSearch query structures
      type OpenSearchQuery = Record<string, any>;

      interface SubAggregation {
        aggregation_query: {
          [key: string]: {
            [aggregationType: string]: {
              field: string;
            };
          };
        };
        order: 'ASC' | 'DESC';
      }

      // Extract the query parameters from the request body with defaults
      const {
        split_by = '',
        filter_by = '',
        build_in_query = '',
        forecast_from = 0,
        threshold = 0,
        relation_to_threshold = '',
        filter_query = {},
        subaggregations = []
      } = (request.body || {}) as {
        split_by: string;
        filter_by: string;
        build_in_query: string;
        forecast_from: number;
        threshold: number;
        relation_to_threshold: string;
        filter_query: OpenSearchQuery;
        subaggregations: SubAggregation[];
      };

      // Build query object with appropriate parameters
      const queryBody: Record<string, any> = {};

      // Add split_by if present
      if (split_by) {
        queryBody.split_by = split_by;
      }

      // Add filter_by and related parameters
      if (filter_by) {
        queryBody.filter_by = filter_by;

        if (filter_by === 'BUILD_IN_QUERY' && build_in_query) {
          queryBody.build_in_query = build_in_query;

          // Add threshold parameters if build_in_query is DISTANCE_TO_THRESHOLD_VALUE
          if (build_in_query === 'DISTANCE_TO_THRESHOLD_VALUE') {
            queryBody.threshold = threshold;
            queryBody.relation_to_threshold = relation_to_threshold;
          }
        } else if (filter_by === 'CUSTOM_QUERY') {
          // Add custom query parameters - check if the objects are not empty
          if (Object.keys(filter_query).length > 0) {
            queryBody.filter_query = filter_query;
          }
          if (subaggregations.length > 0) {
            queryBody.subaggregations = subaggregations;
          }
        }
      }

      // Add forecast_from timestamp if present
      if (forecast_from) {
        queryBody.forecast_from = forecast_from;
      }

      // Add run_once to body if isRunOnce is true
      const requestBody = {
        ...queryBody,
        ...(isRunOnce && { run_once: true }),
      };

      const response = await callWithRequest(requestPath, {
        forecasterId: forecasterId,
        body: requestBody,
      });

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - getTopForecastResults', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  matchForecaster = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { forecasterName } = request.params as { forecasterName: string };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response = await callWithRequest(
        'forecast.matchForecaster', {
        forecasterName,
      });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - matchForecaster', err);
      return opensearchDashboardsResponse.ok({
        body: { ok: false, error: getErrorMessage(err) },
      });
    }
  };

  getForecasterCount = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response = await callWithRequest(
        'forecast.forecasterCount');
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - getForecasterCount', err);
      return opensearchDashboardsResponse.ok({
        body: { ok: false, error: getErrorMessage(err) },
      });
    }
  };

  getFeatureData = (rawResult: any) => {
    const featureResult: { [key: string]: FeatureResult } = {};
    rawResult._source.feature_data.forEach((featureData: any) => {
      featureResult[featureData.feature_id] = {
        startTime: rawResult._source.data_start_time,
        endTime: rawResult._source.data_end_time,
        plotTime: rawResult._source.data_end_time,
        data:
          featureData.data != null && featureData.data !== 'NaN'
            ? toFixedNumberForForecast(Number.parseFloat(featureData.data))
            : 0,
        name: featureData.feature_name,
      };
    });
    return featureResult;
  };

  searchResults = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      var { resultIndex } = request.params as {
        resultIndex: string;
      };
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };

      if (!resultIndex || !resultIndex.startsWith(CUSTOM_FORECAST_RESULT_INDEX_PREFIX)) {
        // Set resultIndex as '' means no custom result index specified, will only search forecast result from default index.
        resultIndex = '';
      }

      let requestParams = {
        resultIndex: resultIndex,
      } as {};
      const requestBody = JSON.stringify(request.body);

      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const response = !resultIndex
        ? await callWithRequest('forecast.searchResults', {
          body: requestBody,
        })
        : await callWithRequest('forecast.searchResultsFromCustomResultIndex', {
          ...requestParams,
          body: requestBody,
        });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Forecast - Unable to search forecast result', err);
      if (isIndexNotFoundError(err)) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: { totalForecasters: 0, forecasters: [] } },
        });
      }
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };
}
