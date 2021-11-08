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
import { AlertsFlyout } from '../AlertsFlyout';
import { getRandomMonitor } from '../../../../../redux/reducers/__tests__/utils';

describe('<AlertsFlyout /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const detectorId = 'GILVg3EBhaIh92zvX8uE';
  describe('Alerts Flyout', () => {
    test('renders component with monitor', () => {
      console.error = jest.fn();
      const { container } = render(
        <AlertsFlyout
          detectorId={detectorId}
          detectorName="test detector"
          detectorInterval={1}
          unit="Minutes"
          monitor={getRandomMonitor(detectorId, true)}
          onClose={jest.fn()}
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders component with undefined monitor', () => {
      console.error = jest.fn();
      const { container } = render(
        <AlertsFlyout
          detectorId={detectorId}
          detectorName="test detector"
          detectorInterval={1}
          unit="Minutes"
          onClose={jest.fn()}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
