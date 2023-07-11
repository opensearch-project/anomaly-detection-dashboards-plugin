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

import moment from 'moment';
import {
  EntityAnomalySummaries,
  EntityAnomalySummary,
} from '../../../../server/models/interfaces';
import { AnomalyData, DetectorListItem } from '../../../models/interfaces';

export const FAKE_START_TIME = moment('2019-10-10T09:00:00');
export const FAKE_END_TIME = FAKE_START_TIME.clone().add(2, 'd');
export const FAKE_ANOMALY_START_TIME = FAKE_START_TIME.clone()
  .add(1, 'minutes')
  .valueOf();
export const FAKE_ANOMALY_END_TIME = FAKE_START_TIME.clone()
  .add(2, 'minutes')
  .valueOf();
export const FAKE_ANOMALY_PLOT_TIME = FAKE_START_TIME.clone()
  .add(90, 'seconds')
  .valueOf();
export const FAKE_DATE_RANGE = {
  startDate: FAKE_START_TIME.valueOf(),
  endDate: FAKE_END_TIME.valueOf(),
};
export const FAKE_SINGLE_FEATURE_VALUE = {
  data: 10,
  endTime: FAKE_ANOMALY_END_TIME,
  startTime: FAKE_ANOMALY_START_TIME,
  plotTime: FAKE_ANOMALY_PLOT_TIME,
};
export const FAKE_FEATURE_DATA = {
  testFeatureId: FAKE_SINGLE_FEATURE_VALUE,
};
export const FAKE_ENTITY = { name: 'entityName', value: 'entityValue' };
export const FAKE_ANOMALY_DATA = [
  {
    anomalyGrade: 0.3,
    confidence: 0.8,
    startTime: FAKE_ANOMALY_START_TIME,
    endTime: FAKE_ANOMALY_END_TIME,
    plotTime: FAKE_ANOMALY_PLOT_TIME,
    entity: [FAKE_ENTITY],
    features: FAKE_FEATURE_DATA,
  } as AnomalyData,
];

export const FAKE_ANOMALIES_RESULT = {
  anomalies: FAKE_ANOMALY_DATA,
  featureData: {
    testFeatureId: [FAKE_SINGLE_FEATURE_VALUE],
  },
};

export const FAKE_ENTITY_ANOMALY_SUMMARY = {
  startTime: FAKE_ANOMALY_START_TIME,
  maxAnomaly: 0.9,
  anomalyCount: 1,
} as EntityAnomalySummary;

export const FAKE_ENTITY_ANOMALY_SUMMARIES = {
  entityList: [FAKE_ENTITY],
  anomalySummaries: [FAKE_ENTITY_ANOMALY_SUMMARY],
} as EntityAnomalySummaries;

export const ANOMALY_RESULT_QUERY = {
  anomaly_grade: 0.10949221682655441,
  data_start_time: 1651817250642,
  data_end_time: 1651817310642,
  detector_id: 'gtU2l4ABuV34PY9ITTdm',
};
export const ANOMALY_RESULT_QUERY_PER_DETECTOR = {
  anomaly_grade: 0.10949221682655441,
  data_start_time: 1651817250642,
  data_end_time: 1651817310642,
  detector_id: 'gtU2l4ABuV34PY9ITTdm',
  name: 'test3',
};
export const SELECTED_DETECTORS = [
  {
    id: 'gtU2l4ABuV34PY9ITTdm',
    name: 'test2',
    indices: ['sample-host-health'],
    curState: 'Running',
    featureAttributes: [
      {
        featureId: 'gdU2l4ABuV34PY9ITTdf',
        featureName: 'f-1',
        featureEnabled: true,
        importance: 1,
        aggregationQuery: {
          f_1: {
            sum: {
              field: 'cpu_usage_percentage',
            },
          },
        },
      },
    ],
    totalAnomalies: 6,
    lastActiveAnomaly: 1651817250642,
    lastUpdateTime: 1651818220194,
  },
  {
    id: 'gtU2l4ABuV34PY9ITTdm',
    name: 'test3',
    indices: ['sample-host-health'],
    curState: 'Running',
    featureAttributes: [
      {
        featureId: 'gdU2l4ABuV34PY9ITTdf',
        featureName: 'f-1',
        featureEnabled: true,
        importance: 1,
        aggregationQuery: {
          f_1: {
            sum: {
              field: 'cpu_usage_percentage',
            },
          },
        },
      },
    ],
    totalAnomalies: 9,
    lastActiveAnomaly: 1651818220194,
    lastUpdateTime: 1651818220194,
  },
] as DetectorListItem[];

