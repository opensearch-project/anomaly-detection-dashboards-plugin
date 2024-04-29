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
import { EuiIcon } from '@elastic/eui';
import { SampleDataBox } from '../SampleDataBox';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';

const defaultProps = {
  title: 'Sample title',
  icon: <EuiIcon type="alert" />,
  description: 'Sample description',
  loadDataButtonDescription: 'Sample button description',
  onLoadData: jest.fn(),
  isLoadingData: false,
  isDataLoaded: false,
  detectorId: 'sample-detector-id',
};

jest.mock('../../../../../services', () => ({
  ...jest.requireActual('../../../../../services'),

  getDataSourceEnabled: () => ({
    enabled: false  
  })
}));

describe('<SampleDataBox /> spec', () => {
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
  describe('Data not loaded', () => {
    test('renders component', () => {
      const history = createMemoryHistory(); 
      const { container, getByText } = render(
        <Router history={history}>
          <SampleDataBox {...defaultProps} />
        </Router>
      );
      expect(container.firstChild).toMatchSnapshot();
      getByText('Sample title');
      getByText('Sample description');
      getByText('Sample button description');
    });
  });
  describe('Data is loading', () => {
    test('renders component', () => {
      const history = createMemoryHistory(); 
      const { container, getByText } = render(
        <Router history={history}>
          <SampleDataBox 
            {...defaultProps}
            isLoadingData={true} />
        </Router>
      );
      expect(container.firstChild).toMatchSnapshot();
      getByText('Sample title');
      getByText('Sample description');
      getByText('Creating detector');
    });
  });
  describe('Data is loaded', () => {
    test('renders component', () => {
      const history = createMemoryHistory(); 

      const { container, getByText } = render(
        <Router history={history}>
          <SampleDataBox 
            {...defaultProps} 
            isDataLoaded={true} />
        </Router>
      );
      expect(container.firstChild).toMatchSnapshot();
      getByText('Sample title');
      getByText('Sample description');
      getByText('Detector created');
    });
  });
});
