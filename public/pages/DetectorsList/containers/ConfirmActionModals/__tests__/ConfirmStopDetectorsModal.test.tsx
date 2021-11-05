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
import { render, fireEvent, wait } from '@testing-library/react';
import { ConfirmStopDetectorsModal } from '../ConfirmStopDetectorsModal';
import { DetectorListItem, Monitor } from '../../../../../models/interfaces';

const testDetectors = [
  {
    id: 'detector-id-0',
    name: 'detector-0',
  },
  {
    id: 'detector-id-1',
    name: 'detector-1',
  },
] as DetectorListItem[];

let testMonitor = {} as { [key: string]: Monitor };
//@ts-ignore
testMonitor['detector-id-0'] = {
  id: 'monitor-id-0',
  name: 'monitor-0',
};

const defaultStopProps = {
  detectors: testDetectors,
  monitors: {},
  onHide: jest.fn(),
  onConfirm: jest.fn(),
  onStopDetectors: jest.fn(),
  isListLoading: false,
};

describe('<ConfirmStopDetectorsModal /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('ConfirmStopDetectorsModal', () => {
    test('renders modal with detectors and no monitors', async () => {
      const { getByText, getAllByText } = render(
        <ConfirmStopDetectorsModal {...defaultStopProps} />
      );
      getByText('Are you sure you want to stop the selected detectors?');
      getByText('Stop detectors');
    });
    test('renders modal with detectors and 1 monitor', async () => {
      console.error = jest.fn();
      const { getByText } = render(
        <ConfirmStopDetectorsModal
          {...defaultStopProps}
          monitors={testMonitor}
        />
      );
      getByText('Are you sure you want to stop the selected detectors?');
      getByText(
        'The monitors associated with these detectors will not receive any anomaly results.'
      );
      getByText('Stop detectors');
    });
    test('should call onStopDetectors() when confirming', async () => {
      const { getByTestId } = render(
        <ConfirmStopDetectorsModal {...defaultStopProps} />
      );
      fireEvent.click(getByTestId('confirmButton'));
      await wait();
      expect(defaultStopProps.onStopDetectors).toHaveBeenCalled();
    });
    test('should call onHide() when closing', async () => {
      const { getByTestId } = render(
        <ConfirmStopDetectorsModal {...defaultStopProps} />
      );
      fireEvent.click(getByTestId('cancelButton'));
      await wait();
      expect(defaultStopProps.onHide).toHaveBeenCalled();
    });
  });
});
