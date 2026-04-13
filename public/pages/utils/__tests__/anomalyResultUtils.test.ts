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
  getFeatureMissingDataAnnotations,
  getFeatureDataPointsForDetector,
  parsePureAnomalies,
  buildParamsForGetAnomalyResultsWithDateRange,
  transformEntityListsForHeatmap,
  convertHeatmapCellEntityStringToEntityList,
  calculateTimeWindowsWithMaxDataPoints,
  prepareDataForLiveChart,
  generateAnomalyAnnotations,
  filterAnomaliesWithDateRange,
  filterWithDateRange,
  convertToEntityString,
  convertToCategoryFieldString,
  convertToCategoryFieldAndEntityString,
  entityListsMatch,
  flattenData,
  parseAnomalySummary,
  getAnomalyDataRangeQuery,
  parseHistoricalAggregatedAnomalies,
  parseBucketizedAnomalyResults,
  parseTopChildEntityCombos,
  getQueryParamsForLiveAnomalyResults,
  prepareDataForChart,
} from '../anomalyResultUtils';
import { getRandomDetector } from '../../../redux/reducers/__tests__/utils';
import {
  UNITS,
  Detector,
  FeatureAttributes,
  AnomalyData,
} from '../../../models/interfaces';
import { ANOMALY_RESULT_SUMMARY, PARSED_ANOMALIES } from './constants';
import { NO_ANOMALIES_RESULT_RESPONSE } from './constants';
import { MAX_ANOMALIES } from '../../../utils/constants';
import {
  SORT_DIRECTION,
  AD_DOC_FIELDS,
} from '../../../../server/utils/constants';
import { Entity } from '../../../../server/models/interfaces';
import { DateRange } from '../../../models/interfaces';
import { NUM_CELLS } from '../../AnomalyCharts/utils/anomalyChartUtils';

