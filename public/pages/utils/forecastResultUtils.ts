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
  ForecastEntity,
} from '../../../server/models/interfaces';
import {
  FORECASTER_DOC_FIELDS,
  SORT_DIRECTION,
} from '../../../server/utils/constants';
import {
  MAX_ANOMALIES,
} from '../../utils/constants';

/**
 * Builds search query parameters for retrieving forecast results within a specified date range.
 *
 * This function constructs a parameter object for querying a forecasting system, filtering results
 * by a given start and end time. It can limit results to specific entities if provided.
 *
 * In the context of forecast results, the startTime and endTime parameters are used to compare against the data_end_time.
 * plotTime coinciding with the data_end_time.
 * 
 * If we start/stop/start forecater, there maybe overlap in the data_end_time as we output history training data as well.
 * The dawnEpoch is used to filter out previous run and keep only current run's history training data.
 *
 * @param startTime - The epoch time (in milliseconds) marking the start of the date range for the query.
 * @param endTime - The epoch time (in milliseconds) marking the end of the date range for the query.
 * @param dawnEpoch - The epoch time (in milliseconds) marking the dawn of the execution end time range for the query.
 * @param entityList - Optional. An array of entities to filter the results. If omitted, results are not filtered
 *                     by entities. Default is `undefined`.
 * @param maxEntities - Optional. The maximum number of entities to return. If omitted, results are not filtered by entities. Default is `0`.
 * @returns An object containing the necessary parameters for the anomaly results search query. This object includes:
 *          - `from`: The starting index for fetching results (always set to 0).
 *          - `size`: The maximum number of anomalies to return (`MAX_ANOMALIES`).
 *          - `sortDirection`: The sorting order of results, set to descending (`SORT_DIRECTION.DESC`).
 *          - `sortField`: The field used to sort the data, set to data end time (`AD_DOC_FIELDS.DATA_END_TIME`).
 *          - `startTime`: Passed start time for the search range.
 *          - `endTime`: Passed end time for the search range.
 *          - `fieldName`: Field used to query the data, set to data end time (`AD_DOC_FIELDS.DATA_END_TIME`).
 *          - `entityList`: A JSON string representing the list of entities to filter the results by.
 *          - `dawnEpoch`: The epoch time (in milliseconds) marking the dawn of the execution end time range for the query.
 *          - `maxEntities`: The maximum number of entities to return. If omitted, results are not filtered by entities. Default is `0`.
 */
export const buildParamsForGetForecasterResultsWithDateRange = (
  startTime: number,
  endTime: number,
  dawnEpoch: number,
  maxEntities: number,
  entityList: ForecastEntity[] | undefined = undefined
) => {
  return {
    from: 0,
    size: MAX_ANOMALIES,
    sortDirection: SORT_DIRECTION.DESC,
    sortField: FORECASTER_DOC_FIELDS.DATA_END_TIME,
    startTime: startTime,
    endTime: endTime,
    fieldName: FORECASTER_DOC_FIELDS.DATA_END_TIME,
    entityList: JSON.stringify(entityList),
    dawnEpoch: dawnEpoch,
    maxEntities: maxEntities,
  };
};

/**
 * Composes a query to get the latest forecast run
 * @param taskId Optional task ID to filter results
 * @returns The query object
 */
export const composeLatestForecastRunQuery = (taskId?: string) => {
  const query = {
    size: 0,
    query: {
      bool: {
        must: [
          {
            exists: {
              field: FORECASTER_DOC_FIELDS.FORECAST_DATA_END_TIME
            }
          }
        ]
      }
    },
    aggs: {
      max_plot_time: {
        max: {
          field: FORECASTER_DOC_FIELDS.DATA_END_TIME
        }
      }
    }
  };
  
  // Add taskId filter if it's provided and not empty
  if (taskId !== undefined && taskId !== '') {
    query.query.bool.must.push({
      term: {
        task_id: taskId
      }
    });
  }
  
  return query;
};

/**
 * Parses the response from the latest forecast run query.
 * 
 * @param response - The response object from searchResults dispatch
 * @returns The maximum plot time value, or undefined if not found
 */
export const parseLatestForecastRunResponse = (response: any): number | undefined => {
  try {
    // Access the aggregation value using optional chaining
    const maxPlotTime = response?.response?.aggregations?.max_plot_time?.value;
    
    // Return undefined if maxPlotTime is null or undefined
    if (maxPlotTime == null) {
      console.warn('No max plot time found in response:', response);
      return undefined;
    }

    return maxPlotTime;
  } catch (error) {
    console.error('Error parsing latest forecast run response:', error);
    return undefined;
  }
};

export const ALL_CATEGORICAL_FIELDS = 'all';

export type VisualizationOptions = {
  filterByOption: string;
  filterByValue: string;
  sortByOption: string;
  thresholdValue: number;
  thresholdDirection: string;
  forecast_from: number | undefined;
  splitByOption: string;
  operatorValue: string;
  filterQuery: Record<string, any>;
  subaggregations: Array<{
    aggregation_query: Record<string, any>;
    order: string;
  }>;
};

