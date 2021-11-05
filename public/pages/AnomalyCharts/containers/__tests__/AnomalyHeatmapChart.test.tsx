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

import { render } from '@testing-library/react';
import React from 'react';
import {
  AnomalyHeatmapChart,
  INITIAL_HEATMAP_DISPLAY_OPTION,
} from '../AnomalyHeatmapChart';
import {
  FAKE_ANOMALY_DATA,
  FAKE_DATE_RANGE,
  FAKE_ENTITY_ANOMALY_SUMMARIES,
} from '../../../../pages/utils/__tests__/constants';

describe('<AnomalyHeatmapChart /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AnomalyHeatmapChart with Sample anomaly data', () => {
    const { container } = render(
      <AnomalyHeatmapChart
        title={'test-title'}
        detectorId="test-detector-id"
        detectorName="test-detector-name"
        detectorInterval={1}
        unit="Minutes"
        dateRange={FAKE_DATE_RANGE}
        isLoading={false}
        anomalies={FAKE_ANOMALY_DATA}
        onHeatmapCellSelected={jest.fn()}
        onDisplayOptionChanged={jest.fn()}
        isNotSample={false}
      />
    );
    expect(container).toMatchSnapshot();
  });

  test('AnomalyHeatmapChart with anomaly summaries data', () => {
    const { container } = render(
      <AnomalyHeatmapChart
        title={'test-title'}
        detectorId="test-detector-id"
        detectorName="test-detector-name"
        detectorInterval={1}
        unit="Minutes"
        dateRange={FAKE_DATE_RANGE}
        isLoading={false}
        onHeatmapCellSelected={jest.fn()}
        onDisplayOptionChanged={jest.fn()}
        isNotSample={true}
        entityAnomalySummaries={[FAKE_ENTITY_ANOMALY_SUMMARIES]}
        heatmapDisplayOption={INITIAL_HEATMAP_DISPLAY_OPTION}
      />
    );
    expect(container).toMatchSnapshot();
  });
  test('AnomalyHeatmapChart with one category field', () => {
    const { container, getByText } = render(
      <AnomalyHeatmapChart
        title={'test-title'}
        detectorId="test-detector-id"
        detectorName="test-detector-name"
        detectorInterval={1}
        unit="Minutes"
        dateRange={FAKE_DATE_RANGE}
        isLoading={false}
        onHeatmapCellSelected={jest.fn()}
        onDisplayOptionChanged={jest.fn()}
        isNotSample={true}
        entityAnomalySummaries={[FAKE_ENTITY_ANOMALY_SUMMARIES]}
        heatmapDisplayOption={INITIAL_HEATMAP_DISPLAY_OPTION}
        categoryField={['test-field']}
        selectedCategoryFields={[{ label: 'test-field' }]}
      />
    );
    expect(container).toMatchSnapshot();
    getByText('View by:');
    getByText('test-field');
  });
  test('AnomalyHeatmapChart with multiple category fields', () => {
    const { container, getByText } = render(
      <AnomalyHeatmapChart
        title={'test-title'}
        detectorId="test-detector-id"
        detectorName="test-detector-name"
        detectorInterval={1}
        unit="Minutes"
        dateRange={FAKE_DATE_RANGE}
        isLoading={false}
        onHeatmapCellSelected={jest.fn()}
        onDisplayOptionChanged={jest.fn()}
        isNotSample={true}
        entityAnomalySummaries={[FAKE_ENTITY_ANOMALY_SUMMARIES]}
        heatmapDisplayOption={INITIAL_HEATMAP_DISPLAY_OPTION}
        categoryField={['test-field-1', 'test-field-2']}
        selectedCategoryFields={[
          { label: 'test-field-1' },
          { label: 'test-field-2' },
        ]}
      />
    );
    expect(container).toMatchSnapshot();
    getByText('View by:');
    getByText('test-field-1');
    getByText('test-field-2');
  });
});