describe('anomalyResultUtils', () => {
  let randomDetector_20_min: Detector;
  let randomDetector_20_sec: Detector;
  let feature_id = 'deny_max';
  const startTime = 1609459200000; // January 1, 2021
  const endTime = 1609545600000; // January 2, 2021

  beforeAll(() => {
    randomDetector_20_min = {
      ...getRandomDetector(true),
      detectionInterval: {
        period: {
          interval: 1,
          unit: UNITS.MINUTES,
        },
      },
      windowDelay: {
        period: {
          interval: 20,
          unit: UNITS.MINUTES,
        },
      },
      featureAttributes: [
        {
          featureId: feature_id,
          featureName: feature_id,
          featureEnabled: true,
        },
      ] as FeatureAttributes[],
    };

    randomDetector_20_sec = {
      ...getRandomDetector(true),
      detectionInterval: {
        period: {
          interval: 1,
          unit: UNITS.MINUTES,
        },
      },
      windowDelay: {
        period: {
          interval: 20,
          unit: UNITS.SECONDS,
        },
      },
      featureAttributes: [
        {
          featureId: feature_id,
          featureName: feature_id,
          featureEnabled: true,
        },
      ] as FeatureAttributes[],
    };
  });
  describe('getFeatureDataPointsForDetector', () => {
    test('returns no missing data with 20 minute window delay', () => {
      expect(
        getFeatureDataPointsForDetector(
          randomDetector_20_min,
          {
            deny_max: [
              {
                startTime: 1655253197686,
                endTime: 1655253257686,
                plotTime: 1655253257686,
                data: 13451,
              },
              {
                startTime: 1655253137689,
                endTime: 1655253197689,
                plotTime: 1655253197689,
                data: 10973,
              },
              {
                startTime: 1655253077698,
                endTime: 1655253137698,
                plotTime: 1655253137698,
                data: 11777,
              },
              {
                startTime: 1655253017690,
                endTime: 1655253077690,
                plotTime: 1655253077690,
                data: 21588,
              },
            ],
          },
          randomDetector_20_min.detectionInterval.period.interval,
          {
            startDate: 1655252995079,
            endDate: 1655253295079,
          },
          true
        )
      ).toEqual({
        deny_max: [
          {
            isMissing: false,
            plotTime: 1655253060000,
            startTime: 1655253000000,
            endTime: 1655253060000,
          },
          {
            isMissing: false,
            plotTime: 1655253120000,
            startTime: 1655253060000,
            endTime: 1655253120000,
          },
          {
            isMissing: false,
            plotTime: 1655253180000,
            startTime: 1655253120000,
            endTime: 1655253180000,
          },
        ],
      });
    });
    test('returns missing data with 20 minute window delay', () => {
      expect(
        getFeatureDataPointsForDetector(
          randomDetector_20_min,
          {
            feature_id: [],
          },
          randomDetector_20_min.detectionInterval.period.interval,
          {
            startDate: 1655252995079,
            endDate: 1655253295079,
          },
          true
        )
      ).toEqual({
        deny_max: [
          {
            isMissing: true,
            plotTime: 1655253060000,
            startTime: 1655253000000,
            endTime: 1655253060000,
          },
          {
            isMissing: true,
            plotTime: 1655253120000,
            startTime: 1655253060000,
            endTime: 1655253120000,
          },
          {
            isMissing: true,
            plotTime: 1655253180000,
            startTime: 1655253120000,
            endTime: 1655253180000,
          },
        ],
      });
    });
    test('returns missing data with 20 seconds window delay', () => {
      expect(
        getFeatureDataPointsForDetector(
          randomDetector_20_sec,
          {
            deny_max: [
              {
                startTime: 1655245177235,
                endTime: 1655245237235,
                plotTime: 1655245237235,
                data: 14719,
              },
              {
                startTime: 1655245117232,
                endTime: 1655245177232,
                plotTime: 1655245177232,
                data: 14476,
              },
            ],
          },
          randomDetector_20_sec.detectionInterval.period.interval,
          {
            startDate: 1655244944254,
            endDate: 1655245244254,
          },
          true
        )
      ).toEqual({
        deny_max: [
          {
            isMissing: true,
            plotTime: 1655245020000,
            startTime: 1655244960000,
            endTime: 1655245020000,
          },
          {
            isMissing: true,
            plotTime: 1655245080000,
            startTime: 1655245020000,
            endTime: 1655245080000,
          },
          {
            isMissing: true,
            plotTime: 1655245140000,
            startTime: 1655245080000,
            endTime: 1655245140000,
          },
        ],
      });
    });
    test('returns partially missing data with 20 seconds window delay', () => {
      expect(
        getFeatureDataPointsForDetector(
          randomDetector_20_sec,
          {
            deny_max: [
              {
                startTime: 1655245357224,
                endTime: 1655245417224,
                plotTime: 1655245417224,
                data: 8675,
              },
              {
                startTime: 1655245297232,
                endTime: 1655245357232,
                plotTime: 1655245357232,
                data: 9397,
              },
              {
                startTime: 1655245237231,
                endTime: 1655245297231,
                plotTime: 1655245297231,
                data: 12102,
              },
              {
                startTime: 1655245177235,
                endTime: 1655245237235,
                plotTime: 1655245237235,
                data: 14719,
              },
            ],
          },
          randomDetector_20_sec.detectionInterval.period.interval,
          {
            startDate: 1655245124258,
            endDate: 1655245424258,
          },
          true
        )
      ).toEqual({
        deny_max: [
          {
            isMissing: true,
            plotTime: 1655245200000,
            startTime: 1655245140000,
            endTime: 1655245200000,
          },
          {
            isMissing: false,
            plotTime: 1655245260000,
            startTime: 1655245200000,
            endTime: 1655245260000,
          },
          {
            isMissing: false,
            plotTime: 1655245320000,
            startTime: 1655245260000,
            endTime: 1655245320000,
          },
        ],
      });
    });
  });
  describe('getFeatureMissingDataAnnotations', () => {
    test('returns no missing data annotation when latest 5 minutes are missing but frequency is 5 minutes', () => {
      const MIN = 60 * 1000;
      const BASE = 1587431400000;

      // Feature data for the first 5 minutes only; last 5 minutes are missing
      const featureData = Array.from({ length: 5 })
        .map((_, i) => {
          const startTime = BASE + i * MIN;
          const endTime = startTime + MIN;
          return {
            startTime,
            endTime,
            plotTime: endTime,
            data: 1,
          };
        })
        .reverse();

      // Detection interval is 1 minute; frequency is 5 minutes
      const interval = 1;
      const windowDelay = { interval: 0, unit: UNITS.MINUTES };
      const queryDateRange = { startDate: BASE, endDate: BASE + 10 * MIN };
      const displayDateRange = queryDateRange;

      const annotations = getFeatureMissingDataAnnotations(
        featureData as any,
        interval,
        windowDelay as any,
        queryDateRange as any,
        displayDateRange as any,
        false,
        5 // frequency in minutes
      );

      expect(annotations).toEqual([]);
    });
    test('returns missing data annotation with 20 seconds window delay', () => {
      expect(
        getFeatureMissingDataAnnotations(
          [
            {
              startTime: 1654731937236,
              endTime: 1654731997236,
              plotTime: 1654731997236,
              data: 9998,
            },
            {
              startTime: 1654731877250,
              endTime: 1654731937250,
              plotTime: 1654731937250,
              data: 14841,
            },
            {
              startTime: 1654731817236,
              endTime: 1654731877236,
              plotTime: 1654731877236,
              data: 6777,
            },
            {
              startTime: 1654731757234,
              endTime: 1654731817234,
              plotTime: 1654731817234,
              data: 15443,
            },
            {
              startTime: 1654731697230,
              endTime: 1654731757230,
              plotTime: 1654731757230,
              data: 9612,
            },
            {
              startTime: 1654731637234,
              endTime: 1654731697234,
              plotTime: 1654731697234,
              data: 13992,
            },
            {
              startTime: 1654731577232,
              endTime: 1654731637232,
              plotTime: 1654731637232,
              data: 10522,
            },
            {
              startTime: 1654731517232,
              endTime: 1654731577232,
              plotTime: 1654731577232,
              data: 10945,
            },
          ],
          randomDetector_20_sec.detectionInterval.period.interval,
          randomDetector_20_sec.windowDelay.period,
          {
            startDate: 1654731477228,
            endDate: 1654731697232,
          },
          {
            startDate: 1654731477228,
            endDate: 1654731697232,
          },
          false
        )
      ).toEqual([
        // our tests use UTC time zone. But in real application, it is local time.
        {
          dataValue: 1654731540000,
          details:
            'There is feature data point missing between 06/08/22 11:38 PM and 06/08/22 11:39 PM',
          header: '06/08/22 11:39:00 PM',
        },
      ]);
    });
    test('returns no missing data annotation with 20 seconds window delay', () => {
      expect(
        getFeatureMissingDataAnnotations(
          [
            {
              startTime: 1655249917234,
              endTime: 1655249977234,
              plotTime: 1655249977234,
              data: 8326,
            },
            {
              startTime: 1655249857233,
              endTime: 1655249917233,
              plotTime: 1655249917233,
              data: 10953,
            },
            {
              startTime: 1655249797235,
              endTime: 1655249857235,
              plotTime: 1655249857235,
              data: 14106,
            },
            {
              startTime: 1655249737234,
              endTime: 1655249797234,
              plotTime: 1655249797234,
              data: 15453,
            },
            {
              startTime: 1655249677234,
              endTime: 1655249737234,
              plotTime: 1655249737234,
              data: 8721,
            },
            {
              startTime: 1655249617233,
              endTime: 1655249677233,
              plotTime: 1655249677233,
              data: 8606,
            },
            {
              startTime: 1655249557233,
              endTime: 1655249617233,
              plotTime: 1655249617233,
              data: 8996,
            },
            {
              startTime: 1655249497232,
              endTime: 1655249557232,
              plotTime: 1655249557232,
              data: 10809,
            },
            {
              startTime: 1655249437230,
              endTime: 1655249497230,
              plotTime: 1655249497230,
              data: 5445,
            },
          ],
          randomDetector_20_sec.detectionInterval.period.interval,
          randomDetector_20_sec.windowDelay.period,
          {
            startDate: 1655249857234,
            endDate: 1655250031633,
          },
          {
            startDate: 1655249857234,
            endDate: 1655250031633,
          },
          false
        )
      ).toEqual([]);
    });
    test('returns missing data annotation with 20 minutes window delay', () => {
      expect(
        getFeatureMissingDataAnnotations(
          // timestamps in descending order
          [
            {
              startTime: 1654652417693,
              endTime: 1654652477693,
              plotTime: 1654652477693,
              data: 9050,
            },
            {
              startTime: 1654652357688,
              endTime: 1654652417688,
              plotTime: 1654652417688,
              data: 13895,
            },
            {
              startTime: 1654652297691,
              endTime: 1654652357691,
              plotTime: 1654652357691,
              data: 11362,
            },
            {
              startTime: 1654652237690,
              endTime: 1654652297690,
              plotTime: 1654652297690,
              data: 13253,
            },
            {
              startTime: 1654652177690,
              endTime: 1654652237690,
              plotTime: 1654652237690,
              data: 15658,
            },
            {
              startTime: 1654652117689,
              endTime: 1654652177689,
              plotTime: 1654652177689,
              data: 10015,
            },
            {
              startTime: 1654652057688,
              endTime: 1654652117688,
              plotTime: 1654652117688,
              data: 12291,
            },
          ],
          randomDetector_20_min.detectionInterval.period.interval,
          randomDetector_20_min.windowDelay.period,
          {
            startDate: 1654651997688,
            endDate: 1654653617693,
          },
          {
            startDate: 1654651997688,
            endDate: 1654653617693,
          },
          false
        )
      ).toEqual(
        // our tests use UTC time zone. But in real application, it is local time.
        [
          {
            dataValue: 1654652040000,
            details:
              'There is feature data point missing between 06/08/22 1:33 AM and 06/08/22 1:34 AM',
            header: '06/08/22 01:34:00 AM',
          },
        ]
      );
    });
    test('returns no missing data annotation with 20 minutes window delay', () => {
      expect(
        getFeatureMissingDataAnnotations(
          [
            {
              startTime: 1655250437690,
              endTime: 1655250497690,
              plotTime: 1655250497690,
              data: 13888,
            },
            {
              startTime: 1655250377688,
              endTime: 1655250437688,
              plotTime: 1655250437688,
              data: 8246,
            },
            {
              startTime: 1655250317687,
              endTime: 1655250377687,
              plotTime: 1655250377687,
              data: 16812,
            },
            {
              startTime: 1655250257691,
              endTime: 1655250317691,
              plotTime: 1655250317691,
              data: 9834,
            },
            {
              startTime: 1655250197688,
              endTime: 1655250257688,
              plotTime: 1655250257688,
              data: 12409,
            },
            {
              startTime: 1655250137686,
              endTime: 1655250197686,
              plotTime: 1655250197686,
              data: 14615,
            },
            {
              startTime: 1655250077703,
              endTime: 1655250137703,
              plotTime: 1655250137703,
              data: 8377,
            },
          ],
          randomDetector_20_min.detectionInterval.period.interval,
          randomDetector_20_min.windowDelay.period,
          {
            startDate: 1655250377690,
            endDate: 1655251724454,
          },
          {
            startDate: 1655250377690,
            endDate: 1655251724454,
          },
          false
        )
      ).toEqual([]);
    });
    test('should correctly build parameters with default options', () => {
      const expected = {
        from: 0,
        size: MAX_ANOMALIES,
        sortDirection: SORT_DIRECTION.DESC,
        sortField: AD_DOC_FIELDS.DATA_END_TIME,
        startTime: startTime,
        endTime: endTime,
        fieldName: AD_DOC_FIELDS.DATA_END_TIME,
        anomalyThreshold: -1,
        entityList: undefined, // Default as an empty array stringified
      };

      const result = buildParamsForGetAnomalyResultsWithDateRange(
        startTime,
        endTime
      );
      expect(result).toEqual(expected);
    });

    test('should correctly handle `anomalyOnly` and non-empty `entityList`', () => {
      const entities = [
        { id: '1', name: 'Entity1' },
        { id: '2', name: 'Entity2' },
      ];
      const expected = {
        from: 0,
        size: MAX_ANOMALIES,
        sortDirection: SORT_DIRECTION.DESC,
        sortField: AD_DOC_FIELDS.DATA_END_TIME,
        startTime: startTime,
        endTime: endTime,
        fieldName: AD_DOC_FIELDS.DATA_END_TIME,
        anomalyThreshold: 0, // because anomalyOnly is true
        entityList: JSON.stringify(entities),
      };

      const result = buildParamsForGetAnomalyResultsWithDateRange(
        startTime,
        endTime,
        true,
        entities
      );
      expect(result).toEqual(expected);
    });

    test('should handle undefined `entityList` as an empty array JSON string', () => {
      const expected = {
        from: 0,
        size: MAX_ANOMALIES,
        sortDirection: SORT_DIRECTION.DESC,
        sortField: AD_DOC_FIELDS.DATA_END_TIME,
        startTime: startTime,
        endTime: endTime,
        fieldName: AD_DOC_FIELDS.DATA_END_TIME,
        anomalyThreshold: -1, // default as anomalyOnly is false
        entityList: undefined, // Default for undefined entityList
      };

      const result = buildParamsForGetAnomalyResultsWithDateRange(
        startTime,
        endTime,
        false,
        undefined
      );
      expect(result).toEqual(expected);
    });
  });

  describe('parsePureAnomalies()', () => {
    test('parse anomalies', async () => {
      const parsedPureAnomalies: AnomalyData[] = await parsePureAnomalies(
        ANOMALY_RESULT_SUMMARY
      );
      expect(parsedPureAnomalies).toStrictEqual(PARSED_ANOMALIES);
    });
  });

  describe('transformEntityListsForHeatmap', () => {
    it('should transform an empty entityLists array to an empty array', () => {
      const entityLists: Entity[][] = [];
      const result = transformEntityListsForHeatmap(entityLists);
      expect(result).toEqual([]);
      const convertedBack = convertHeatmapCellEntityStringToEntityList('[]');
      expect([]).toEqual(convertedBack);
    });

    it('should transform a single entity list correctly', () => {
      const entityLists: Entity[][] = [
        [
          { name: 'entity1', value: 'value1' },
          { name: 'entity2', value: 'value2' },
        ],
      ];

      const json = JSON.stringify(entityLists[0]);

      const expected = [new Array(NUM_CELLS).fill(json)];

      const result = transformEntityListsForHeatmap(entityLists);
      expect(result).toEqual(expected);
      const convertedBack = convertHeatmapCellEntityStringToEntityList(json);
      expect(entityLists[0]).toEqual(convertedBack);
    });

    it('should handle special characters in entity values', () => {
      const entityLists: Entity[][] = [
        [
          { name: 'entity1', value: 'value1, with comma' },
          { name: 'entity2', value: 'value2\nwith newline' },
        ],
      ];

      const json = JSON.stringify(entityLists[0]);

      const expected = [new Array(NUM_CELLS).fill(json)];

      const result = transformEntityListsForHeatmap(entityLists);
      expect(result).toEqual(expected);
      const convertedBack = convertHeatmapCellEntityStringToEntityList(json);
      expect(entityLists[0]).toEqual(convertedBack);
    });
  });
});

