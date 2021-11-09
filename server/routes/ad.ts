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

import { get, orderBy, pullAll, isEmpty } from 'lodash';
import { SearchResponse } from '../models/interfaces';
import {
  AnomalyResult,
  Detector,
  GetDetectorsQueryParams,
  FeatureResult,
} from '../models/types';
import { Router } from '../router';
import {
  SORT_DIRECTION,
  AD_DOC_FIELDS,
  CUSTOM_AD_RESULT_INDEX_PREFIX,
} from '../utils/constants';
import {
  mapKeysDeep,
  toCamel,
  toFixedNumberForAnomaly,
} from '../utils/helpers';
import {
  anomalyResultMapper,
  convertDetectorKeysToCamelCase,
  convertDetectorKeysToSnakeCase,
  convertPreviewInputKeysToSnakeCase,
  getResultAggregationQuery,
  isIndexNotFoundError,
  getErrorMessage,
  getTaskState,
  getLatestDetectorTasksQuery,
  getFiltersFromEntityList,
  convertStaticFieldsToCamelCase,
  getLatestTaskForDetectorQuery,
  convertTaskAndJobFieldsToCamelCase,
} from './utils/adHelpers';
import { isNumber, set } from 'lodash';
import {
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
} from '../../../../src/core/server';

type PutDetectorParams = {
  detectorId: string;
  ifSeqNo?: string;
  ifPrimaryTerm?: string;
  body: string;
};

export function registerADRoutes(apiRouter: Router, adService: AdService) {
  apiRouter.post('/detectors', adService.putDetector);
  apiRouter.put('/detectors/{detectorId}', adService.putDetector);
  apiRouter.post('/detectors/_search', adService.searchDetector);
  apiRouter.post('/detectors/results/_search/', adService.searchResults);
  apiRouter.post('/detectors/results/_search', adService.searchResults);
  apiRouter.post(
    '/detectors/results/_search/{resultIndex}/{onlyQueryCustomResultIndex}',
    adService.searchResults
  );
  apiRouter.get('/detectors/{detectorId}', adService.getDetector);
  apiRouter.get('/detectors', adService.getDetectors);
  apiRouter.post('/detectors/preview', adService.previewDetector);
  apiRouter.get(
    '/detectors/{id}/results/{isHistorical}/{resultIndex}/{onlyQueryCustomResultIndex}',
    adService.getAnomalyResults
  );
  apiRouter.get(
    '/detectors/{id}/results/{isHistorical}',
    adService.getAnomalyResults
  );
  apiRouter.delete('/detectors/{detectorId}', adService.deleteDetector);
  apiRouter.post('/detectors/{detectorId}/start', adService.startDetector);
  apiRouter.post(
    '/detectors/{detectorId}/stop/{isHistorical}',
    adService.stopDetector
  );
  apiRouter.get(
    '/detectors/{detectorId}/_profile',
    adService.getDetectorProfile
  );
  apiRouter.get('/detectors/{detectorName}/_match', adService.matchDetector);
  apiRouter.get('/detectors/_count', adService.getDetectorCount);
  apiRouter.post(
    '/detectors/{detectorId}/_topAnomalies/{isHistorical}',
    adService.getTopAnomalyResults
  );
  apiRouter.post('/detectors/_validate', adService.validateDetector);
}

