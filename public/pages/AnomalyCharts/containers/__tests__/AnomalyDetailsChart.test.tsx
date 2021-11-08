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
import { Provider } from 'react-redux';
import { mockedStore } from '../../../../redux/utils/testUtils';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { coreServicesMock } from '../../../../../test/mocks';
import { AnomalyDetailsChart } from '../AnomalyDetailsChart';
import {
  FAKE_ANOMALY_DATA,
  FAKE_DATE_RANGE,
} from '../../../../pages/utils/__tests__/constants';
import { INITIAL_ANOMALY_SUMMARY } from '../../utils/constants';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';

const renderAnomalyOccurenceChart = (
  isNotSample: boolean,
  isHCDetector: boolean
) => ({
  ...render(
    <Provider store={mockedStore()}>
      <CoreServicesContext.Provider value={coreServicesMock}>
        <AnomalyDetailsChart
          onDateRangeChange={jest.fn()}
          onZoomRangeChange={jest.fn()}
          bucketizedAnomalies={false}
          anomalySummary={INITIAL_ANOMALY_SUMMARY}
          anomalies={FAKE_ANOMALY_DATA}
          detector={getRandomDetector()}
          dateRange={FAKE_DATE_RANGE}
          isLoading={false}
          showAlerts={isNotSample}
          isNotSample={isNotSample}
          isHCDetector={isHCDetector}
          anomalyGradeSeriesName={'testAnomalyGradeSeriesName'}
          confidenceSeriesName={'testConfidenceSeriesName'}
        />
      </CoreServicesContext.Provider>
    </Provider>
  ),
});

describe('<AnomalyDetailsChart /> spec', () => {
  test('renders the component in case of Sample Anomaly', () => {
    console.error = jest.fn();
    const { getByText } = renderAnomalyOccurenceChart(false, false);
    expect(getByText('Sample anomaly grade')).not.toBeNull();
  });

  test('renders the component in case of Realtime Anomaly', () => {
    console.error = jest.fn();
    const { getByText, queryByText } = renderAnomalyOccurenceChart(true, false);
    expect(getByText('Anomaly grade')).not.toBeNull();
    expect(queryByText('Sample anomaly grade')).toBeNull();
    expect(getByText('Alert')).not.toBeNull();
  });

  test('renders the component in case of HC Detector', () => {
    console.error = jest.fn();
    const { getByText, queryByText } = renderAnomalyOccurenceChart(true, true);
    expect(getByText('Anomaly grade')).not.toBeNull();
    expect(queryByText('Sample anomaly grade')).toBeNull();
    expect(queryByText('Alert')).toBeNull();
  });
});