describe('calculateTimeWindowsWithMaxDataPoints', () => {
  test('splits range into windows', () => {
    const dateRange = { startDate: 0, endDate: 600000 }; // 10 minutes
    const result = calculateTimeWindowsWithMaxDataPoints(5, dateRange);
    expect(result.length).toBe(5);
    expect(result[0].startDate).toBe(0);
    expect(result[result.length - 1].endDate).toBe(600000);
  });

  test('returns single window when maxDataPoints exceeds range', () => {
    const dateRange = { startDate: 0, endDate: 60000 }; // 1 minute = MIN_IN_MILLI_SECS
    const result = calculateTimeWindowsWithMaxDataPoints(1000, dateRange);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ startDate: 0, endDate: 60000 });
  });

  test('handles empty range', () => {
    const dateRange = { startDate: 1000, endDate: 1000 };
    const result = calculateTimeWindowsWithMaxDataPoints(10, dateRange);
    expect(result).toEqual([]);
  });
});

describe('prepareDataForLiveChart', () => {
  test('returns empty array for empty data', () => {
    expect(
      prepareDataForLiveChart([], { startDate: 0, endDate: 100 }, 1)
    ).toEqual([]);
  });

  test('returns empty array for null data', () => {
    expect(
      prepareDataForLiveChart(null as any, { startDate: 0, endDate: 100 }, 1)
    ).toEqual([]);
  });

  test('generates time series with correct interval', () => {
    const dateRange = { startDate: 0, endDate: 180000 }; // 3 minutes
    const result = prepareDataForLiveChart([{ some: 'data' }], dateRange, 1);
    // Should have entries from endDate stepping back by 1 min, plus startDate
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].plotTime).toBe(180000);
    expect(result[result.length - 1].plotTime).toBe(0);
    result.forEach((point: any) => {
      expect(point.confidence).toBeNull();
      expect(point.anomalyGrade).toBeNull();
    });
  });
});

