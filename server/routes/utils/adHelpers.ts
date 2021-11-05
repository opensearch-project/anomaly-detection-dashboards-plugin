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


import { get, omit, cloneDeep, isEmpty } from 'lodash';
import { AnomalyResults, Entity } from '../../models/interfaces';
import { GetDetectorsQueryParams, Detector } from '../../models/types';
import { mapKeysDeep, toCamel, toSnake } from '../../utils/helpers';
import {
  DETECTOR_STATE,
  STACK_TRACE_PATTERN,
  OPENSEARCH_EXCEPTION_PREFIX,
  REALTIME_TASK_TYPE_PREFIX,
  ENTITY_FIELD,
  ENTITY_NAME_PATH_FIELD,
  ENTITY_VALUE_PATH_FIELD,
  SORT_DIRECTION,
  REALTIME_TASK_TYPES,
  HISTORICAL_TASK_TYPES,
} from '../../utils/constants';
import { InitProgress } from '../../models/interfaces';
import { MAX_DETECTORS } from '../../utils/constants';

export const convertDetectorKeysToSnakeCase = (payload: any) => {
  return {
    ...mapKeysDeep(
      {
        ...omit(payload, ['filterQuery', 'featureAttributes']), // Exclude the filterQuery,
      },
      toSnake
    ),
    filter_query: get(payload, 'filterQuery', {}),
    ui_metadata: get(payload, 'uiMetadata', {}),
    feature_attributes: get(payload, 'featureAttributes', []).map(
      (feature: any) => ({
        ...mapKeysDeep({ ...omit(feature, ['aggregationQuery']) }, toSnake),
        aggregation_query: feature.aggregationQuery,
      })
    ),
  };
};

export const convertPreviewInputKeysToSnakeCase = (payload: any) => {
  return {
    ...mapKeysDeep(
      {
        ...omit(payload, ['detector']), // Exclude the detector,
      },
      toSnake
    ),
    detector: convertDetectorKeysToSnakeCase(get(payload, 'detector', {})),
  };
};

export const convertDetectorKeysToCamelCase = (response: object) => {
  let camelCaseResponse = {
    ...mapKeysDeep(
      omit(response, [
        'filter_query',
        'ui_metadata',
        'feature_query',
        'feature_attributes',
        'adJob',
        'historicalTask',
      ]),
      toCamel
    ),
    filterQuery: get(response, 'filter_query', {}),
    featureAttributes: get(response, 'feature_attributes', []).map(
      (feature: any) => ({
        ...mapKeysDeep({ ...omit(feature, ['aggregation_query']) }, toCamel),
        aggregationQuery: feature.aggregation_query,
      })
    ),
    uiMetadata: get(response, 'ui_metadata', {}),
    enabled: get(response, 'adJob.enabled', false),
    enabledTime: get(response, 'adJob.enabled_time'),
    disabledTime: get(response, 'adJob.disabled_time'),
    categoryField: get(response, 'category_field'),
  };

  if (!isEmpty(get(response, 'historicalTask', {}))) {
    camelCaseResponse = {
      ...camelCaseResponse,
      //@ts-ignore
      taskId: get(response, 'historicalTask.task_id'),
      taskState: getTaskState(get(response, 'historicalTask', {})),
      taskProgress: get(response, 'historicalTask.task_progress'),
      taskError: processTaskError(get(response, 'historicalTask.error', '')),
      detectionDateRange: {
        startTime: get(
          response,
          'historicalTask.detection_date_range.start_time'
        ),
        endTime: get(response, 'historicalTask.detection_date_range.end_time'),
      },
    };
  }
  return camelCaseResponse;
};

// Converts the static detector fields into camelcase. Ignores any job or task-related fields
export const convertStaticFieldsToCamelCase = (response: object) => {
  return {
    ...mapKeysDeep(
      omit(response, [
        'filter_query',
        'feature_query',
        'feature_attributes',
        'ui_metadata',
        'anomaly_detector_job',
        'anomaly_detection_task',
        'realtime_detection_task',
        'historical_analysis_task',
      ]),
      toCamel
    ),
    filterQuery: get(response, 'filter_query', {}),
    featureAttributes: get(response, 'feature_attributes', []).map(
      (feature: any) => ({
        ...mapKeysDeep({ ...omit(feature, ['aggregation_query']) }, toCamel),
        aggregationQuery: feature.aggregation_query,
      })
    ),
    uiMetadata: get(response, 'ui_metadata', {}),
  };
};

