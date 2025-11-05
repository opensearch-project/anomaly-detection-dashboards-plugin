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
  DateRange,
  Detector,
  FeatureAggregationData,
  FeatureAttributes,
  FEATURE_TYPE,
  UNITS,
} from '../../../models/interfaces';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { getFeatureDataPointsForDetector } from '../anomalyResultUtils';

const MINUTE_IN_MS = 60 * 1000;
const BASE_TIME = 1587431400000;
const FEATURE_ID = 'feature-id';
const FEATURE_NAME = 'cpu_usage';

const buildFeatureData = (minutesWithData: number[]): FeatureAggregationData[] =>
  minutesWithData
    .map((minute) => {
      const startTime = BASE_TIME + minute * MINUTE_IN_MS;
      const endTime = startTime + MINUTE_IN_MS;
      return {
        data: 1,
        startTime,
        endTime,
        plotTime: endTime,
      };
    })
    .sort((a, b) => b.startTime - a.startTime);

const defaultFeature: FeatureAttributes = {
  featureId: FEATURE_ID,
  featureName: FEATURE_NAME,
  featureEnabled: true,
  importance: 1,
  aggregationQuery: {},
};

const buildDetector = (frequencyMinutes: number): Detector => {
  return {
    id: 'detector-id',
    primaryTerm: 1,
    seqNo: 1,
    name: 'detector',
    description: '',
    timeField: '@timestamp',
    indices: ['index'],
    filterQuery: {},
    featureAttributes: [defaultFeature],
    detectionInterval: {
      period: {
        interval: 1,
        unit: UNITS.MINUTES,
      },
    },
    windowDelay: {
      period: {
        interval: 0,
        unit: UNITS.MINUTES,
      },
    },
    frequency: {
      period: {
        interval: frequencyMinutes,
        unit: UNITS.MINUTES,
      },
    },
    shingleSize: 8,
    uiMetadata: {
      filters: [],
      features: {
        [FEATURE_NAME]: {
          featureType: FEATURE_TYPE.SIMPLE,
          aggregationBy: 'avg',
          aggregationOf: FEATURE_NAME,
        },
      },
    },
    lastUpdateTime: BASE_TIME,
    curState: DETECTOR_STATE.RUNNING,
    stateError: '',
  } as Detector;
};

const dateRange: DateRange = {
  startDate: BASE_TIME,
  endDate: BASE_TIME + 10 * MINUTE_IN_MS,
};

describe('getFeatureDataPointsForDetector', () => {
  const featureDataWithMissingLastFiveMinutes = buildFeatureData([
    0, 1, 2, 3, 4,
  ]);

  test('returns no missing points when last five minutes are skipped due to five minute frequency', () => {
    const detector = buildDetector(5);

    const featureDataPoints = getFeatureDataPointsForDetector(
      detector,
      {
        [FEATURE_ID]: featureDataWithMissingLastFiveMinutes,
      },
      1,
      dateRange,
      true
    );

    const dataPoints = featureDataPoints[FEATURE_NAME];
    expect(dataPoints).toBeDefined();
    expect(dataPoints.length).toBeGreaterThan(0);
    expect(dataPoints.some((point) => point.isMissing)).toBe(false);
  });

  test('returns missing points when detector frequency matches interval and last five minutes have no data', () => {
    const detector = buildDetector(1);

    const featureDataPoints = getFeatureDataPointsForDetector(
      detector,
      {
        [FEATURE_ID]: featureDataWithMissingLastFiveMinutes,
      },
      1,
      dateRange,
      true
    );

    const dataPoints = featureDataPoints[FEATURE_NAME];
    expect(dataPoints).toBeDefined();
    expect(dataPoints.length).toBeGreaterThan(0);
    expect(dataPoints.some((point) => point.isMissing)).toBe(true);
  });

  test('returns no missing points when frequency and interval are the same', () => {
    const detector = buildDetector(5); 
    // Modify buildDetector to also set detectionInterval to 5 minutes for this test
    
    const featureDataPoints = getFeatureDataPointsForDetector(
      detector,
      {
        [FEATURE_ID]: featureDataWithMissingLastFiveMinutes,
      },
      5, // interval is now 5
      dateRange,
      true
    );

    const dataPoints = featureDataPoints[FEATURE_NAME];
    expect(dataPoints.some((point) => point.isMissing)).toBe(false);
  });

  test('avoids double-applying frequency skip when dateRange is pre-adjusted', () => {
    // Detector with 5-minute frequency and 1-minute interval
    const detector = buildDetector(5);

    // Feature data is missing in the last 5 minutes (minutes 5-9)
    const featureDataPointsMap = {
      [FEATURE_ID]: featureDataWithMissingLastFiveMinutes,
    } as { [key: string]: FeatureAggregationData[] };

    // Case A: Unadjusted range, rely on internal frequency skip logic
    const unadjustedDateRange: DateRange = {
      startDate: BASE_TIME,
      endDate: BASE_TIME + 10 * MINUTE_IN_MS,
    };
    const resultUnadjusted = getFeatureDataPointsForDetector(
      detector,
      featureDataPointsMap,
      1,
      unadjustedDateRange,
      true // windowDelayAdjusted
      // detectorFrequencyAdjusted omitted (false)
    );

    // Case B: Pre-adjusted end time by frequency window (5 minutes), and tell helper not to skip again
    const adjustedDateRange: DateRange = {
      startDate: BASE_TIME,
      endDate: BASE_TIME + 5 * MINUTE_IN_MS, // subtract 5 minutes
    };
    const resultAdjusted = getFeatureDataPointsForDetector(
      detector,
      featureDataPointsMap,
      1,
      adjustedDateRange,
      true, // windowDelayAdjusted
      true // detectorFrequencyAdjusted
    );

    const dataPointsUnadjusted = resultUnadjusted[FEATURE_NAME];
    const dataPointsAdjusted = resultAdjusted[FEATURE_NAME];

    expect(dataPointsUnadjusted).toBeDefined();
    expect(dataPointsAdjusted).toBeDefined();
    expect(dataPointsUnadjusted.length).toBeGreaterThan(0);
    expect(dataPointsAdjusted.length).toBeGreaterThan(0);

    // Both paths should identify no missing points because the last 5 minutes are either
    // skipped internally (unadjusted) or excluded by the pre-adjusted dateRange (adjusted).
    expect(dataPointsUnadjusted.some((p) => p.isMissing)).toBe(false);
    expect(dataPointsAdjusted.some((p) => p.isMissing)).toBe(false);

    // The computed ranges should be consistent between both approaches
    expect(dataPointsAdjusted.length).toEqual(dataPointsUnadjusted.length);
  });
});