export default class AdService {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  deleteDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { detectorId } = request.params as { detectorId: string };
      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.deleteDetector', {
          detectorId,
        });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - deleteDetector', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  previewDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const requestBody = JSON.stringify(
        convertPreviewInputKeysToSnakeCase(request.body)
      );
      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.previewDetector', {
          body: requestBody,
        });
      const transformedKeys = mapKeysDeep(response, toCamel);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          //@ts-ignore
          response: anomalyResultMapper(transformedKeys.anomalyResult),
        },
      });
    } catch (err) {
      console.log('Anomaly detector - previewDetector', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  putDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { detectorId } = request.params as { detectorId: string };
      //@ts-ignore
      const ifSeqNo = request.body.seqNo;
      //@ts-ignore
      const ifPrimaryTerm = request.body.primaryTerm;

      const requestBody = JSON.stringify(
        convertDetectorKeysToSnakeCase(request.body)
      );
      let params: PutDetectorParams = {
        detectorId: detectorId,
        ifSeqNo: ifSeqNo,
        ifPrimaryTerm: ifPrimaryTerm,
        body: requestBody,
      };
      let response;

      if (isNumber(ifSeqNo) && isNumber(ifPrimaryTerm)) {
        response = await this.client
          .asScoped(request)
          .callAsCurrentUser('ad.updateDetector', params);
      } else {
        response = await this.client
          .asScoped(request)
          .callAsCurrentUser('ad.createDetector', {
            body: params.body,
          });
      }
      const resp = {
        ...response.anomaly_detector,
        id: response._id,
        primaryTerm: response._primary_term,
        seqNo: response._seq_no,
      };
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: convertDetectorKeysToCamelCase(resp) as Detector,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - PutDetector', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  validateDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const requestBody = JSON.stringify(
        convertPreviewInputKeysToSnakeCase(request.body)
      );
      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.validateDetector', {
          body: requestBody,
        });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - validateDetector', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { detectorId } = request.params as { detectorId: string };
      const detectorResponse = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.getDetector', {
          detectorId,
        });

      // Populating static detector fields
      const staticFields = {
        id: detectorResponse._id,
        primaryTerm: detectorResponse._primary_term,
        seqNo: detectorResponse._seq_no,
        ...convertStaticFieldsToCamelCase(detectorResponse.anomaly_detector),
      };

      // Get real-time and historical task info to populate the
      // task and job-related fields
      // We wrap these calls in a try/catch, and suppress any index_not_found_exceptions
      // which can occur if no detector jobs have been ran on a new cluster.
      let realtimeTasksResponse = {} as any;
      let historicalTasksResponse = {} as any;
      try {
        realtimeTasksResponse = await this.client
          .asScoped(request)
          .callAsCurrentUser('ad.searchTasks', {
            body: getLatestTaskForDetectorQuery(detectorId, true),
          });
        historicalTasksResponse = await this.client
          .asScoped(request)
          .callAsCurrentUser('ad.searchTasks', {
            body: getLatestTaskForDetectorQuery(detectorId, false),
          });
      } catch (err) {
        if (!isIndexNotFoundError(err)) {
          throw err;
        }
      }

      const realtimeTask = get(
        get(realtimeTasksResponse, 'hits.hits', []).map((taskResponse: any) => {
          return {
            id: get(taskResponse, '_id'),
            ...get(taskResponse, '_source'),
          };
        }),
        0
      );
      const historicalTask = get(
        get(historicalTasksResponse, 'hits.hits', []).map(
          (taskResponse: any) => {
            return {
              id: get(taskResponse, '_id'),
              ...get(taskResponse, '_source'),
            };
          }
        ),
        0
      );

      const taskAndJobFields = convertTaskAndJobFieldsToCamelCase(
        realtimeTask,
        historicalTask,
        detectorResponse.anomaly_detector_job
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
      console.log('Anomaly detector - Unable to get detector', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  startDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { detectorId } = request.params as { detectorId: string };
      //@ts-ignore
      const startTime = request.body?.startTime;
      //@ts-ignore
      const endTime = request.body?.endTime;
      let requestParams = { detectorId: detectorId } as {};
      let requestPath = 'ad.startDetector';
      // If a start and end time are passed: we want to start a historical analysis
      if (isNumber(startTime) && isNumber(endTime)) {
        requestParams = {
          ...requestParams,
          body: {
            start_time: startTime,
            end_time: endTime,
          },
        };
        requestPath = 'ad.startHistoricalDetector';
      }

      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser(requestPath, requestParams);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - startDetector', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  stopDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      let { detectorId, isHistorical } = request.params as {
        detectorId: string;
        isHistorical: any;
      };
      isHistorical = JSON.parse(isHistorical) as boolean;
      const requestPath = isHistorical
        ? 'ad.stopHistoricalDetector'
        : 'ad.stopDetector';

      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser(requestPath, {
          detectorId,
        });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - stopDetector', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getDetectorProfile = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { detectorId } = request.params as { detectorId: string };
      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.detectorProfile', {
          detectorId,
        });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - detectorProfile', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  searchDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const requestBody = JSON.stringify(request.body);
      const response: SearchResponse<Detector> = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.searchDetector', { body: requestBody });
      const totalDetectors = get(response, 'hits.total.value', 0);
      const detectors = get(response, 'hits.hits', []).map((detector: any) => ({
        ...convertDetectorKeysToCamelCase(detector._source),
        id: detector._id,
        seqNo: detector._seq_no,
        primaryTerm: detector._primary_term,
      }));
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: {
            totalDetectors,
            detectors,
          },
        },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to search detectors', err);
      if (isIndexNotFoundError(err)) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: { totalDetectors: 0, detectors: [] } },
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

  searchResults = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      var { resultIndex, onlyQueryCustomResultIndex } = request.params as {
        resultIndex: string;
        onlyQueryCustomResultIndex: boolean;
      };
      if (
        !resultIndex ||
        !resultIndex.startsWith(CUSTOM_AD_RESULT_INDEX_PREFIX)
      ) {
        // Set resultIndex as '' means no custom result index specified, will only search anomaly result from default index.
        resultIndex = '';
      }
      let requestParams = {
        resultIndex: resultIndex,
        onlyQueryCustomResultIndex: onlyQueryCustomResultIndex,
      } as {};
      const requestBody = JSON.stringify(request.body);
      const response = !resultIndex
        ? await this.client
            .asScoped(request)
            .callAsCurrentUser('ad.searchResults', {
              body: requestBody,
            })
        : await this.client
            .asScoped(request)
            .callAsCurrentUser('ad.searchResultsFromCustomResultIndex', {
              ...requestParams,
              body: requestBody,
            });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to search anomaly result', err);
      if (isIndexNotFoundError(err)) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: { totalDetectors: 0, detectors: [] } },
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

  getDetectors = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const {
        from = 0,
        size = 20,
        search = '',
        indices = '',
        sortDirection = SORT_DIRECTION.DESC,
        sortField = 'name',
      } = request.query as GetDetectorsQueryParams;
      const mustQueries = [];
      if (search.trim()) {
        mustQueries.push({
          query_string: {
            fields: ['name', 'description'],
            default_operator: 'AND',
            query: `*${search.trim().split('-').join('* *')}*`,
          },
        });
      }
      if (indices.trim()) {
        mustQueries.push({
          query_string: {
            fields: ['indices'],
            default_operator: 'AND',
            query: `*${indices.trim().split('-').join('* *')}*`,
          },
        });
      }
      //Allowed sorting columns
      const sortQueryMap = {
        name: { 'name.keyword': sortDirection },
        indices: { 'indices.keyword': sortDirection },
        lastUpdateTime: { last_update_time: sortDirection },
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
        from,
        query: {
          bool: {
            must: mustQueries,
          },
        },
      };
      const response: any = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.searchDetector', { body: requestBody });

      const totalDetectors = get(response, 'hits.total.value', 0);

      //Get all detectors from search detector API
      const allDetectors = get(response, 'hits.hits', []).reduce(
        (acc: any, detectorResponse: any) => ({
          ...acc,
          [detectorResponse._id]: {
            id: detectorResponse._id,
            primaryTerm: detectorResponse._primary_term,
            seqNo: detectorResponse._seq_no,
            ...convertStaticFieldsToCamelCase(detectorResponse._source),
          },
        }),
        {}
      );

      const allDetectorsMap = Object.values(allDetectors).reduce(
        (acc: any, detector: any) => ({ ...acc, [detector.id]: detector }),
        {}
      ) as { [key: string]: Detector };

      //Given each detector from previous result, get aggregation to power list
      const allDetectorIds = Object.keys(allDetectorsMap);
      let requestParams = {
        // If specifying result index, will query anomaly result from both default and custom result indices.
        // If no valid result index specified, just query anomaly result from default result index.
        // Here we specify custom AD result index prefix pattern to query all custom result indices.
        resultIndex: CUSTOM_AD_RESULT_INDEX_PREFIX + '*',
        onlyQueryCustomResultIndex: 'false',
      } as {};
      const aggregationResult = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.searchResultsFromCustomResultIndex', {
          ...requestParams,
          body: getResultAggregationQuery(allDetectorIds, {
            from,
            size,
            sortField,
            sortDirection,
            search,
            indices,
          }),
        });
      const aggsDetectors = get(
        aggregationResult,
        'aggregations.unique_detectors.buckets',
        []
      ).reduce((acc: any, agg: any) => {
        return {
          ...acc,
          [agg.key]: {
            ...allDetectorsMap[agg.key],
            totalAnomalies: agg.total_anomalies_in_24hr.doc_count,
            lastActiveAnomaly: agg.latest_anomaly_time.value,
          },
        };
      }, {});

      // Aggregation will not return values where anomalies for detectors are not generated, loop through it and fill values with 0
      const unUsedDetectors = pullAll(
        allDetectorIds,
        Object.keys(aggsDetectors)
      ).reduce((acc: any, unusedDetector: string) => {
        return {
          ...acc,
          [unusedDetector]: {
            ...allDetectorsMap[unusedDetector],
            totalAnomalies: 0,
            lastActiveAnomaly: 0,
          },
        };
      }, {});

      // If sorting criteria is from the aggregation manage pagination in memory.
      let finalDetectors = orderBy<any>(
        { ...aggsDetectors, ...unUsedDetectors },
        [sortField],
        [sortDirection]
      );
      if (!sortQueryMap[sortField]) {
        finalDetectors = Object.values(finalDetectors)
          .slice(from, from + size)
          .reduce(
            (acc, detector: any) => ({ ...acc, [detector.id]: detector }),
            {}
          );
      }

      // Fetch the latest realtime and historical tasks for all detectors
      // using terms aggregations
      // We wrap these calls in a try/catch, and suppress any index_not_found_exceptions
      // which can occur if no detector jobs have been ran on a new cluster.
      let realtimeTasksResponse = {} as any;
      let historicalTasksResponse = {} as any;
      try {
        realtimeTasksResponse = await this.client
          .asScoped(request)
          .callAsCurrentUser('ad.searchTasks', {
            body: getLatestDetectorTasksQuery(true),
          });
        historicalTasksResponse = await this.client
          .asScoped(request)
          .callAsCurrentUser('ad.searchTasks', {
            body: getLatestDetectorTasksQuery(false),
          });
      } catch (err) {
        if (!isIndexNotFoundError(err)) {
          throw err;
        }
      }

      const realtimeTasks = get(
        realtimeTasksResponse,
        'aggregations.detectors.buckets',
        []
      ).reduce((acc: any, bucket: any) => {
        return {
          ...acc,
          [bucket.key]: {
            realtimeTask: get(bucket, 'latest_tasks.hits.hits.0', undefined),
          },
        };
      }, {});

      const historicalTasks = get(
        historicalTasksResponse,
        'aggregations.detectors.buckets',
        []
      ).reduce((acc: any, bucket: any) => {
        return {
          ...acc,
          [bucket.key]: {
            historicalTask: get(bucket, 'latest_tasks.hits.hits.0', undefined),
          },
        };
      }, {});

      // Get real-time and historical task info by looping through each detector & retrieving
      //    - curState by getting real-time task state
      //    - enabledTime by getting real-time task's execution_start time
      //    - taskId by getting historical task's _id
      finalDetectors.forEach((detector) => {
        const realtimeTask = get(
          realtimeTasks[detector.id],
          'realtimeTask._source'
        );
        detector.curState = getTaskState(realtimeTask);
        detector.enabledTime = get(realtimeTask, 'execution_start_time');
        detector.taskId = get(
          historicalTasks[detector.id],
          'historicalTask._id'
        );
      });

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: {
            totalDetectors,
            detectorList: Object.values(finalDetectors),
          },
        },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to search detectors', err);
      if (isIndexNotFoundError(err)) {
        return opensearchDashboardsResponse.ok({
          body: { ok: true, response: { totalDetectors: 0, detectorList: [] } },
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

  getAnomalyResults = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    let { id, isHistorical, resultIndex, onlyQueryCustomResultIndex } =
      request.params as {
        id: string;
        isHistorical: any;
        resultIndex: string;
        onlyQueryCustomResultIndex: boolean;
      };
    if (
      !resultIndex ||
      !resultIndex.startsWith(CUSTOM_AD_RESULT_INDEX_PREFIX)
    ) {
      // Set resultIndex as '' means no custom result index specified, will only search anomaly result from default index.
      resultIndex = '';
    }
    isHistorical = JSON.parse(isHistorical);

    // Search by task id if historical, or by detector id if realtime
    const searchTerm = isHistorical ? { task_id: id } : { detector_id: id };

    try {
      const {
        from = 0,
        size = 20,
        sortDirection = SORT_DIRECTION.DESC,
        sortField = AD_DOC_FIELDS.DATA_START_TIME,
        startTime = 0,
        endTime = 0,
        fieldName = '',
        anomalyThreshold = -1,
        entityList = '',
      } = request.query as {
        from: number;
        size: number;
        sortDirection: SORT_DIRECTION;
        sortField?: string;
        startTime: number;
        endTime: number;
        fieldName: string;
        anomalyThreshold: number;
        entityList: string;
      };

      const entityListAsObj =
        entityList.length === 0 ? {} : JSON.parse(entityList);
      const entityFilters = isEmpty(entityListAsObj)
        ? []
        : getFiltersFromEntityList(entityListAsObj);

      //Allowed sorting columns
      const sortQueryMap = {
        anomalyGrade: { anomaly_grade: sortDirection },
        confidence: { confidence: sortDirection },
        [AD_DOC_FIELDS.DATA_START_TIME]: {
          [AD_DOC_FIELDS.DATA_START_TIME]: sortDirection,
        },
        [AD_DOC_FIELDS.DATA_END_TIME]: {
          [AD_DOC_FIELDS.DATA_END_TIME]: sortDirection,
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
        from,
        query: {
          bool: {
            filter: [
              {
                term: searchTerm,
              },

              {
                range: {
                  anomaly_grade: {
                    gt: anomalyThreshold,
                  },
                },
              },
              ...entityFilters,
            ],
          },
        },
      };

      // If querying RT results: remove any results that include a task_id, as this indicates
      // a historical result from a historical task.
      if (!isHistorical) {
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
        const filterSize = requestBody.query.bool.filter.length;
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
      } catch (error) {
        console.log('wrong date range filter', error);
      }

      let requestParams = {
        resultIndex: resultIndex,
        onlyQueryCustomResultIndex: onlyQueryCustomResultIndex,
      } as {};
      const response = !resultIndex
        ? await this.client
            .asScoped(request)
            .callAsCurrentUser('ad.searchResults', {
              body: requestBody,
            })
        : await this.client
            .asScoped(request)
            .callAsCurrentUser('ad.searchResultsFromCustomResultIndex', {
              ...requestParams,
              body: requestBody,
            });

      const totalResults: number = get(response, 'hits.total.value', 0);

      const detectorResult: AnomalyResult[] = [];
      const featureResult: { [key: string]: FeatureResult[] } = {};
      get(response, 'hits.hits', []).forEach((result: any) => {
        detectorResult.push({
          startTime: result._source.data_start_time,
          endTime: result._source.data_end_time,
          plotTime: result._source.data_end_time,
          confidence:
            result._source.confidence != null &&
            result._source.confidence !== 'NaN' &&
            result._source.confidence > 0
              ? toFixedNumberForAnomaly(
                  Number.parseFloat(result._source.confidence)
                )
              : 0,
          anomalyGrade:
            result._source.anomaly_grade != null &&
            result._source.anomaly_grade !== 'NaN' &&
            result._source.anomaly_grade > 0
              ? toFixedNumberForAnomaly(
                  Number.parseFloat(result._source.anomaly_grade)
                )
              : 0,
          ...(result._source.entity != null
            ? { entity: result._source.entity }
            : {}),
          // TODO: we should refactor other places to read feature data from
          // AnomalyResult, instead of having separate FeatureData which is hard
          // to know feature data belongs to which anomaly result
          features: this.getFeatureData(result),
        });
        result._source.feature_data.forEach((featureData: any) => {
          if (!featureResult[featureData.feature_id]) {
            featureResult[featureData.feature_id] = [];
          }
          featureResult[featureData.feature_id].push({
            startTime: result._source.data_start_time,
            endTime: result._source.data_end_time,
            plotTime: result._source.data_end_time,
            data:
              featureData.data != null && featureData.data !== 'NaN'
                ? toFixedNumberForAnomaly(Number.parseFloat(featureData.data))
                : 0,
          });
        });
      });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: {
            totalAnomalies: totalResults,
            results: detectorResult,
            featureResults: featureResult,
          },
        },
      });
    } catch (err) {
      console.log('Anomaly detector - Unable to get results', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  getTopAnomalyResults = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      let { detectorId, isHistorical } = request.params as {
        detectorId: string;
        isHistorical: any;
      };
      isHistorical = JSON.parse(isHistorical) as boolean;
      const requestPath = isHistorical
        ? 'ad.topHistoricalAnomalyResults'
        : 'ad.topAnomalyResults';

      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser(requestPath, {
          detectorId: detectorId,
          body: request.body,
        });

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - getTopAnomalyResults', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  matchDetector = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { detectorName } = request.params as { detectorName: string };
      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.matchDetector', {
          detectorName,
        });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - matchDetector', err);
      return opensearchDashboardsResponse.ok({
        body: { ok: false, error: getErrorMessage(err) },
      });
    }
  };

  getDetectorCount = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser('ad.detectorCount');
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      console.log('Anomaly detector - getDetectorCount', err);
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
            ? toFixedNumberForAnomaly(Number.parseFloat(featureData.data))
            : 0,
      };
    });
    return featureResult;
  };
}