// Converts the task-related detector fields into camelcase
export const convertTaskAndJobFieldsToCamelCase = (
  realtimeTask: any,
  historicalTask: any,
  detectorJob: object
) => {
  let response = {};

  // Populate AD job fields
  response = {
    ...response,
    enabled: get(detectorJob, 'enabled', false),
    enabledTime: get(detectorJob, 'enabled_time'),
    disabledTime: get(detectorJob, 'disabled_time'),
  };

  // Populate RT-task-related fields
  response =
    realtimeTask !== undefined
      ? {
          ...response,
          curState: getTaskState(realtimeTask),
          stateError: processTaskError(get(realtimeTask, 'error', '')),
          initProgress: getTaskInitProgress(realtimeTask),
        }
      : {
          ...response,
          curState: get(detectorJob, 'enabled', false)
            ? DETECTOR_STATE.RUNNING
            : DETECTOR_STATE.DISABLED,
        };

  // Detection date range field is stored under the 'detector' field in legacy historical tasks.
  // To handle this, need to add a check to fetch the date range from the correct place
  const isLegacyHistorical =
    get(historicalTask, 'detection_date_range') === undefined &&
    get(historicalTask, 'detector.detection_date_range') !== undefined;
  const legacyDateRangePrefix = isLegacyHistorical ? 'detector.' : '';

  // Populate historical-task-related fields
  response = {
    ...response,
    taskId: get(historicalTask, 'id'),
    taskState: getTaskState(historicalTask),
    taskProgress: get(historicalTask, 'task_progress'),
    taskError: processTaskError(get(historicalTask, 'error', '')),
    detectionDateRange: {
      startTime: get(
        historicalTask,
        `${legacyDateRangePrefix}detection_date_range.start_time`
      ),
      endTime: get(
        historicalTask,
        `${legacyDateRangePrefix}detection_date_range.end_time`
      ),
    },
  };

  if (isEmpty(historicalTask)) {
    //@ts-ignore
    delete response.detectionDateRange;
  }

  return response;
};

export const getResultAggregationQuery = (
  detectors: string[],
  queryParams: GetDetectorsQueryParams
) => {
  const aggregationSort = {
    totalAnomalies: 'total_anomalies_in_24hr',
    latestAnomalyTime: 'latest_anomaly_time',
  } as { [key: string]: string };

  let aggsSortingOrder = {};

  if (aggregationSort[queryParams.sortField]) {
    aggsSortingOrder = {
      order: {
        [aggregationSort[queryParams.sortField]]: queryParams.sortDirection,
      },
    };
  }
  return {
    size: 0,
    query: {
      bool: {
        must: [
          { terms: { detector_id: detectors } },
          { range: { anomaly_grade: { gt: 0 } } },
        ],
        must_not: {
          exists: {
            field: 'task_id',
          },
        },
      },
    },
    aggs: {
      unique_detectors: {
        terms: {
          field: 'detector_id',
          size: queryParams.from + queryParams.size,
          ...aggsSortingOrder,
        },
        aggs: {
          total_anomalies_in_24hr: {
            filter: {
              range: { data_start_time: { gte: 'now-24h', lte: 'now' } },
            },
          },
          latest_anomaly_time: { max: { field: 'data_start_time' } },
        },
      },
    },
  };
};

export const anomalyResultMapper = (anomalyResults: any[]): AnomalyResults => {
  let resultData: AnomalyResults = {
    anomalies: [],
    featureData: {},
  };
  if (anomalyResults.length === 0) return resultData;
  //initialize features list.
  const firstAnomaly = anomalyResults[0];
  Object.values(firstAnomaly.featureData).forEach((feature: any) => {
    resultData.featureData[feature.featureId] = [];
  });
  anomalyResults.forEach(({ featureData, ...rest }) => {
    const { dataStartTime, dataEndTime, ...others } = rest;
    resultData.anomalies.push({
      ...others,
      anomalyGrade:
        rest.anomalyGrade != null && rest.anomalyGrade > 0
          ? Number.parseFloat(rest.anomalyGrade).toFixed(2)
          : 0,
      confidence:
        rest.anomalyGrade != null && rest.anomalyGrade > 0
          ? Number.parseFloat(rest.confidence).toFixed(2)
          : 0,
      startTime: rest.dataStartTime,
      endTime: rest.dataEndTime,
      plotTime: rest.dataEndTime,
      ...(rest.entity !== undefined ? { entity: rest.entity } : {}),
    });
    featureData.forEach((feature: any) => {
      resultData.featureData[feature.featureId].push({
        startTime: rest.dataStartTime,
        endTime: rest.dataEndTime,
        plotTime: rest.dataEndTime,
        data: feature.data,
      });
    });
  });
  return resultData;
};

