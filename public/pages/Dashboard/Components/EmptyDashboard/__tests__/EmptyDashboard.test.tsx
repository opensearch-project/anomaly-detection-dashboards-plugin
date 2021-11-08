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
import { EmptyDashboard } from '../EmptyDashboard';

describe('<EmptyDetector /> spec', () => {
  describe('Empty results', () => {
    test('renders component with empty message', async () => {
      const { container } = render(<EmptyDashboard />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
