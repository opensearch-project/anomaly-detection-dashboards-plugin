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

import { get, omit, isEmpty } from 'lodash';
import { ForecastEntity, InitProgress } from "../../models/interfaces";
import { FORECASTER_STATE, OPENSEARCH_EXCEPTION_PREFIX, FORECAST_REALTIME_TASK_TYPES, FORECAST_RUN_ONCE_TASK_TYPES, MAX_FORECASTER, SORT_DIRECTION, ENTITY_VALUE_PATH_FIELD, ENTITY_FIELD, ENTITY_NAME_PATH_FIELD } from '../../utils/constants';
import { mapKeysDeep, toCamel, toSnake } from "../../utils/helpers";

  export const convertForecastKeysToSnakeCase = (payload: any) => {
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

  export const processTaskError = (error: string) => {
    const errorWithPrefixRemoved = error.replace(OPENSEARCH_EXCEPTION_PREFIX, '');
    return isEmpty(errorWithPrefixRemoved) || errorWithPrefixRemoved.endsWith('.')
      ? errorWithPrefixRemoved
      : errorWithPrefixRemoved + '.';
  };
  
  // Following checks/transformations need to be made here:
  // - set to INACTIVE_NOT_STARTED if there is no existing task for this forecaster
  // - set to UNEXPECTED_FAILURE if the task is in a FAILED state & the error message is unreadable / is a stack trace
  // - set to INITIALIZING_FORECAST if the task is in a CREATED state
  // - set to INACTIVE_STOPPED if the task is in a STOPPED state
  // - override INACTIVE states (INACTIVE_STOPPED or INACTIVE_NOT_STARTED) with test-related states
  //   (INITIALIZING_TEST, TEST_COMPLETE, or INIT_TEST_FAILURE) if runOnceTask exists with these states
  export const combineTaskState = (realTimeTask?: any, runOnceTask?: any) => {
    console.log('realTimeTask', realTimeTask);
    console.log('runOnceTask', runOnceTask);
    const realTimeState = get(realTimeTask, 'state', 'INACTIVE_NOT_STARTED');
    const updatedStateString =
      realTimeState === 'CREATED'
        ? 'INITIALIZING_FORECAST'
        : realTimeState === 'STOPPED'
        ? 'INACTIVE_STOPPED'
        : realTimeState;
    //@ts-ignore
    let updatedState = FORECASTER_STATE[updatedStateString];
    console.log('updatedState', updatedState);

    // at the beginning, runOnceTask is inactive before going into initializing test state
    // if runOnceTask is not empty and the error is empty, set the state to INIT_TEST
    const runOnceState = get(runOnceTask, 'state', 'INACTIVE_NOT_STARTED');
    const runOnceStateError = get(runOnceTask, 'error', '');
    const updatedRunOnceStateString =
      runOnceState === 'INACTIVE' && runOnceStateError === ''
        ? 'INIT_TEST'
        : runOnceState;

    console.log('updatedRunOnceStateString', updatedRunOnceStateString);

    const realTimeLastUpdateTime = get(realTimeTask, 'last_update_time', 0);
    const runOnceLastUpdateTime = get(runOnceTask, 'last_update_time', 0);

    // Check if current state is INACTIVE and runOnceTask has a priority state
    // when realTimeTask is not updated for a while
    if (
      (updatedState === FORECASTER_STATE.INACTIVE_STOPPED || 
       updatedState === FORECASTER_STATE.INACTIVE_NOT_STARTED) &&
      runOnceTask &&
      runOnceLastUpdateTime > realTimeLastUpdateTime
    ) {      
      // Convert runOnceState to enum value before comparison
      const runOnceStateEnum = FORECASTER_STATE[updatedRunOnceStateString as keyof typeof FORECASTER_STATE];
      if (
        runOnceStateEnum === FORECASTER_STATE.INIT_TEST ||
        runOnceStateEnum === FORECASTER_STATE.TEST_COMPLETE ||
        runOnceStateEnum === FORECASTER_STATE.INIT_TEST_FAILED
      ) {
        updatedState = runOnceStateEnum;
      }
    }
    return updatedState;
  };

  export const getTaskState = (realTimeTask: any) => {
    const state = get(realTimeTask, 'state', 'INACTIVE_NOT_STARTED');
    const updatedStateString =
      state === 'CREATED'
        ? 'INITIALIZING_FORECAST'
        : state === 'STOPPED'
        ? 'INACTIVE_STOPPED'
        : state;
    //@ts-ignore
    return FORECASTER_STATE[updatedStateString];
  };

  export const convertForecastKeysToCamelCase = (response: object) => {
    let camelCaseResponse = {
      ...mapKeysDeep(
        omit(response, [
          'filter_query',
          'ui_metadata',
          'feature_query',
          'feature_attributes',
          'forecasterJob',
          'runOnceTask',
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
  
    if (!isEmpty(get(response, 'runOnceTask', {}))) {
      camelCaseResponse = {
        ...camelCaseResponse,
        //@ts-ignore
        taskId: get(response, 'runOnceTask.task_id'),
        taskState: getTaskState(get(response, 'runOnceTask', {})),
        taskProgress: get(response, 'runOnceTask.task_progress'),
        taskError: processTaskError(get(response, 'runOnceTask.error', '')),
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

// Filtering by 'is_latest=true' is not enough here. It is possible that multiple realtime
// tasks with 'is_latest=true' are created. We sort by latest execution_start_time
// (which is equivalent to it's creation timestamp), and only return the latest one.
export const getLatestForecasterTasksQuery = (realtime: boolean) => {
    const taskTypes = realtime ? FORECAST_REALTIME_TASK_TYPES : FORECAST_RUN_ONCE_TASK_TYPES;
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
        forecasters: {
          terms: {
            field: 'forecaster_id',
            size: MAX_FORECASTER,
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

  // Converts the static forecaster fields into camelcase. Ignores any job or task-related fields
export const convertStaticFieldsToCamelCase = (response: object) => {
    return {
      ...mapKeysDeep(
        omit(response, [
          'filter_query',
          'feature_query',
          'feature_attributes',
          'ui_metadata',
          'forecaster_job',
          'realtime_task',
          'run_once_task',
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
      lastUiBreakingChangeTime: get(response, 'last_ui_breaking_change_time'),
      lastUpdateTime: get(response, 'last_update_time'),
    };
  };

// Filtering by 'is_latest=true' is not enough here. It is possible that multiple realtime
// tasks with 'is_latest=true' are created. We sort by latest execution_start_time
// (which is equivalent to it's creation timestamp), and only return the latest one.
export const getLatestTaskForForecasterQuery = (
    forecasterId: string,
    realtime: boolean
  ) => {
    const taskTypes = realtime ? FORECAST_REALTIME_TASK_TYPES : FORECAST_RUN_ONCE_TASK_TYPES;
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
                forecaster_id: forecasterId,
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

  export const getTaskInitProgress = (task: any): InitProgress | undefined => {
    if (task?.init_progress !== undefined) {
      return {
        percentageStr: `${(get(task, 'init_progress', 0) * 100).toFixed(0)}%`,
        estimatedMinutesLeft: task.estimated_minutes_left,
      };
    }
    return undefined;
  };
  
  // Converts the task-related detector fields into camelcase
export const convertTaskAndJobFieldsToCamelCase = (
  realtimeTask: any,
  runOnceTask: any,
  forecasterJob: object
) => {

  // Populate Forecaster job fields
  return {
    enabled: get(forecasterJob, 'enabled', false),
    enabledTime: get(forecasterJob, 'enabled_time'),
    disabledTime: get(forecasterJob, 'disabled_time'),
    curState: combineTaskState(realtimeTask, runOnceTask),
    stateError: get(realtimeTask, 'error') || get(runOnceTask, 'error'),
    initProgress: getTaskInitProgress(realtimeTask),
    realTimeLastUpdateTime: get(realtimeTask, 'last_update_time'),
    runOnceLastUpdateTime: get(runOnceTask, 'last_update_time'),
    taskId: get(runOnceTask, 'task_id'),
    taskState: getTaskState(runOnceTask),
    taskProgress: get(runOnceTask, 'task_progress'),
    taskError: processTaskError(get(runOnceTask, 'error', '')),
  };
};
  
/**
 * Builds an OpenSearch query for matching multiple ForecastEntity objects
 * Each entity's key-value pairs are grouped with "must" clauses
 * Different entities are combined with "should" clauses
 */
export const buildEntityListQuery = (entityList: ForecastEntity[]) => {
  if (!entityList || entityList.length === 0) {
    return undefined;
  }

  // Create an array of bool queries - one for each entity
  const shouldClauses = entityList.map(entity => {
    // For each entity, create nested queries for each key-value pair
    const mustClauses = Object.entries(entity).map(([name, value]) => {
      return {
        nested: {
          path: "entity",
          query: {
            bool: {
              must: [
                {
                  term: { "entity.name": name }
                },
                {
                  term: { "entity.value": value }
                }
              ]
            }
          },
          ignore_unmapped: false,
          score_mode: "avg"
        }
      };
    });

    // All key-value pairs for this entity must match
    return {
      bool: {
        must: mustClauses
      }
    };
  });

  // At least one entity should match
  return {
    bool: {
      should: shouldClauses,
      minimum_should_match: 1
    }
  };
};
  
  