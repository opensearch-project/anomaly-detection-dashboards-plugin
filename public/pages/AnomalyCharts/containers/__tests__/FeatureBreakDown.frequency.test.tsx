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

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { FeatureBreakDown } from '../FeatureBreakDown';
import {
  Detector,
  FeatureAggregationData,
  UNITS,
} from '../../../../models/interfaces';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { coreServicesMock } from '../../../../../test/mocks';
import * as FeatureChartModule from '../../components/FeatureChart/FeatureChart';

const dateRange = {
  startDate: 1587431440000,
  endDate: 1587456780000,
};

const buildAnomaliesResult = (detector: Detector) => {
  const featureData: { [key: string]: FeatureAggregationData[] } = {};

  detector.featureAttributes.forEach((feature) => {
    if (feature.featureId) {
      featureData[feature.featureId] = [
        {
          endTime: 1587456740000,
          startTime: 1587431540000,
          data: 120,
        },
      ];
    }
  });

  return {
    anomalies: [
      {
        anomalyGrade: 0.3,
        anomalyScore: 0.56,
        confidence: 0.8,
        detectorId: detector.id,
        endTime: 1587456740000,
        startTime: 1587431540000,
      },
    ],
    featureData,
  };
};

const renderFeatureBreakDown = (detector: Detector) => {
  return render(
    <CoreServicesContext.Provider value={coreServicesMock}>
      <FeatureBreakDown
        title="test"
        detector={detector}
        anomalyAndFeatureResults={[buildAnomaliesResult(detector)]}
        annotations={[]}
        isLoading={false}
        dateRange={dateRange}
        featureDataSeriesName="feature data"
      />
    </CoreServicesContext.Provider>
  );
};

describe('FeatureBreakDown frequency handling', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('defaults detectorFrequency to detection interval when frequency is undefined', async () => {
    const detector = getRandomDetector(false);
    const featureChartSpy = jest.spyOn(FeatureChartModule, 'FeatureChart');

    renderFeatureBreakDown(detector);

    await waitFor(() => {
      expect(featureChartSpy).toHaveBeenCalled();
    });
    const props = featureChartSpy.mock.lastCall?.[0] as any;
    expect(props.detectorFrequency).toEqual(
      detector.detectionInterval.period
    );
  });

  test('passes detector frequency when defined on detector', () => {
    const detector = getRandomDetector(false);
    const customFrequency = {
      interval: 5,
      unit: UNITS.HOURS,
    };
    const detectorWithFrequency: Detector = {
      ...detector,
      frequency: { period: customFrequency },
    };
    const featureChartSpy = jest.spyOn(FeatureChartModule, 'FeatureChart');

    renderFeatureBreakDown(detectorWithFrequency);

    expect(featureChartSpy).toHaveBeenCalled();
    featureChartSpy.mock.calls.forEach((call) => {
      const props = call[0] as any;
      expect(props.detectorFrequency).toEqual(customFrequency);
    });
  });
});
