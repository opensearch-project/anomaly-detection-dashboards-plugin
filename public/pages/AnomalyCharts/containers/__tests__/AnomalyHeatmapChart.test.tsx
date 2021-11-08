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

/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
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