describe('generateAnomalyAnnotations', () => {
  test('returns empty annotations for no anomalies', () => {
    const result = generateAnomalyAnnotations([[]]);
    expect(result).toEqual([[]]);
  });

  test('filters out zero-grade anomalies', () => {
    const anomalies = [
      [
        {
          anomalyGrade: 0,
          confidence: 0.5,
          startTime: 100,
          endTime: 200,
        } as AnomalyData,
        {
          anomalyGrade: 0.8,
          confidence: 0.9,
          startTime: 300,
          endTime: 400,
        } as AnomalyData,
      ],
    ];
    const result = generateAnomalyAnnotations(anomalies);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].coordinates.x0).toBe(300);
    expect(result[0][0].coordinates.x1).toBe(400);
    expect(result[0][0].details).toContain('0.9');
  });

  test('handles multiple time series', () => {
    const anomalies = [
      [
        {
          anomalyGrade: 0.5,
          confidence: 0.7,
          startTime: 100,
          endTime: 200,
        } as AnomalyData,
      ],
      [
        {
          anomalyGrade: 0.9,
          confidence: 0.8,
          startTime: 300,
          endTime: 400,
        } as AnomalyData,
      ],
    ];
    const result = generateAnomalyAnnotations(anomalies);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1);
    expect(result[1]).toHaveLength(1);
  });
});

