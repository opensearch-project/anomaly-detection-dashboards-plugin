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
import { MonitorCallout } from '../MonitorCallout';

describe('<MonitorCallout /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Monitor callout', () => {
    console.error = jest.fn();
    test('renders component', () => {
      const { container } = render(
        <MonitorCallout
          monitorId="dnexZXEBemUf2kpaW2CK"
          monitorName="test-monitor"
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
