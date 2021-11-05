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
import { SampleDataCallout } from '../SampleDataCallout';

describe('<SampleDataCallout /> spec', () => {
  describe('Data not loaded', () => {
    test('renders component', () => {
      const { container, getByText } = render(<SampleDataCallout />);
      expect(container.firstChild).toMatchSnapshot();
      getByText('Looking to get more familiar with anomaly detection?');
    });
  });
});
