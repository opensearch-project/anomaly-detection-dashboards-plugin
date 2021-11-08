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

describe('<SampleDataBox /> spec', () => {
  describe('Data not loaded', () => {
    test('renders component', () => {
      const { container, getByText } = render(
        <SampleDataBox {...defaultProps} />
      );
      expect(container.firstChild).toMatchSnapshot();
      getByText('Sample title');
      getByText('Sample description');
      getByText('Sample button description');
    });
  });
  describe('Data is loading', () => {
    test('renders component', () => {
      const { container, getByText } = render(
        <SampleDataBox {...defaultProps} isLoadingData={true} />
      );
      expect(container.firstChild).toMatchSnapshot();
      getByText('Sample title');
      getByText('Sample description');
      getByText('Creating detector');
    });
  });
  describe('Data is loaded', () => {
    test('renders component', () => {
      const { container, getByText } = render(
        <SampleDataBox {...defaultProps} isDataLoaded={true} />
      );
      expect(container.firstChild).toMatchSnapshot();
      getByText('Sample title');
      getByText('Sample description');
      getByText('Detector created');
    });
  });
});
