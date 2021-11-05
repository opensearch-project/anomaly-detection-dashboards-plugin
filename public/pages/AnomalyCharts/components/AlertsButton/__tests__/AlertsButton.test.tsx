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
import { AlertsButton } from '../AlertsButton';
import { getRandomMonitor } from '../../../../../redux/reducers/__tests__/utils';

describe('<AlertsButton /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Alerts Button', () => {
    test('renders component without monitor', () => {
      console.error = jest.fn();
      const { container } = render(
        <AlertsButton
          detectorId="test-detector-id"
          detectorName="test-detector-name"
          detectorInterval={1}
          unit="Minutes"
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders component with monitor', () => {
      const { container } = render(
        <AlertsButton
          monitor={getRandomMonitor('test-detector-id', true)}
          detectorId="test-detector-id"
          detectorName="test-detector-name"
          detectorInterval={1}
          unit="Minutes"
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
