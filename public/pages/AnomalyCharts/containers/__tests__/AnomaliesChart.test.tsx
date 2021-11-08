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
import { AnomaliesChart, AnomaliesChartProps } from '../AnomaliesChart';
import { mockedStore } from '../../../../redux/utils/testUtils';
import { Provider } from 'react-redux';
import { INITIAL_ANOMALY_SUMMARY } from '../../utils/constants';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { coreServicesMock } from '../../../../../test/mocks';
import {
  FAKE_ANOMALIES_RESULT,
  FAKE_DATE_RANGE,
} from '../../../../pages/utils/__tests__/constants';

const DEFAULT_PROPS = {
  onDateRangeChange: jest.fn(),
  onZoomRangeChange: jest.fn(),
  title: 'Test title',
  bucketizedAnomalies: true,
  anomalySummary: INITIAL_ANOMALY_SUMMARY,
  dateRange: FAKE_DATE_RANGE,
  isLoading: false,
  showAlerts: false,
  isNotSample: true,
  detector: getRandomDetector(true),
  children: [],
  isHCDetector: false,
  isHistorical: false,
  detectorCategoryField: [],
  onHeatmapCellSelected: jest.fn(),
  onDisplayOptionChanged: jest.fn(),
  selectedHeatmapCell: undefined,
  newDetector: undefined,
  zoomRange: undefined,
  anomaliesResult: FAKE_ANOMALIES_RESULT,
  entityAnomalySummaries: [],
} as AnomaliesChartProps;

const renderDataFilter = (chartProps: AnomaliesChartProps) => ({
  ...render(
    <Provider store={mockedStore()}>
      <CoreServicesContext.Provider value={coreServicesMock}>
        <AnomaliesChart {...chartProps} />
      </CoreServicesContext.Provider>
    </Provider>
  ),
});

describe('<AnomaliesChart /> spec', () => {
  test('renders the component for sample / preview', () => {
    console.error = jest.fn();
    const { getByText, getAllByText } = renderDataFilter({
      ...DEFAULT_PROPS,
      isHistorical: false,
      isHCDetector: false,
      isNotSample: false,
    });
    expect(getByText('Test title')).not.toBeNull();
    expect(getAllByText('Sample anomaly occurrences').length >= 1);
    expect(getAllByText('Sample anomaly grade').length >= 1);
    expect(getAllByText('Sample confidence').length >= 1);
  });
  test('renders the component for RT, non-HC detector', () => {
    console.error = jest.fn();
    const { getByText, getAllByText } = renderDataFilter({
      ...DEFAULT_PROPS,
      isHistorical: false,
      isHCDetector: false,
    });
    expect(getByText('Test title')).not.toBeNull();
    expect(getAllByText('Anomaly occurrences').length >= 1);
    expect(getAllByText('Anomaly grade').length >= 1);
    expect(getAllByText('Confidence').length >= 1);
    expect(getAllByText('Last anomaly occurrence').length >= 1);
  });
  test('renders the component for RT, HC detector', () => {
    console.error = jest.fn();
    const { getByText } = renderDataFilter({
      ...DEFAULT_PROPS,
      isHistorical: false,
      isHCDetector: true,
      detectorCategoryField: ['category-1'],
      selectedCategoryFields: [{ label: 'category-1' }],
    });
    getByText('Test title');
    getByText('Top 10');
    getByText('category-1');
  });
  test('renders the component for RT, multi-category-HC detector', () => {
    console.error = jest.fn();
    const { getByText } = renderDataFilter({
      ...DEFAULT_PROPS,
      isHistorical: false,
      isHCDetector: true,
      detectorCategoryField: ['category-1, category-2'],
      selectedCategoryFields: [
        { label: 'category-1' },
        { label: 'category-2' },
      ],
    });
    getByText('Test title');
    getByText('Top 10');
    getByText('category-1');
    getByText('category-2');
  });
  test('renders the component for historical, non-HC detector', () => {
    console.error = jest.fn();
    const { getAllByText, queryByText } = renderDataFilter({
      ...DEFAULT_PROPS,
      isHistorical: true,
      isHCDetector: false,
    });
    expect(queryByText('Test title')).not.toBeNull();
    expect(getAllByText('Anomaly occurrences').length >= 1);
    expect(getAllByText('Average anomaly grade').length >= 1);
    expect(queryByText('Confidence')).toBeNull();
  });
  test('renders the component for historical, HC detector', () => {
    console.error = jest.fn();
    const { getByText } = renderDataFilter({
      ...DEFAULT_PROPS,
      isHistorical: true,
      isHCDetector: true,
      detectorCategoryField: ['category-1'],
      selectedCategoryFields: [{ label: 'category-1' }],
    });
    getByText('Test title');
    getByText('Top 10');
    getByText('category-1');
  });
  test('renders the component for historical, multi-category-HC detector', () => {
    console.error = jest.fn();
    const { getByText } = renderDataFilter({
      ...DEFAULT_PROPS,
      isHistorical: true,
      isHCDetector: true,
      detectorCategoryField: ['category-1', 'category-2'],
      selectedCategoryFields: [
        { label: 'category-1' },
        { label: 'category-2' },
      ],
    });
    getByText('Test title');
    getByText('Top 10');
    getByText('category-1');
    getByText('category-2');
  });
  test('renders the component with a subset of category fields selected', () => {
    console.error = jest.fn();
    const { getByText, queryByText } = renderDataFilter({
      ...DEFAULT_PROPS,
      isHistorical: true,
      isHCDetector: true,
      detectorCategoryField: ['category-1', 'category-2'],
      selectedCategoryFields: [{ label: 'category-1' }],
    });
    getByText('Test title');
    getByText('Top 10');
    getByText('category-1');
    expect(queryByText('category-2')).toBeNull();
  });
});
