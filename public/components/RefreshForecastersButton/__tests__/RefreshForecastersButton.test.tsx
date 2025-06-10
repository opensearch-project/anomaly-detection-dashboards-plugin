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
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { RefreshForecastersButton } from '../RefreshForecastersButton';
import { getDataSourceEnabled, } from '../../../services';

// Mock the module
jest.mock('../../../services', () => ({
  ...jest.requireActual('../../../services'),
  getDataSourceEnabled: jest.fn(),
}));

describe('<RefreshForecastersButton /> spec', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://test.com',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true
    });
  });

  beforeEach(() => {
    // Mock the return value
    (getDataSourceEnabled as jest.Mock).mockReturnValue({
      enabled: false, // or true, depending on what you want to test
    });
  });

  test('renders component', () => {
    const history = createMemoryHistory();
    const { container, getByText } = render(
      <Router history={history}>
        <RefreshForecastersButton />
      </Router>
    );
    
    expect(container.firstChild).toMatchSnapshot();
    expect(getByText('Refresh')).toBeInTheDocument();
  });
}); 