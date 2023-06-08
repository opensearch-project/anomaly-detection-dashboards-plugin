/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  visualizeAnomalyResultForXYChart,
  getLatestAnomalyResultsByTimeRange,
  getLatestAnomalyResultsForDetectorsByTimeRange,
} from '../utils';
import {
  SELECTED_DETECTORS,
  ANOMALY_RESULT_QUERY,
  ANOMALY_RESULT_QUERY_PER_DETECTOR,
} from '../../../../pages/utils/__tests__/constants';
const anomalyResult = {
  detector_id: 'gtU2l4ABuV34PY9ITTdm',
  anomaly_grade: 0.10949221682655441,
  data_start_time: 1651804360194,
  data_end_time: 1651804420194,
  name: 'test2',
};
const visualizedAnomalyResult = {
  anomaly_grade: '0.11',
  data_end_time: 1651804420194,
  data_start_time: 1651804360194,
  detector_id: 'gtU2l4ABuV34PY9ITTdm',
  name: 'test2',
  // plot time calculated using Math.floor(plotTime / MIN_IN_MILLI_SECS) * MIN_IN_MILLI_SECS
  plot_time: 1651804380000,
};

const buildQueryInput = {
  timeRange: '30m',
  from: 0,
  threshold: 10,
  checkLastIndexOnly: false,
};

const searchResponseGetLatestAnomalyResults = {
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
      max_score: null,
      hits: [
        {
          _index: '.opendistro-anomaly-results-history-2022.05.06-1',
          _id: 'hNX8l4ABuV34PY9I1EAZ',
          _version: 1,
          _seq_no: 2980,
          _primary_term: 1,
          _score: null,
          _source: {
            detector_id: 'gtU2l4ABuV34PY9ITTdm',
            schema_version: 5,
            data_start_time: 1651817250642,
            data_end_time: 1651817310642,
            feature_data: [
              {
                feature_id: 'W9U0l4ABuV34PY9IUzdM',
                feature_name: 'f-1',
                data: 1,
              },
            ],
            execution_start_time: 1651817370642,
            execution_end_time: 1651817370649,
            anomaly_score: 0.44207098120965693,
            anomaly_grade: 0.10949221682655441,
            confidence: 0.9821335094192676,
            threshold: 4.239534075827808,
          },
          sort: [1651817250642],
        },
      ],
    },
  },
};

describe('visualizeAnomalyResultForXYChart', () => {
  test('should return chart object', () => {
    expect(visualizeAnomalyResultForXYChart(anomalyResult)).toStrictEqual(
      visualizedAnomalyResult
    );
  });
});

describe('get latest anomaly result by time range', () => {
  test('get latest by time range only ', async () => {
    const response = await getLatestAnomalyResultsByTimeRange(
      jest.fn(),
      '30m',
      jest.fn().mockResolvedValue(searchResponseGetLatestAnomalyResults),
      -1,
      1,
      true,
      'opensearch-ad-plugin-result-*',
      false
    );
    expect(response[0]).toStrictEqual(ANOMALY_RESULT_QUERY);
  }, 10000);
});
describe('get latest anomaly result for detectors', () => {
  test('get latest by detectors and time range ', async () => {
    const response = await getLatestAnomalyResultsForDetectorsByTimeRange(
      jest.fn(),
      SELECTED_DETECTORS,
      '30m',
      jest.fn().mockResolvedValue(searchResponseGetLatestAnomalyResults),
      -1,
      10000,
      1,
      true,
      'opensearch-ad-plugin-result-*',
      false
    );
    expect(response[0]).toStrictEqual(ANOMALY_RESULT_QUERY_PER_DETECTOR);
  }, 10000);
});
