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
} from '../anomalyResultUtils';
import { getRandomDetector } from '../../../redux/reducers/__tests__/utils';
import {
  UNITS,
  Detector,
  FeatureAttributes,
  AnomalyData,
} from '../../../models/interfaces';
import { ANOMALY_RESULT_SUMMARY, PARSED_ANOMALIES } from './constants';

describe('anomalyResultUtils', () => {
  let randomDetector_20_min: Detector;
  let randomDetector_20_sec: Detector;
  let feature_id = 'deny_max';
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
  });

  describe('parsePureAnomalies()', () => {
    test('parse anomalies', async () => {
      const parsedPureAnomalies: AnomalyData[] = await parsePureAnomalies(
        ANOMALY_RESULT_SUMMARY
      );
      expect(parsedPureAnomalies).toStrictEqual(PARSED_ANOMALIES);
    });
  });
});