export const getTaskInitProgress = (task: any): InitProgress | undefined => {
  if (task?.init_progress !== undefined) {
    return {
      percentageStr: `${(get(task, 'init_progress', 0) * 100).toFixed(0)}%`,
      estimatedMinutesLeft: task.estimated_minutes_left,
    };
  }
  return undefined;
};

export const getFinalDetectorStates = (
  detectorStateResponses: any[],
  finalDetectors: any[]
) => {
  let finalDetectorStates = cloneDeep(detectorStateResponses);
  finalDetectorStates.forEach((detectorState) => {
    //@ts-ignore
    detectorState.state = DETECTOR_STATE[detectorState.state];
  });

  // check if there was any failures / detectors that are unable to start
  finalDetectorStates.forEach((detectorState, i) => {
    /*
      If the error starts with 'Stopped detector', then an EndRunException was thrown.
      All EndRunExceptions are related to initialization failures except for the
      unknown prediction error which contains the message "We might have bugs".
    */
    if (
      detectorState.state === DETECTOR_STATE.DISABLED &&
      detectorState.error !== undefined &&
      detectorState.error.includes('Stopped detector')
    ) {
      detectorState.state = detectorState.error.includes('We might have bugs')
        ? DETECTOR_STATE.UNEXPECTED_FAILURE
        : DETECTOR_STATE.INIT_FAILURE;
    }

    /*
      If a detector is disabled and has no features, set to
      a feature required state
    */
    if (
      detectorState.state === DETECTOR_STATE.DISABLED &&
      finalDetectors[i].featureAttributes.length === 0
    ) {
      detectorState.state = DETECTOR_STATE.FEATURE_REQUIRED;
    }
  });

  return finalDetectorStates;
};

export const getDetectorsWithJob = (
  detectorsWithJobResponses: any[]
): any[] => {
  const finalDetectorsWithJobResponses = cloneDeep(detectorsWithJobResponses);
  const resultDetectorWithJobs = [] as any[];
  finalDetectorsWithJobResponses.forEach((detectorWithJobResponse) => {
    const resp = {
      ...detectorWithJobResponse.anomaly_detector,
      id: detectorWithJobResponse._id,
      primaryTerm: detectorWithJobResponse._primary_term,
      seqNo: detectorWithJobResponse._seq_no,
      adJob: { ...detectorWithJobResponse.anomaly_detector_job },
      historicalTask: { ...detectorWithJobResponse.anomaly_detection_task },
    };
    resultDetectorWithJobs.push(convertDetectorKeysToCamelCase(resp));
  });

  return resultDetectorWithJobs;
};

export const isIndexNotFoundError = (err: any) => {
  return (
    err.statusCode === 404 &&
    get<string>(err, 'body.error.type', '') === 'index_not_found_exception'
  );
};

export const getErrorMessage = (err: any) => {
  return !isEmpty(get(err, 'body.error.reason'))
    ? get(err, 'body.error.reason')
    : get(err, 'message');
};

export const getDetectorTasks = (detectorTaskResponses: any[]) => {
  const detectorToTaskMap = {} as { [key: string]: any };
  detectorTaskResponses.forEach((response) => {
    const detectorId = get(response, '_id', '');
    const detectorTask = get(response, 'anomaly_detection_task', null);
    if (detectorTask !== null) {
      detectorToTaskMap[detectorId] = detectorTask;
    }
  });
  return detectorToTaskMap;
};

export const getDetectorResults = (detectorResultsResponses: any[]) => {
  const detectorToResultsMap = {} as { [key: string]: any };
  detectorResultsResponses.forEach((response) => {
    const detectorId = get(response, 'hits.hits.0._source.detector_id', null);
    if (detectorId !== null) {
      detectorToResultsMap[detectorId] = response;
    }
  });
  return detectorToResultsMap;
};

