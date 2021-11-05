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
import { EmptyHistoricalDetectorResults } from '../EmptyHistoricalDetectorResults/EmptyHistoricalDetectorResults';

describe('<EmptyHistoricalDetectorResults /> spec', () => {
  test('renders component', () => {
    const { container, getByText } = render(
      <EmptyHistoricalDetectorResults detector={{}} onConfirm={jest.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
    getByText(`You haven't yet set up historical analysis`);
    getByText('Run historical analysis');
  });
});
