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
  SORT_DIRECTION,
  OPENSEARCH_EXCEPTION_PREFIX,
  DETECTOR_STATE,
  REALTIME_TASK_TYPE_PREFIX,
  HISTORICAL_TASK_TYPE_PREFIX,
} from '../../../utils/constants';
import {
  convertDetectorKeysToCamelCase,
  convertDetectorKeysToSnakeCase,
  getResultAggregationQuery,
  convertPreviewInputKeysToSnakeCase,
  processTaskError,
  getTaskState,
  convertStaticFieldsToCamelCase,
  convertTaskAndJobFieldsToCamelCase,
} from '../adHelpers';

describe('adHelpers', () => {
  describe('convertPreviewInputKeysToSnakeCase', () => {
    test('should not convert field name to snake_case', () => {
      const snake = convertPreviewInputKeysToSnakeCase({
        periodStart: 1596309273336,
        periodEnd: 1596914073336,
        detector: {
          name: 'test2',
          description: 'test',
          timeField: '@timestamp',
          indices: ['metricbeat-7.8.1'],
          detectionInterval: {
            period: {
              interval: 1,
              unit: 'Minutes',
            },
          },
          windowDelay: {
            period: {
              interval: 1,
              unit: 'Minutes',
            },
          },
          filterQuery: {
            bool: {
              filter: [
                {
                  term: {
                    'host.name': {
                      value: 'myserver',
                    },
                  },
                },
              ],
            },
          },
          featureAttributes: [
            {
              featureId: '9lAlx3MBdAn13oNrKKPk',
              featureName: 'F1',
              featureEnabled: true,
              importance: 1,
              aggregationQuery: {
                f_1: {
                  avg: {
                    field: 'system.cpu.total.pct',
                  },
                },
              },
            },
          ],
          uiMetadata: {
            features: {
              F1: {
                featureType: 'simple_aggs',
                aggregationBy: 'avg',
                aggregationOf: 'system.cpu.total.pct',
              },
            },
            filters: [
              {
                fieldInfo: [
                  {
                    label: 'host.name',
                    type: 'keyword',
                  },
                ],
                fieldValue: 'myserver',
                operator: 'is',
              },
            ],
            filterType: 'simple_filter',
          },
        },
      });
      expect(snake).toEqual({
        period_start: 1596309273336,
        period_end: 1596914073336,
        detector: {
          name: 'test2',
          description: 'test',
          time_field: '@timestamp',
          indices: ['metricbeat-7.8.1'],
          detection_interval: {
            period: {
              interval: 1,
              unit: 'Minutes',
            },
          },
          window_delay: {
            period: {
              interval: 1,
              unit: 'Minutes',
            },
          },
          filter_query: {
            bool: {
              filter: [
                {
                  term: {
                    'host.name': {
                      value: 'myserver',
                    },
                  },
                },
              ],
            },
          },
          feature_attributes: [
            {
              feature_id: '9lAlx3MBdAn13oNrKKPk',
              feature_name: 'F1',
              feature_enabled: true,
              importance: 1,
              aggregation_query: {
                f_1: {
                  avg: {
                    field: 'system.cpu.total.pct',
                  },
                },
              },
            },
          ],
          ui_metadata: {
            features: {
              F1: {
                featureType: 'simple_aggs',
                aggregationBy: 'avg',
                aggregationOf: 'system.cpu.total.pct',
              },
            },
            filters: [
              {
                fieldInfo: [
                  {
                    label: 'host.name',
                    type: 'keyword',
                  },
                ],
                fieldValue: 'myserver',
                operator: 'is',
              },
            ],
            filterType: 'simple_filter',
          },
        },
      });
    });
  });

  describe('convertDetectorKeysToSnakeCase', () => {
    test('should convert keys to snake_case', () => {
      const snake = convertDetectorKeysToSnakeCase({ helloWorld: 'value' });
      expect(snake).toEqual({
        hello_world: 'value',
        filter_query: {},
        ui_metadata: {},
        feature_attributes: [],
      });
    });
    test('should not convert keys to snake_case for filterQuery and features aggregation query', () => {
      const snake = convertDetectorKeysToSnakeCase({
        helloWorld: 'value',
        filterQuery: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        featureAttributes: [
          {
            featureId: 'WDO-lm0BL33kEAPF5moe',
            featureName: 'Hello World',
            featureEnabled: true,
            aggregationQuery: {
              hello_world: {
                avg: {
                  field: 'bytes',
                },
              },
            },
          },
        ],
      });
      expect(snake).toEqual({
        hello_world: 'value',
        feature_attributes: [
          {
            feature_id: 'WDO-lm0BL33kEAPF5moe',
            feature_name: 'Hello World',
            feature_enabled: true,
            aggregation_query: {
              hello_world: {
                avg: {
                  field: 'bytes',
                },
              },
            },
          },
        ],
        filter_query: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        ui_metadata: {},
      });
    });

    test('should not replace dot in filterQuery and features aggregation query', () => {
      const snake = convertDetectorKeysToSnakeCase({
        helloWorld: 'value',
        filterQuery: {
          bool: {
            filter: [
              {
                term: {
                  'host.name': { value: 'myserver' },
                },
              },
            ],
          },
        },
        featureAttributes: [
          {
            featureId: 'WDO-lm0BL33kEAPF5moe',
            featureName: 'Hello World',
            featureEnabled: true,
            aggregationQuery: {
              hello_world: {
                avg: {
                  field: 'system.cpu.total.pct',
                },
              },
            },
          },
        ],
      });
      expect(snake).toEqual({
        hello_world: 'value',
        feature_attributes: [
          {
            feature_id: 'WDO-lm0BL33kEAPF5moe',
            feature_name: 'Hello World',
            feature_enabled: true,
            aggregation_query: {
              hello_world: {
                avg: {
                  field: 'system.cpu.total.pct',
                },
              },
            },
          },
        ],
        filter_query: {
          bool: {
            filter: [
              {
                term: {
                  'host.name': { value: 'myserver' },
                },
              },
            ],
          },
        },
        ui_metadata: {},
      });
    });

    test('should not convert keys to snake_case for uiMetadata', () => {
      const snake = convertDetectorKeysToSnakeCase({
        helloWorld: 'value',
        filterQuery: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        uiMetadata: { newFeatures: [{ featureName: 'Name' }] },
      });
      expect(snake).toEqual({
        hello_world: 'value',
        feature_attributes: [],
        filter_query: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        ui_metadata: { newFeatures: [{ featureName: 'Name' }] },
      });
    });
  });
  describe('convertDetectorKeysToCamelCase', () => {
    test('should convert keys to camelCase', () => {
      const camelCase = convertDetectorKeysToCamelCase({
        hello_world: 'value',
        filter_query: {},
        ui_metadata: {},
      });
      expect(camelCase).toEqual({
        helloWorld: 'value',
        filterQuery: {},
        uiMetadata: {},
        featureAttributes: [],
        enabled: false,
        disabledTime: undefined,
        enabledTime: undefined,
        categoryField: undefined,
      });
    });
    test('should not convert keys to camelCase for filterQuery', () => {
      const camelCase = convertDetectorKeysToCamelCase({
        hello_world: 'value',
        feature_attributes: [
          {
            feature_id: 'WDO-lm0BL33kEAPF5moe',
            feature_name: 'Hello World',
            feature_enabled: true,
            aggregation_query: {
              hello_world: {
                avg: {
                  field: 'bytes',
                },
              },
            },
          },
        ],
        filter_query: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        ui_metadata: {},
      });
      expect(camelCase).toEqual({
        helloWorld: 'value',
        disabledTime: undefined,
        enabled: false,
        enabledTime: undefined,
        featureAttributes: [
          {
            featureId: 'WDO-lm0BL33kEAPF5moe',
            featureName: 'Hello World',
            featureEnabled: true,
            aggregationQuery: {
              hello_world: {
                avg: {
                  field: 'bytes',
                },
              },
            },
          },
        ],
        filterQuery: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        uiMetadata: {},
        categoryField: undefined,
      });
    });

    test('should not convert keys to camelCase for uiMetadata', () => {
      const camelCase = convertDetectorKeysToCamelCase({
        hello_world: 'value',
        filter_query: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        ui_metadata: { newFeatures: [{ featureName: 'Name' }] },
      });
      expect(camelCase).toEqual({
        helloWorld: 'value',
        filterQuery: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        uiMetadata: { newFeatures: [{ featureName: 'Name' }] },
        featureAttributes: [],
        enabled: false,
        disabledTime: undefined,
        enabledTime: undefined,
        categoryField: undefined,
      });
    });
  });
  describe('getResultAggregationQuery', () => {
    test('should return query without sorting', () => {
      const aggsQuery = getResultAggregationQuery(
        ['detector_1', 'detector_2'],
        {
          from: 0,
          size: 20,
          search: '',
          indices: '',
          sortField: 'name',
          sortDirection: SORT_DIRECTION.ASC,
        }
      );
      expect(aggsQuery).toEqual({
        size: 0,
        query: {
          bool: {
            must: [
              { terms: { detector_id: ['detector_1', 'detector_2'] } },
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
              size: 20,
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
      });
    });
    test('should return query with sorting on last 24 hours anomalies', () => {
      const aggsQuery = getResultAggregationQuery(
        ['detector_1', 'detector_2'],
        {
          from: 0,
          size: 20,
          search: '',
          indices: '',
          sortField: 'totalAnomalies',
          sortDirection: SORT_DIRECTION.ASC,
        }
      );
      expect(aggsQuery).toEqual({
        size: 0,
        query: {
          bool: {
            must: [
              { terms: { detector_id: ['detector_1', 'detector_2'] } },
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
              size: 20,
              order: {
                total_anomalies_in_24hr: 'asc',
              },
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
      });
    });
    test('should return query with sorting on latest_anomaly_time', () => {
      const aggsQuery = getResultAggregationQuery(['detector_1'], {
        from: 0,
        size: 20,
        search: '',
        indices: '',
        sortField: 'latestAnomalyTime',
        sortDirection: SORT_DIRECTION.DESC,
      });
      expect(aggsQuery).toEqual({
        size: 0,
        query: {
          bool: {
            must: [
              { terms: { detector_id: ['detector_1'] } },
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
              size: 20,
              order: {
                latest_anomaly_time: 'desc',
              },
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
      });
    });
    test('should return query with correct from in term aggregation', () => {
      const aggsQuery = getResultAggregationQuery(['detector_1'], {
        from: 10,
        size: 20,
        search: '',
        indices: '',
        sortField: 'latestAnomalyTime',
        sortDirection: SORT_DIRECTION.DESC,
      });
      expect(aggsQuery).toEqual({
        size: 0,
        query: {
          bool: {
            must: [
              { terms: { detector_id: ['detector_1'] } },
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
              size: 30,
              order: {
                latest_anomaly_time: 'desc',
              },
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
      });
    });
  });
  describe('getTaskState', () => {
    test('should convert to disabled if no task', () => {
      const task = null;
      expect(getTaskState(task)).toEqual(DETECTOR_STATE.DISABLED);
    });
    test('should convert to unexpected failure if failed and error message is stack trace', () => {
      const task = {
        state: 'FAILED',
        error: `at some.stack.trace(SomeFile.java:50)`,
      };
      expect(getTaskState(task)).toEqual(DETECTOR_STATE.UNEXPECTED_FAILURE);
    });
    test('should convert to failed if failed and error message is not stack trace', () => {
      const task = {
        state: 'FAILED',
        error: 'Some regular error message',
      };
      expect(getTaskState(task)).toEqual(DETECTOR_STATE.FAILED);
    });
    test('should convert to initializing if in created state', () => {
      const task = {
        state: 'CREATED',
      };
      expect(getTaskState(task)).toEqual(DETECTOR_STATE.INIT);
    });
    test('should convert to disabled if in stopped state', () => {
      const task = {
        state: 'STOPPED',
      };
      expect(getTaskState(task)).toEqual(DETECTOR_STATE.DISABLED);
    });
    test('should not convert if in running state', () => {
      const task = {
        state: 'RUNNING',
      };
      expect(getTaskState(task)).toEqual(DETECTOR_STATE.RUNNING);
    });
    test('should not convert if in finished state', () => {
      const task = {
        state: 'FINISHED',
      };
      expect(getTaskState(task)).toEqual(DETECTOR_STATE.FINISHED);
    });
  });
  describe('processTaskError', () => {
    test('should return empty if error is empty', () => {
      expect(processTaskError('')).toEqual('');
    });
    test('should add punctuation if none exists', () => {
      expect(processTaskError('Some failure')).toEqual('Some failure.');
    });
    test('should not add punctuation if it exists', () => {
      expect(processTaskError('Some failure.')).toEqual('Some failure.');
    });
    test('should remove OpenSearch exception prefix if it exists', () => {
      expect(
        processTaskError(OPENSEARCH_EXCEPTION_PREFIX + 'Some failure.')
      ).toEqual('Some failure.');
    });
  });
  describe('convertStaticFieldsToCamelCase', () => {
    test('should convert keys to camelCase, set default fields to empty values', () => {
      const camelCase = convertStaticFieldsToCamelCase({
        hello_world: 'value',
      });
      expect(camelCase).toEqual({
        helloWorld: 'value',
        filterQuery: {},
        featureAttributes: [],
        uiMetadata: {},
      });
    });
    test('should ignore task-and-job-related fields', () => {
      const camelCase = convertStaticFieldsToCamelCase({
        hello_world: 'value',
        anomaly_detector_job: 'value',
        anomaly_detection_task: 'value',
        realtime_detection_task: 'value',
        historical_analysis_task: 'value',
      });
      expect(camelCase).toEqual({
        helloWorld: 'value',
        filterQuery: {},
        featureAttributes: [],
        uiMetadata: {},
      });
    });
    test('should convert filter query correctly', () => {
      const camelCase = convertStaticFieldsToCamelCase({
        feature_attributes: [
          {
            feature_id: 'WDO-lm0BL33kEAPF5moe',
            feature_name: 'Hello World',
            feature_enabled: true,
            aggregation_query: {
              hello_world: {
                avg: {
                  field: 'bytes',
                },
              },
            },
          },
        ],
        filter_query: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        ui_metadata: {
          features: {
            f: {
              aggregation_by: 'sum',
              aggregation_of: 'FlightDelayMin',
              feature_type: 'simple_aggs',
            },
          },
          filters: [
            {
              query: '',
              label: '',
              filter_type: 'simple_filter',
              field_info: [
                {
                  label: 'test-label',
                  type: 'boolean',
                },
              ],
              field_value: 'false',
              operator: 'is',
            },
          ],
        },
      });
      expect(camelCase).toEqual({
        featureAttributes: [
          {
            featureId: 'WDO-lm0BL33kEAPF5moe',
            featureName: 'Hello World',
            featureEnabled: true,
            aggregationQuery: {
              hello_world: {
                avg: {
                  field: 'bytes',
                },
              },
            },
          },
        ],
        filterQuery: {
          query: {
            aggs: { sum_aggregation: { sum: { field: 'totalSales' } } },
          },
        },
        uiMetadata: {
          features: {
            f: {
              aggregation_by: 'sum',
              aggregation_of: 'FlightDelayMin',
              feature_type: 'simple_aggs',
            },
          },
          filters: [
            {
              query: '',
              label: '',
              filter_type: 'simple_filter',
              field_info: [
                {
                  label: 'test-label',
                  type: 'boolean',
                },
              ],
              field_value: 'false',
              operator: 'is',
            },
          ],
        },
      });
    });
  });
  describe('convertTaskAndJobFieldsToCamelcase', () => {
    test('only realtime task and job passed', () => {
      const response = convertTaskAndJobFieldsToCamelCase(
        {
          id: 'test-realtime',
          execution_start_time: 1,
          task_type: REALTIME_TASK_TYPE_PREFIX,
          state: 'RUNNING',
        },
        undefined,
        {
          enabled: true,
          enabled_time: 1,
          disabled_time: 2,
        }
      );
      expect(response).toEqual({
        curState: 'Running',
        stateError: '',
        initProgress: undefined,
        enabled: true,
        enabledTime: 1,
        disabledTime: 2,
        taskError: '',
        taskId: undefined,
        taskProgress: undefined,
        taskState: 'Stopped',
      });
    });
    test('realtime task, historical task, & job passed', () => {
      const response = convertTaskAndJobFieldsToCamelCase(
        {
          id: 'test-realtime',
          execution_start_time: 1,
          task_type: REALTIME_TASK_TYPE_PREFIX,
          state: 'RUNNING',
        },
        {
          id: 'test-historical',
          execution_start_time: 1,
          task_type: HISTORICAL_TASK_TYPE_PREFIX,
          detection_date_range: {
            start_time: 1,
            end_time: 2,
          },
          state: 'FINISHED',
          task_progress: 1,
        },
        {
          enabled: true,
          enabled_time: 1,
          disabled_time: 2,
        }
      );
      expect(response).toEqual({
        curState: 'Running',
        detectionDateRange: {
          startTime: 1,
          endTime: 2,
        },
        stateError: '',
        initProgress: undefined,
        enabled: true,
        enabledTime: 1,
        disabledTime: 2,
        taskError: '',
        taskId: 'test-historical',
        taskProgress: 1,
        taskState: 'Finished',
      });
    });
    test('just job passed (old realtime detector)', () => {
      const response = convertTaskAndJobFieldsToCamelCase(
        undefined,
        undefined,
        {
          enabled: true,
          enabled_time: 1,
          disabled_time: 2,
        }
      );
      expect(response).toEqual({
        curState: 'Running',
        enabled: true,
        enabledTime: 1,
        disabledTime: 2,
        taskId: undefined,
        taskError: '',
        taskProgress: undefined,
        taskState: 'Stopped',
      });
    });
  });
});