/**
 * Constructs parameters for getTopForecastResults with default visualization settings
 * (minimum confidence interval width, split by all categorical fields)
 * 
 * @param forecaster - The forecaster object containing categoryField information
 * @param forecastFrom - The timestamp to use as forecast_from (typically maxPlotTime)
 * @returns Parameters object for getTopForecastResults
 */
export const buildVisualizationParams = (
  forecaster: { categoryField?: string[] } | undefined,
  visualizationOptions: VisualizationOptions,
  maxPlotTime: number,
  maxEntities: number,
) => {
  // Create parameters based on selected options
  const params: Record<string, any> = {
    split_by: visualizationOptions.splitByOption === ALL_CATEGORICAL_FIELDS ?
      (forecaster?.categoryField || []).join(',') :
      visualizationOptions.splitByOption,
    filter_by: visualizationOptions.filterByOption === 'builtin' ? 'BUILD_IN_QUERY' : 'CUSTOM_QUERY',
  };

  // Add build_in_query parameter if applicable
  if (visualizationOptions.filterByOption === 'builtin') {
    // Map the UI option to the API parameter value
    const buildInQueryMap: Record<string, string> = {
      'min_ci_width': 'MIN_CONFIDENCE_INTERVAL_WIDTH',
      'max_ci_width': 'MAX_CONFIDENCE_INTERVAL_WIDTH',
      'min_horizon': 'MIN_VALUE_WITHIN_THE_HORIZON',
      'max_horizon': 'MAX_VALUE_WITHIN_THE_HORIZON',
      'threshold_dist': 'DISTANCE_TO_THRESHOLD_VALUE'
    };

    params.build_in_query = buildInQueryMap[visualizationOptions.sortByOption];

    // If using threshold distance, add threshold parameters
    if (visualizationOptions.sortByOption === 'threshold_dist' && visualizationOptions.thresholdValue !== undefined) {
      params.threshold = visualizationOptions.thresholdValue;

      const operatorMap: Record<string, string> = {
        '>': 'GREATER_THAN',
        '<': 'LESS_THAN',
        '>=': 'GREATER_THAN_OR_EQUAL_TO',
        '<=': 'LESS_THAN_OR_EQUAL_TO',
        '==': 'EQUAL_TO'
      };
      params.relation_to_threshold = operatorMap[visualizationOptions.operatorValue] || 'GREATER_THAN';
    }
  } else if (visualizationOptions.filterByOption === 'custom') {
    // Add custom query parameters
    params.filter_query = visualizationOptions.filterQuery;
    params.subaggregations = visualizationOptions.subaggregations;

    // The visualization can display up to 5 time series at the same time
    params.size = maxEntities; // Default value, could be made configurable
  }

  if (maxPlotTime) {
    params.forecast_from = maxPlotTime;
  } else {
    throw new Error('No max plot time found when building visualization params');
  }
  
  return params;
};

/**
 * Builds a request to the forecast results search API.
 *
 * We add the "by-source" and "by-index" path segments to avoid conflicts like:
 *   server log [01:58:04.917] [fatal][root] Error:
 *   New route /api/forecasting/forecasters/results/_search/{resultIndex}
 *   conflicts with existing /api/forecasting/forecasters/results/_search/{dataSourceId}
 *
 * Usage scenarios:
 * 1. If no resultIndex and no dataSourceId are given:
 *    POST /forecasters/results/by-source/_search
 * 2. If only dataSourceId is given:
 *    POST /forecasters/results/by-source/{dataSourceId}/_search
 * 3. If only resultIndex is given:
 *    POST /forecasters/results/by-index/{resultIndex}/_search
 * 4. If both resultIndex and dataSourceId are given:
 *    POST /forecasters/results/by-index/{resultIndex}/by-source/{dataSourceId}/_search
 *
 * @param requestBody   The query body to send
 * @param resultIndex   Index to search (optional)
 * @param dataSourceId  Data source identifier (optional)
 */
export const extractEntitiesFromResponse = (response: any): ForecastEntity[] => {
  try {
    // Get buckets from response, default to empty array if not found
    const buckets = response?.response?.buckets || [];
    
    // Transform bucket keys into Entity array
    const entities: ForecastEntity[] = [];

    buckets.forEach(bucket => {
      if (bucket.key) {
        // Create a single ForecastEntity for each bucket
        const entity: ForecastEntity = {};

        // Add all key-value pairs from bucket.key to the entity
        Object.entries(bucket.key).forEach(([name, value]) => {
          // name is category field
          entity[name] = String(value); // Ensure value is a string
        });

        // Add the complete entity to the entities array
        entities.push(entity);
      }
    });

    return entities;
  } catch (error) {
    console.error('Error extracting entities from response:', error);
    return [];
  }
};
