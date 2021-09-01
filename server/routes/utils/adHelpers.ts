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

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { get, omit, cloneDeep, isEmpty } from 'lodash';
import { AnomalyResults } from '../../models/interfaces';
import { GetDetectorsQueryParams, Detector } from '../../models/types';
import { mapKeysDeep, toCamel, toSnake } from '../../utils/helpers';
import {
  DETECTOR_STATE,
  STACK_TRACE_PATTERN,
  OPENSEARCH_EXCEPTION_PREFIX,
  REALTIME_TASK_TYPE_PREFIX,
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

// Currently: detector w/ detection date range is considered a 'historical' detector
export const getHistoricalDetectors = (detectors: Detector[]) => {
  return detectors.filter(
    (detector) => detector.detectionDateRange !== undefined
  );
};

// Currently: detector w/ no detection date range is considered a 'realtime' detector
export const getRealtimeDetectors = (detectors: Detector[]) => {
  return detectors.filter(
    (detector) => detector.detectionDateRange === undefined
  );
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
  return errorWithPrefixRemoved.endsWith('.')
    ? errorWithPrefixRemoved
    : errorWithPrefixRemoved + '.';
};

export const getLatestDetectorTasksQuery = () => {
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
              task_type: [
                'REALTIME_HC_DETECTOR',
                'REALTIME_SINGLE_ENTITY',
                'HISTORICAL_SINGLE_ENTITY',
                'HISTORICAL_HC_DETECTOR',
              ],
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
              size: 2,
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