describe('filterAnomaliesWithDateRange', () => {
  const anomalies = [
    [
      { plotTime: 100, anomalyGrade: 0.5 } as AnomalyData,
      { plotTime: 200, anomalyGrade: 0.7 } as AnomalyData,
      { plotTime: 300, anomalyGrade: 0.9 } as AnomalyData,
    ],
  ];

  test('filters by date range', () => {
    const result = filterAnomaliesWithDateRange(
      anomalies,
      { startDate: 150, endDate: 250 },
      'plotTime'
    );
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].plotTime).toBe(200);
  });

  test('returns empty for out-of-range data', () => {
    const result = filterAnomaliesWithDateRange(
      anomalies,
      { startDate: 400, endDate: 500 },
      'plotTime'
    );
    expect(result[0]).toHaveLength(0);
  });

  test('handles null series gracefully', () => {
    const result = filterAnomaliesWithDateRange(
      [null as any],
      { startDate: 0, endDate: 1000 },
      'plotTime'
    );
    expect(result[0]).toEqual([]);
  });
});

describe('filterWithDateRange', () => {
  test('filters items by date range', () => {
    const data = [{ plotTime: 100 }, { plotTime: 200 }, { plotTime: 300 }];
    const result = filterWithDateRange(
      data,
      { startDate: 150, endDate: 250 },
      'plotTime'
    );
    expect(result).toHaveLength(1);
    expect(result[0].plotTime).toBe(200);
  });

  test('returns empty for null data', () => {
    expect(
      filterWithDateRange(
        null as any,
        { startDate: 0, endDate: 100 },
        'plotTime'
      )
    ).toEqual([]);
  });
});

