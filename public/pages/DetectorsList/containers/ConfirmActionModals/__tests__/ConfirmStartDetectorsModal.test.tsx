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
import { ConfirmStartDetectorsModal } from '../ConfirmStartDetectorsModal';
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
testMonitor['detector-id-0'] = [
  {
    id: 'monitor-id-0',
    name: 'monitor-0',
  },
];

const defaultStartProps = {
  detectors: testDetectors,
  onHide: jest.fn(),
  onConfirm: jest.fn(),
  onStartDetectors: jest.fn(),
  isListLoading: false,
};

describe('<ConfirmStartDetectorsModal /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('ConfirmStartDetectorsModal', () => {
    test('renders modal with detectors', async () => {
      const { getByText } = render(
        <ConfirmStartDetectorsModal {...defaultStartProps} />
      );
      getByText('Are you sure you want to start the selected detectors?');
      getByText('Start detectors');
    });
    test('should call onStartDetectors() and onConfirm() when confirming', async () => {
      const { getByTestId } = render(
        <ConfirmStartDetectorsModal {...defaultStartProps} />
      );
      fireEvent.click(getByTestId('confirmButton'));
      await wait();
      expect(defaultStartProps.onStartDetectors).toHaveBeenCalled();
      expect(defaultStartProps.onConfirm).toHaveBeenCalled();
    });
    test('should call onHide() when closing', async () => {
      const { getByTestId } = render(
        <ConfirmStartDetectorsModal {...defaultStartProps} />
      );
      fireEvent.click(getByTestId('cancelButton'));
      await wait();
      expect(defaultStartProps.onHide).toHaveBeenCalled();
    });
  });
});