// Append task-related info - task state & anomaly results of the task.
// If there is no related task info for a detector: set to default values of DISABLED state and 0 anomalies
export const appendTaskInfo = (
  detectorMap: { [key: string]: any },
  detectorToTaskMap: { [key: string]: any },
  detectorToResultsMap: { [key: string]: any }
) => {
  const detectorMapWithTaskInfo = {} as { [key: string]: Detector };
  const detectorsWithTasks = Object.keys(detectorToTaskMap);
  Object.keys(detectorMap).forEach((detectorId, index) => {
    if (!detectorsWithTasks.includes(detectorId)) {
      detectorMapWithTaskInfo[detectorId] = {
        ...detectorMap[detectorId],
        curState: DETECTOR_STATE.DISABLED,
        totalAnomalies: 0,
      };
    } else {
      const task = detectorToTaskMap[detectorId];
      const state = getTaskState(task);
      const totalAnomalies = get(
        detectorToResultsMap[detectorId],
        'hits.total.value',
        0
      );
      detectorMapWithTaskInfo[detectorId] = {
        ...detectorMap[detectorId],
        curState: state,
        totalAnomalies: totalAnomalies,
      };
    }
  });
  return detectorMapWithTaskInfo;
};

// Following checks/transformations need to be made here:
// - set to DISABLED if there is no existing task for this detector
// - set to UNEXPECTED_FAILURE if the task is in a FAILED state & the error message is unreadable / is a stack trace
// - set to INIT if the task is in a CREATED state
// - set to DISABLED if the task is in a STOPPED state
export const getTaskState = (task: any) => {
  const state = get(task, 'state', 'DISABLED');
  const errorMessage = processTaskError(get(task, 'error', ''));
  const updatedState =
    state === 'FAILED' && errorMessage.includes(STACK_TRACE_PATTERN)
      ? 'UNEXPECTED_FAILURE'
      : state === 'CREATED'
      ? 'INIT'
      : state === 'STOPPED'
      ? 'DISABLED'
      : state;
  //@ts-ignore
  return DETECTOR_STATE[updatedState];
};

export const processTaskError = (error: string) => {
  const errorWithPrefixRemoved = error.replace(OPENSEARCH_EXCEPTION_PREFIX, '');
  return isEmpty(errorWithPrefixRemoved) || errorWithPrefixRemoved.endsWith('.')
    ? errorWithPrefixRemoved
    : errorWithPrefixRemoved + '.';
};

// Filtering by 'is_latest=true' is not enough here. During backfilling of legacy
// realtime detectors on the backend, it is possible that multiple realtime
// tasks with 'is_latest=true' are created. We sort by latest execution_start_time
// (which is equivalent to it's creation timestamp), and only return the latest one.
export const getLatestDetectorTasksQuery = (realtime: boolean) => {
  const taskTypes = realtime ? REALTIME_TASK_TYPES : HISTORICAL_TASK_TYPES;
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
              is_latest: 'true',
            },
          },
          {
            terms: {
              task_type: taskTypes,
            },
          },
        ],
      },
    },
    aggs: {
      detectors: {
        terms: {
          field: 'detector_id',
          size: MAX_DETECTORS,
        },
        aggs: {
          latest_tasks: {
            top_hits: {
              size: 1,
              sort: {
                execution_start_time: SORT_DIRECTION.DESC,
              },
            },
          },
        },
      },
    },
  };
};

export const isRealTimeTask = (task: any) => {
  return get(task, 'task_type', '').includes(REALTIME_TASK_TYPE_PREFIX);
};

export const getFiltersFromEntityList = (entityListAsObj: object) => {
  let filters = [] as any[];
  Object.values(entityListAsObj).forEach((entity: Entity) => {
    filters.push({
      nested: {
        path: ENTITY_FIELD,
        query: {
          term: {
            [ENTITY_NAME_PATH_FIELD]: {
              value: entity.name,
            },
          },
        },
      },
    });
    filters.push({
      nested: {
        path: ENTITY_FIELD,
        query: {
          term: {
            [ENTITY_VALUE_PATH_FIELD]: {
              value: entity.value,
            },
          },
        },
      },
    });
  });
  return filters;
};

// Filtering by 'is_latest=true' is not enough here. During backfilling of legacy
// realtime detectors on the backend, it is possible that multiple realtime
// tasks with 'is_latest=true' are created. We sort by latest execution_start_time
// (which is equivalent to it's creation timestamp), and only return the latest one.
export const getLatestTaskForDetectorQuery = (
  detectorId: string,
  realtime: boolean
) => {
  const taskTypes = realtime ? REALTIME_TASK_TYPES : HISTORICAL_TASK_TYPES;
  return {
    size: 1,
    sort: {
      execution_start_time: SORT_DIRECTION.DESC,
    },
    query: {
      bool: {
        filter: [
          {
            term: {
              detector_id: detectorId,
            },
          },
          {
            term: {
              is_latest: 'true',
            },
          },
          {
            terms: {
              task_type: taskTypes,
            },
          },
        ],
      },
    },
  };
};