describe('convertToEntityString', () => {
  test('converts entity list to string with default delimiter', () => {
    const entities = [
      { name: 'host', value: 'server1' },
      { name: 'region', value: 'us-east' },
    ];
    const result = convertToEntityString(entities);
    expect(result).toBe('server1<br>us-east');
  });

  test('uses custom delimiter', () => {
    const entities = [
      { name: 'host', value: 'server1' },
      { name: 'region', value: 'us-east' },
    ];
    expect(convertToEntityString(entities, ', ')).toBe('server1, us-east');
  });

  test('returns empty string for empty list', () => {
    expect(convertToEntityString([])).toBe('');
  });
});

describe('convertToCategoryFieldString', () => {
  test('joins fields with delimiter', () => {
    expect(convertToCategoryFieldString(['host', 'region'], ', ')).toBe(
      'host, region'
    );
  });

  test('returns empty string for empty array', () => {
    expect(convertToCategoryFieldString([], ', ')).toBe('');
  });
});

describe('convertToCategoryFieldAndEntityString', () => {
  test('formats entity name-value pairs', () => {
    const entities = [
      { name: 'host', value: 'server1' },
      { name: 'region', value: 'us-east' },
    ];
    const result = convertToCategoryFieldAndEntityString(entities);
    expect(result).toContain('host');
    expect(result).toContain('server1');
    expect(result).toContain('region');
    expect(result).toContain('us-east');
  });

  test('returns "None" for entity with undefined name', () => {
    const entities = [{ name: undefined, value: ' ' }];
    const result = convertToCategoryFieldAndEntityString(entities as any);
    expect(result).toBe('None');
  });

  test('returns empty string for empty list', () => {
    expect(convertToCategoryFieldAndEntityString([])).toBe('');
  });
});

