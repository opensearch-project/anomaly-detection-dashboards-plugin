/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { findAllByTestId, render, waitFor } from '@testing-library/react';
import { ConfirmUnlinkDetectorModal } from '../index';
import { getRandomDetector } from '../../../../../../public/redux/reducers/__tests__/utils';
import { DetectorListItem } from '../../../../../../public/models/interfaces';
import userEvent from '@testing-library/user-event';

describe('ConfirmUnlinkDetectorModal spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testDetectors = [
    {
      id: 'detectorId1',
      name: 'test-detector-1',
    },
    {
      id: 'detectorId2',
      name: 'test-detector-2',
    },
  ] as DetectorListItem[];

  const ConfirmUnlinkDetectorModalProps = {
    detector: testDetectors[0],
    onHide: jest.fn(),
    onConfirm: jest.fn(),
    onUnlinkDetector: jest.fn(),
    isListLoading: false,
  };

  test('renders the component correctly', () => {
    const { container, getByText } = render(
      <ConfirmUnlinkDetectorModal {...ConfirmUnlinkDetectorModalProps} />
    );
    getByText('Remove association?');
    getByText(
      'Removing association unlinks test-detector-1 detector from the visualization but does not delete it. The detector association can be restored.'
    );
    expect(container).toMatchSnapshot();
  });
  test('should call onConfirm() when closing', async () => {
    const { container, getByText, getByTestId } = render(
      <ConfirmUnlinkDetectorModal {...ConfirmUnlinkDetectorModalProps} />
    );
    getByText('Remove association?');
    await waitFor(() => {});
    userEvent.click(getByTestId('confirmUnlinkButton'));
    await waitFor(() => {});
    expect(ConfirmUnlinkDetectorModalProps.onConfirm).toHaveBeenCalled();
  });
  test('should call onConfirm() when closing', async () => {
    const { container, getByText, getByTestId } = render(
      <ConfirmUnlinkDetectorModal {...ConfirmUnlinkDetectorModalProps} />
    );
    getByText('Remove association?');
    await waitFor(() => {});
    userEvent.click(getByTestId('confirmUnlinkButton'));
    await waitFor(() => {});
    expect(ConfirmUnlinkDetectorModalProps.onConfirm).toHaveBeenCalled();
  });
  test('should call onHide() when closing', async () => {
    const { getByTestId } = render(
      <ConfirmUnlinkDetectorModal {...ConfirmUnlinkDetectorModalProps} />
    );
    await waitFor(() => {});
    userEvent.click(getByTestId('cancelUnlinkButton'));
    await waitFor(() => {});
    expect(ConfirmUnlinkDetectorModalProps.onHide).toHaveBeenCalled();
  });
});