export const ANOMALY_RESULT_SUMMARY_DETECTOR_ID: string =
  'hNX8l4ABuV34PY9I1EAZ';

export const ANOMALY_RESULT_SUMMARY = {
  ok: true,
  response: {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 255,
        relation: 'eq',
      },
      max_score: 0,
      hits: [
        {
          _index: '.opendistro-anomaly-results-history-2022.05.06-1',
          _id: ANOMALY_RESULT_SUMMARY_DETECTOR_ID,
          _version: 1,
          _seq_no: 2980,
          _primary_term: 1,
          _score: 0,
          _source: {
            relevant_attribution: [
              {
                feature_id: 'j-fObYgB3BV2P4BXAga2',
                data: 0,
              },
              {
                feature_id: 'kOfObYgB3BV2P4BXAga5',
                data: 1,
              },
            ],
            detector_id: 'gtU2l4ABuV34PY9ITTdm',
            data_start_time: 1651817250642,
            data_end_time: 1651817310642,
            feature_data: [
              {
                feature_id: 'j-fObYgB3BV2P4BXAga2',
                feature_name: 'sum_http_4xx',
                data: 0,
              },
              {
                feature_id: 'kOfObYgB3BV2P4BXAga5',
                feature_name: 'sum_http_5xx',
                data: 3,
              },
            ],
            execution_start_time: 1651817370642,
            execution_end_time: 1651817370649,
            anomaly_score: 0.44207098120965693,
            anomaly_grade: 0.10949221682655441,
            confidence: 0.9821335094192676,
          },
          expected_values: [
            {
              likelihood: 1,
              value_list: [
                {
                  feature_id: 'j-fObYgB3BV2P4BXAga2',
                  data: 0,
                },
                {
                  feature_id: 'kOfObYgB3BV2P4BXAga5',
                  data: 0,
                },
              ],
            },
          ],
        },
      ],
    },
    aggregations: {
      max_confidence: {
        value: 0.9669652473591948,
      },
      max_anomaly_grade: {
        value: 1,
      },
      max_data_end_time: {
        value: 1685424000000,
        value_as_string: '2023-05-30T05:20:00.000Z',
      },
      avg_anomaly_grade: {
        value: 1,
      },
      min_confidence: {
        value: 0.41885100904406947,
      },
      count_anomalies: {
        value: 1,
      },
      min_anomaly_grade: {
        value: 1,
      },
    },
  },
};

export const NO_ANOMALIES_RESULT_RESPONSE = {
  ok: true,
  response: {
    took: 13,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 0,
        relation: 'eq',
      },
      max_score: null,
      hits: [],
    },
    aggregations: {
      max_confidence: {
        value: null,
      },
      max_anomaly_grade: {
        value: null,
      },
      max_data_end_time: {
        value: null,
      },
      avg_anomaly_grade: {
        value: null,
      },
      min_confidence: {
        value: null,
      },
      count_anomalies: {
        value: 0,
      },
      min_anomaly_grade: {
        value: null,
      },
    },
  },
};

export const PARSED_ANOMALIES: AnomalyData[] = [
  {
    anomalyGrade: 0.11,
    confidence: 0.98,
    contributions: {
      'j-fObYgB3BV2P4BXAga2': {
        attribution: undefined,
        name: 'sum_http_4xx',
      },
      kOfObYgB3BV2P4BXAga5: {
        attribution: 1,
        name: 'sum_http_5xx',
      },
    },
    endTime: 1651817310642,
    entity: undefined,
    plotTime: 1651817310642,
    startTime: 1651817250642,
  },
];
