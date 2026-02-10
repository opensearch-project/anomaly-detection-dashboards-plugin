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
import { ConfirmStartForecastersModal } from '../ConfirmStartForecastersModal';
import { ForecasterListItem } from '../../../../../models/interfaces';

const testForecaster: ForecasterListItem = {
  id: 'forecaster-id-0',
  name: 'Test Forecaster',
  indices: ['test-index'],
  curState: 'Inactive not started',
  lastUpdateTime: 1640995200000,
  description: 'Test forecaster description',
};

const defaultProps = {
  forecasters: [testForecaster],
  onHide: jest.fn(),
  onConfirm: jest.fn(),
  onStartForecaster: jest.fn(),
  isListLoading: false,
};

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('<ConfirmStartForecastersModal /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Component rendering', () => {
    test('renders modal with correct title and content', () => {
      render(<ConfirmStartForecastersModal {...defaultProps} />);
      
      expect(screen.getByText('Start forecaster?')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to start the forecaster "Test Forecaster"/)).toBeInTheDocument();
      expect(screen.getByText(/It will begin initializing/)).toBeInTheDocument();
      expect(screen.getByTestId('startForecasterModal')).toBeInTheDocument();
    });

    test('renders cancel and confirm buttons', () => {
      render(<ConfirmStartForecastersModal {...defaultProps} />);
      
      expect(screen.getByTestId('cancelButton')).toBeInTheDocument();
      expect(screen.getByTestId('confirmButton')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Start forecaster')).toBeInTheDocument();
    });

    test('shows loading state when isListLoading is true', () => {
      render(<ConfirmStartForecastersModal {...defaultProps} isListLoading={true} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      expect(confirmButton).toBeDisabled();
      
      // Cancel button should be hidden when loading
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    test('returns null and logs error when no forecasters provided', () => {
      const { container } = render(
        <ConfirmStartForecastersModal {...defaultProps} forecasters={[]} />
      );
      
      expect(container.firstChild).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'ConfirmStartForecastersModal requires exactly one forecaster.'
      );
    });

    test('returns null and logs error when multiple forecasters provided', () => {
      const multipleForecasters = [testForecaster, { ...testForecaster, id: 'forecaster-2' }];
      const { container } = render(
        <ConfirmStartForecastersModal {...defaultProps} forecasters={multipleForecasters} />
      );
      
      expect(container.firstChild).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'ConfirmStartForecastersModal requires exactly one forecaster.'
      );
    });

    test('returns null and logs error when forecasters is undefined', () => {
      const { container } = render(
        <ConfirmStartForecastersModal {...defaultProps} forecasters={undefined as any} />
      );
      
      expect(container.firstChild).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        'ConfirmStartForecastersModal requires exactly one forecaster.'
      );
    });
  });

  describe('User interactions', () => {
    test('calls onHide when cancel button is clicked', async () => {
      render(<ConfirmStartForecastersModal {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('cancelButton'));
      
      await waitFor(() => {
        expect(defaultProps.onHide).toHaveBeenCalledTimes(1);
      });
    });

    test('calls onHide when modal is closed via overlay', async () => {
      render(<ConfirmStartForecastersModal {...defaultProps} />);
      
      const modal = screen.getByTestId('startForecasterModal');
      fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });
      
      await waitFor(() => {
        expect(defaultProps.onHide).toHaveBeenCalledTimes(1);
      });
    });

    test('calls onStartForecaster and onConfirm when confirm button is clicked', async () => {
      const mockOnStartForecaster = jest.fn().mockResolvedValue(undefined);
      render(
        <ConfirmStartForecastersModal 
          {...defaultProps} 
          onStartForecaster={mockOnStartForecaster}
        />
      );
      
      fireEvent.click(screen.getByTestId('confirmButton'));
      
      await waitFor(() => {
        expect(mockOnStartForecaster).toHaveBeenCalledWith('forecaster-id-0', 'Test Forecaster');
        expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
      });
    });

    test('shows loading state and disables buttons during start operation', async () => {
      const mockOnStartForecaster = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(
        <ConfirmStartForecastersModal 
          {...defaultProps} 
          onStartForecaster={mockOnStartForecaster}
        />
      );
      
      const confirmButton = screen.getByTestId('confirmButton');
      fireEvent.click(confirmButton);
      
      // Should show loading state immediately
      expect(confirmButton).toBeDisabled();
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockOnStartForecaster).toHaveBeenCalled();
      });
    });

    test('handles error during start operation and resets loading state', async () => {
      const mockOnStartForecaster = jest.fn().mockRejectedValue(new Error('Start failed'));
      const mockOnConfirm = jest.fn();
      const mockConsoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ConfirmStartForecastersModal 
          {...defaultProps} 
          onStartForecaster={mockOnStartForecaster}
          onConfirm={mockOnConfirm}
        />
      );
      
      const confirmButton = screen.getByTestId('confirmButton');
      fireEvent.click(confirmButton);
      
      // Wait for async operations to complete
      await waitFor(() => {
        expect(mockOnStartForecaster).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(mockConsoleErrorSpy).toHaveBeenCalledWith('Failed to start forecaster:', expect.any(Error));
        // Should reset loading state and show cancel button again
        expect(screen.getByTestId('cancelButton')).toBeInTheDocument();
        expect(confirmButton).not.toBeDisabled();
      });
      
      // onConfirm should not be called if start fails (it's inside the try block)
      expect(mockOnConfirm).not.toHaveBeenCalled();
      
      mockConsoleErrorSpy.mockRestore();
    });
  });

  describe('Props validation', () => {
    test('displays correct forecaster name in modal content', () => {
      const customForecaster = { ...testForecaster, name: 'Custom Forecaster Name' };
      render(
        <ConfirmStartForecastersModal 
          {...defaultProps} 
          forecasters={[customForecaster]}
        />
      );
      
      expect(screen.getByText(/Are you sure you want to start the forecaster "Custom Forecaster Name"/)).toBeInTheDocument();
    });

    test('passes correct parameters to onStartForecaster', async () => {
      const customForecaster = { 
        ...testForecaster, 
        id: 'custom-id', 
        name: 'Custom Name' 
      };
      const mockOnStartForecaster = jest.fn().mockResolvedValue(undefined);
      
      render(
        <ConfirmStartForecastersModal 
          {...defaultProps} 
          forecasters={[customForecaster]}
          onStartForecaster={mockOnStartForecaster}
        />
      );
      
      fireEvent.click(screen.getByTestId('confirmButton'));
      
      await waitFor(() => {
        expect(mockOnStartForecaster).toHaveBeenCalledWith('custom-id', 'Custom Name');
      });
    });
  });
});