describe('entityListsMatch', () => {
  test('returns true for matching lists', () => {
    const a = [{ name: 'host', value: 'server1' }];
    const b = [{ name: 'host', value: 'server1' }];
    expect(entityListsMatch(a, b)).toBe(true);
  });

  test('returns false for different lengths', () => {
    const a = [{ name: 'host', value: 'server1' }];
    const b: Entity[] = [];
    expect(entityListsMatch(a, b)).toBe(false);
  });

  test('returns false for different values', () => {
    const a = [{ name: 'host', value: 'server1' }];
    const b = [{ name: 'host', value: 'server2' }];
    expect(entityListsMatch(a, b)).toBe(false);
  });
});

describe('flattenData', () => {
  test('flattens 2D array', () => {
    expect(
      flattenData([
        [1, 2],
        [3, 4],
      ])
    ).toEqual([1, 2, 3, 4]);
  });

  test('returns empty for empty input', () => {
    expect(flattenData([])).toEqual([]);
  });

  test('handles single nested array', () => {
    expect(flattenData([[1, 2, 3]])).toEqual([1, 2, 3]);
  });
});

describe('parseAnomalySummary', () => {
  test('parses summary with anomalies', () => {
    const result = parseAnomalySummary(ANOMALY_RESULT_SUMMARY);
    expect(result.anomalyOccurrence).toBe(1);
    expect(result.minAnomalyGrade).toBe(1);
    expect(result.maxAnomalyGrade).toBe(1);
    expect(result.minConfidence).toBeCloseTo(0.42, 1);
    expect(result.maxConfidence).toBeCloseTo(0.97, 1);
    expect(result.lastAnomalyOccurrence).toBeDefined();
  });

  test('parses summary with no anomalies', () => {
    const result = parseAnomalySummary(NO_ANOMALIES_RESULT_RESPONSE);
    expect(result.anomalyOccurrence).toBe(0);
    expect(result.minAnomalyGrade).toBe(0);
    expect(result.maxAnomalyGrade).toBe(0);
  });
});

describe('getAnomalyDataRangeQuery', () => {
  test('builds query with correct structure', () => {
    const query = getAnomalyDataRangeQuery(1000, 2000, 'task-1');
    expect(query.size).toBe(0);
    expect(query.query.bool.filter).toHaveLength(3);
    expect(query.query.bool.filter[1].range.data_end_time.gte).toBe(1000);
    expect(query.query.bool.filter[1].range.data_end_time.lte).toBe(2000);
    expect(query.query.bool.filter[2].term.task_id).toBe('task-1');
    expect(query.aggs).toBeDefined();
  });
});

describe('parseHistoricalAggregatedAnomalies', () => {
  test('parses daily aggregation', () => {
    const result = {
      response: {
        aggregations: {
          aggregated_anomalies: {
            buckets: [
              { key: 1609459200000, max_anomaly_aggs: { value: 0.8 } },
              { key: 1609545600000, max_anomaly_aggs: { value: null } },
            ],
          },
        },
      },
    };
    const anomalies = parseHistoricalAggregatedAnomalies(result, 'day');
    expect(anomalies).toHaveLength(2);
    expect(anomalies[0].anomalyGrade).toBe(0.8);
    expect(anomalies[0].startTime).toBe(1609459200000);
    expect(anomalies[1].anomalyGrade).toBe(0);
  });

  test('parses weekly aggregation', () => {
    const result = {
      response: {
        aggregations: {
          aggregated_anomalies: {
            buckets: [{ key: 1609459200000, max_anomaly_aggs: { value: 0.5 } }],
          },
        },
      },
    };
    const anomalies = parseHistoricalAggregatedAnomalies(result, 'week');
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].aggInterval).toContain('Week of');
  });

  test('parses monthly aggregation', () => {
    const result = {
      response: {
        aggregations: {
          aggregated_anomalies: {
            buckets: [{ key: 1609459200000, max_anomaly_aggs: { value: 0.3 } }],
          },
        },
      },
    };
    const anomalies = parseHistoricalAggregatedAnomalies(result, 'month');
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].aggInterval).toContain('2021');
  });

  test('returns empty for missing buckets', () => {
    const result = { response: {} };
    expect(parseHistoricalAggregatedAnomalies(result, 'day')).toEqual([]);
  });
});

