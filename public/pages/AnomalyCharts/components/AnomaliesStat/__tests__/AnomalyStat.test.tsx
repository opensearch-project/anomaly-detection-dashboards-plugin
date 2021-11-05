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
import {
  AnomalyStat,
  AnomalyStatWithTooltip,
  AlertsStat,
} from '../AnomalyStat';
import { getRandomMonitor } from '../../../../../redux/reducers/__tests__/utils';

describe('<AnomalyStat /> spec', () => {
  describe('Anomaly Stat', () => {
    test('renders component without tooltip', () => {
      const { container } = render(
        <AnomalyStat title="test title" description="test description" />
      );
      expect(container).toMatchSnapshot();
    });
  });
});

describe('<AnomalyStatWithTooltip /> spec', () => {
  describe('Anomaly Stat with tooltip', () => {
    test('renders component with tooltip and not loading', () => {
      const { container } = render(
        <AnomalyStatWithTooltip
          isLoading={false}
          minValue={0.5}
          maxValue={0.9}
          description="test description"
          tooltip="test tooltip"
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders component with tooltip and loading', () => {
      const { container } = render(
        <AnomalyStatWithTooltip
          isLoading={true}
          minValue={0.5}
          maxValue={0.9}
          description="test description"
          tooltip="test tooltip"
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});

describe('<AlertsStat /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Alert Stat', () => {
    test('renders component with undefined monitor and loading', () => {
      console.error = jest.fn();
      const { container } = render(
        <AlertsStat
          monitor={undefined}
          showAlertsFlyout={jest.fn()}
          totalAlerts={9}
          isLoading={true}
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders component with undefined monitor and not loading', () => {
      console.error = jest.fn();
      const { container } = render(
        <AlertsStat
          monitor={undefined}
          showAlertsFlyout={jest.fn()}
          totalAlerts={9}
          isLoading={false}
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders component with monitor and not loading', () => {
      const { container } = render(
        <AlertsStat
          monitor={getRandomMonitor('test-detector-id', true)}
          showAlertsFlyout={jest.fn()}
          totalAlerts={9}
          isLoading={false}
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders component with monitor and loading', () => {
      const { container } = render(
        <AlertsStat
          monitor={getRandomMonitor('test-detector-id', true)}
          showAlertsFlyout={jest.fn()}
          totalAlerts={9}
          isLoading={true}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
