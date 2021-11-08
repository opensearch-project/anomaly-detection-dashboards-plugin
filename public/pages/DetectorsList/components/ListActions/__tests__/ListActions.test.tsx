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
import { fireEvent, render, wait } from '@testing-library/react';
import { ListActions } from '../ListActions';

describe('<ListActions /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const defaultProps = {
    onStartDetectors: jest.fn(),
    onStopDetectors: jest.fn(),
    onDeleteDetectors: jest.fn(),
    isActionsDisabled: true,
    isStartDisabled: false,
    isStopDisabled: false,
  };
  describe('List actions', () => {
    console.error = jest.fn();
    test('renders component when disabled', async () => {
      const { container, getByTestId, queryByText } = render(
        <ListActions {...defaultProps} />
      );
      expect(container.firstChild).toMatchSnapshot();
      expect(queryByText('Start')).toBeNull();
      expect(queryByText('Stop')).toBeNull();
      expect(queryByText('Delete')).toBeNull();
      fireEvent.click(getByTestId('listActionsButton'));
      await wait();
      expect(queryByText('Start')).toBeNull();
      expect(queryByText('Stop')).toBeNull();
      expect(queryByText('Delete')).toBeNull();
    });
    test('renders component when enabled', async () => {
      const { container, getByTestId, queryByText } = render(
        <ListActions {...defaultProps} isActionsDisabled={false} />
      );
      expect(container.firstChild).toMatchSnapshot();
      expect(queryByText('Start')).toBeNull();
      expect(queryByText('Stop')).toBeNull();
      expect(queryByText('Delete')).toBeNull();
      fireEvent.click(getByTestId('listActionsButton'));
      await wait();
      expect(queryByText('Start real-time detectors')).not.toBeNull();
      expect(queryByText('Stop real-time detectors')).not.toBeNull();
      expect(queryByText('Delete detectors')).not.toBeNull();
    });
    test('should call onStartDetectors when clicking on start action', async () => {
      const { getByTestId } = render(
        <ListActions {...defaultProps} isActionsDisabled={false} />
      );
      fireEvent.click(getByTestId('listActionsButton'));
      await wait();
      fireEvent.click(getByTestId('startDetectors'));
      expect(defaultProps.onStartDetectors).toHaveBeenCalled();
    });
    test('should call onStopDetectors when clicking on stop action', async () => {
      const { getByTestId } = render(
        <ListActions {...defaultProps} isActionsDisabled={false} />
      );
      fireEvent.click(getByTestId('listActionsButton'));
      await wait();
      fireEvent.click(getByTestId('stopDetectors'));
      expect(defaultProps.onStopDetectors).toHaveBeenCalled();
    });
    test('should call onDeleteDetectors when clicking on delete action', async () => {
      const { getByTestId } = render(
        <ListActions {...defaultProps} isActionsDisabled={false} />
      );
      fireEvent.click(getByTestId('listActionsButton'));
      await wait();
      fireEvent.click(getByTestId('deleteDetectors'));
      expect(defaultProps.onDeleteDetectors).toHaveBeenCalled();
    });
  });
});
