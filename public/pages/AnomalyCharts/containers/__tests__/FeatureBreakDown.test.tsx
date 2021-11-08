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
import { render } from '@testing-library/react';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { FeatureBreakDown } from '../FeatureBreakDown';
import { FeatureAggregationData } from 'public/models/interfaces';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { coreServicesMock } from '../../../../../test/mocks';

describe('<FeatureBreakDown /> spec', () => {
  const dateRange = {
    startDate: 1587431440000,
    endDate: 1587456780000,
  };
  const detector = getRandomDetector(false);
  let featureData: { [key: string]: FeatureAggregationData[] } = {};
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
  const anomaliesResult = {
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
    featureData: featureData,
  };
  test('renders the component', () => {
    console.error = jest.fn();
    const { container } = render(
      <CoreServicesContext.Provider value={coreServicesMock}>
        <FeatureBreakDown
          title="test"
          detector={detector}
          anomalyAndFeatureResults={[anomaliesResult]}
          annotations={[]}
          isLoading={false}
          dateRange={dateRange}
          featureDataSeriesName="feature data"
        />
      </CoreServicesContext.Provider>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
