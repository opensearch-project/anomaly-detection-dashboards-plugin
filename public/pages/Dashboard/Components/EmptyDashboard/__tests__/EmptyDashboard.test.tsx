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
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

jest.mock('../../../../../services', () => ({
  ...jest.requireActual('../../../../../services'),

  getDataSourceEnabled: () => ({
    enabled: false  
  })
}));

const history = createMemoryHistory(); 

describe('<EmptyDetector /> spec', () => {
  describe('Empty results', () => {
    test('renders component with empty message', async () => {
      const { container } = render(
        <Router history={history}>
          <EmptyDashboard />
        </Router>);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
