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
import { HistoricalRangeModal } from '../HistoricalRangeModal/HistoricalRangeModal';

describe('<HistoricalRangeModal /> spec', () => {
  test('renders component when creating first historical analysis', () => {
    const { getByText } = render(
      <HistoricalRangeModal
        detector={{}}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isEdit={false}
      />
    );

    getByText('Set up historical analysis');
  });
  test('renders component when editing historical analysis', () => {
    const { getByText } = render(
      <HistoricalRangeModal
        detector={{}}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isEdit={true}
      />
    );
    getByText('Modify historical analysis');
  });
  test('defaults to 30 days when no existing date range', () => {
    const { getByText } = render(
      <HistoricalRangeModal
        detector={{}}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isEdit={false}
      />
    );
    getByText('last 30 days');
  });
  test('defaults to detector date range if it exists', () => {
    const { queryByText } = render(
      <HistoricalRangeModal
        detector={{
          detectionDateRange: {
            startTime: 500,
            endTime: 5000,
          },
        }}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isEdit={false}
      />
    );
    expect(queryByText('last 30 days')).toBeNull();
  });
});
