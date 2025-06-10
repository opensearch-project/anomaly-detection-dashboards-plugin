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
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { ConfirmStopForecastersModal } from '../ConfirmStopForecastersModal';
import { ForecasterListItem } from '../../../../../models/interfaces';
import { FORECASTER_STATE } from '../../../../../../server/utils/constants';

const testForecasters: ForecasterListItem[] = [
  {
    id: 'forecaster-id-0',
    name: 'Test Forecaster 1',
    indices: ['test-index-1'],
    curState: FORECASTER_STATE.RUNNING,
    realTimeLastUpdateTime: 1640995200000,
    runOnceLastUpdateTime: 1640995200000,
    stateError: '',
  },
  {
    id: 'forecaster-id-1',
    name: 'Test Forecaster 2',
    indices: ['test-index-2'],
    curState: FORECASTER_STATE.RUNNING,
    realTimeLastUpdateTime: 1640995200000,
    runOnceLastUpdateTime: 1640995200000,
    stateError: '',
  },
];

const defaultProps = {
  forecasters: testForecasters,
  onHide: jest.fn(),
  onConfirm: jest.fn(),
  onStopForecaster: jest.fn(),
  isListLoading: false,
};

describe('<ConfirmStopForecastersModal /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    test('renders modal with default stop action', () => {
      render(<ConfirmStopForecastersModal {...defaultProps} />);
      
      expect(screen.getByText('Are you sure you want to stop the selected forecaster?')).toBeInTheDocument();
      expect(screen.getByTestId('stopForecastersModal')).toBeInTheDocument();
      expect(screen.getByTestId('cancelButton')).toBeInTheDocument();
      expect(screen.getByTestId('confirmButton')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    test('renders modal with custom action text', () => {
      render(<ConfirmStopForecastersModal {...defaultProps} actionText="pause" />);
      
      expect(screen.getByText('Are you sure you want to pause the selected forecaster?')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    test('shows loading state when isListLoading is true', () => {
      render(<ConfirmStopForecastersModal {...defaultProps} isListLoading={true} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      expect(confirmButton).toBeDisabled();
      
      // Cancel button should be hidden when loading
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
    });

    test('capitalizes action text correctly', () => {
      render(<ConfirmStopForecastersModal {...defaultProps} actionText="restart" />);
      
      expect(screen.getByText('Are you sure you want to restart the selected forecaster?')).toBeInTheDocument();
      expect(screen.getByText('Restart')).toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    test('calls onHide when cancel button is clicked', async () => {
      render(<ConfirmStopForecastersModal {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('cancelButton'));
      
      await waitFor(() => {
        expect(defaultProps.onHide).toHaveBeenCalledTimes(1);
      });
    });

    test('calls onHide when modal is closed via overlay', async () => {
      render(<ConfirmStopForecastersModal {...defaultProps} />);
      
      const modal = screen.getByTestId('stopForecastersModal');
      fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });
      
      await waitFor(() => {
        expect(defaultProps.onHide).toHaveBeenCalledTimes(1);
      });
    });

    test('calls onStopForecaster and onConfirm when confirm button is clicked', async () => {
      render(<ConfirmStopForecastersModal {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('confirmButton'));
      
      await waitFor(() => {
        expect(defaultProps.onStopForecaster).toHaveBeenCalledWith('forecaster-id-0', 'Test Forecaster 1');
        expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    test('uses first forecaster from list for stop operation', async () => {
      const mockOnStopForecaster = jest.fn();
      
      render(
        <ConfirmStopForecastersModal 
          {...defaultProps} 
          onStopForecaster={mockOnStopForecaster}
        />
      );
      
      fireEvent.click(screen.getByTestId('confirmButton'));
      
      await waitFor(() => {
        expect(mockOnStopForecaster).toHaveBeenCalledWith('forecaster-id-0', 'Test Forecaster 1');
        expect(mockOnStopForecaster).toHaveBeenCalledTimes(1);
      });
    });

    test('shows loading state during stop operation', async () => {
      render(<ConfirmStopForecastersModal {...defaultProps} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      fireEvent.click(confirmButton);
      
      // Should show loading state immediately
      expect(confirmButton).toBeDisabled();
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
    });
  });

  describe('Props validation', () => {
    test('uses first forecaster when multiple forecasters provided', async () => {
      const multipleForecasters = [
        {
          id: 'forecaster-a',
          name: 'Forecaster A',
          indices: ['index-a'],
          curState: 'Running' as any,
          lastUpdateTime: 1640995200000,
          description: 'Forecaster A description',
        },
        {
          id: 'forecaster-b', 
          name: 'Forecaster B',
          indices: ['index-b'],
          curState: 'Running' as any,
          lastUpdateTime: 1640995200000,
          description: 'Forecaster B description',
        },
      ];

      const mockOnStopForecaster = jest.fn();
      
      render(
        <ConfirmStopForecastersModal 
          {...defaultProps} 
          forecasters={multipleForecasters}
          onStopForecaster={mockOnStopForecaster}
        />
      );
      
      fireEvent.click(screen.getByTestId('confirmButton'));
      
      await waitFor(() => {
        expect(mockOnStopForecaster).toHaveBeenCalledWith('forecaster-a', 'Forecaster A');
        expect(mockOnStopForecaster).not.toHaveBeenCalledWith('forecaster-b', 'Forecaster B');
      });
    });

    test('handles empty actionText gracefully', () => {
      render(<ConfirmStopForecastersModal {...defaultProps} actionText="" />);
      
      // Empty string falls back to 'stop' due to actionText || 'stop' logic
      expect(screen.getByText('Are you sure you want to stop the selected forecaster?')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    test('passes parameters correctly with custom action text', async () => {
      const mockOnStopForecaster = jest.fn();
      const customForecasters = [
        {
          id: 'custom-id',
          name: 'Custom Forecaster',
          indices: ['custom-index'],
          curState: 'Running' as any,
          lastUpdateTime: 1640995200000,
          description: 'Custom description',
        },
      ];
      
      render(
        <ConfirmStopForecastersModal 
          {...defaultProps} 
          forecasters={customForecasters}
          onStopForecaster={mockOnStopForecaster}
          actionText="terminate"
        />
      );
      
      expect(screen.getByText('Are you sure you want to terminate the selected forecaster?')).toBeInTheDocument();
      expect(screen.getByText('Terminate')).toBeInTheDocument();
      
      fireEvent.click(screen.getByTestId('confirmButton'));
      
      await waitFor(() => {
        expect(mockOnStopForecaster).toHaveBeenCalledWith('custom-id', 'Custom Forecaster');
      });
    });
  });

  describe('Loading states', () => {
    test('shows correct loading state when modal is loading', () => {
      render(<ConfirmStopForecastersModal {...defaultProps} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      
      // Before clicking - not loading
      expect(confirmButton).not.toBeDisabled();
      expect(screen.getByTestId('cancelButton')).toBeInTheDocument();
      
      // After clicking - should be loading
      fireEvent.click(confirmButton);
      expect(confirmButton).toBeDisabled();
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
    });

    test('shows correct loading state when isListLoading is true', () => {
      render(<ConfirmStopForecastersModal {...defaultProps} isListLoading={true} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      expect(confirmButton).toBeDisabled();
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
    });

    test('combines modal loading and list loading correctly', () => {
      const { rerender } = render(<ConfirmStopForecastersModal {...defaultProps} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      
      // Start with modal loading
      fireEvent.click(confirmButton);
      expect(confirmButton).toBeDisabled();
      
      // Add list loading
      rerender(<ConfirmStopForecastersModal {...defaultProps} isListLoading={true} />);
      expect(confirmButton).toBeDisabled();
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
    });
  });
});