describe('parseBucketizedAnomalyResults', () => {
  test('parses bucketized results with feature data', () => {
    const result = {
      response: {
        aggregations: {
          bucketized_anomaly_grade: {
            buckets: [
              {
                top_anomaly_hits: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          anomaly_grade: 0.8,
                          confidence: 0.9,
                          data_start_time: 1000,
                          data_end_time: 2000,
                          feature_data: [
                            {
                              feature_id: 'f1',
                              feature_name: 'feat1',
                              data: 10,
                            },
                          ],
                          relevant_attribution: [
                            { feature_id: 'f1', data: 0.5 },
                          ],
                          expected_values: [
                            { value_list: [{ feature_id: 'f1', data: 8 }] },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    };
    const parsed = parseBucketizedAnomalyResults(result);
    expect(parsed.anomalies).toHaveLength(1);
    expect(parsed.anomalies[0].anomalyGrade).toBe(0.8);
    expect(parsed.anomalies[0].contributions).toBeDefined();
    expect(parsed.featureData['f1']).toHaveLength(1);
    expect(parsed.featureData['f1'][0].data).toBe(10);
    expect(parsed.featureData['f1'][0].attribution).toBe(0.5);
    expect(parsed.featureData['f1'][0].expectedValue).toBe(8);
  });

  test('returns empty for missing buckets', () => {
    const parsed = parseBucketizedAnomalyResults({ response: {} });
    expect(parsed.anomalies).toEqual([]);
    expect(parsed.featureData).toEqual({});
  });

  test('skips buckets with no hits', () => {
    const result = {
      response: {
        aggregations: {
          bucketized_anomaly_grade: {
            buckets: [{ top_anomaly_hits: { hits: { hits: [] } } }],
          },
        },
      },
    };
    const parsed = parseBucketizedAnomalyResults(result);
    expect(parsed.anomalies).toEqual([]);
  });
});

describe('parseTopChildEntityCombos', () => {
  test('extracts child entities excluding parents', () => {
    const result = {
      response: {
        aggregations: {
          top_entity_aggs: {
            buckets: [
              {
                entity_list: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          entity: [
                            { name: 'region', value: 'us-east' },
                            { name: 'host', value: 'server1' },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    };
    const parentEntities = [{ name: 'region', value: 'us-east' }];
    const combos = parseTopChildEntityCombos(result, parentEntities);
    expect(combos).toHaveLength(1);
    expect(combos[0]).toEqual([{ name: 'host', value: 'server1' }]);
  });

  test('returns empty for no buckets', () => {
    expect(parseTopChildEntityCombos({ response: {} }, [])).toEqual([]);
  });
});

describe('getQueryParamsForLiveAnomalyResults', () => {
  test('builds params with correct time range', () => {
    const result = getQueryParamsForLiveAnomalyResults(10, 5);
    expect(result.from).toBe(0);
    expect(result.size).toBe(5);
    expect(result.sortDirection).toBe('desc');
    expect(result.startTime).toBeLessThan(Date.now());
  });
});

describe('prepareDataForChart', () => {
  test('returns empty for empty data', () => {
    expect(prepareDataForChart([], { startDate: 0, endDate: 100 })).toEqual([]);
  });

  test('flattens and filters data by date range', () => {
    const data = [[{ plotTime: 50 }, { plotTime: 150 }], [{ plotTime: 75 }]];
    const result = prepareDataForChart(data, { startDate: 0, endDate: 100 });
    expect(result).toHaveLength(2);
  });
});
