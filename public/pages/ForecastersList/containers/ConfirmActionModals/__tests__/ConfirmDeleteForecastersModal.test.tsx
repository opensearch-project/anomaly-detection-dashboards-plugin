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
import userEvent from '@testing-library/user-event';
import { ConfirmDeleteForecastersModal } from '../ConfirmDeleteForecastersModal';
import { FORECASTER_STATE } from '../../../../../../server/utils/constants';

const defaultProps = {
  forecasterId: 'test-forecaster-id',
  forecasterName: 'Test Forecaster',
  forecasterState: FORECASTER_STATE.INACTIVE_NOT_STARTED,
  onHide: jest.fn(),
  onConfirm: jest.fn(),
  onStopForecasters: jest.fn(),
  onDeleteForecasters: jest.fn(),
  isListLoading: false,
};

describe('<ConfirmDeleteForecastersModal /> spec', () => {
  const user = userEvent.setup();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    test('renders modal with correct title and content', () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      expect(screen.getByText('Are you sure you want to delete "Test Forecaster"?')).toBeInTheDocument();
      expect(screen.getByText(/The forecaster "Test Forecaster" will be permanently removed/)).toBeInTheDocument();
      expect(screen.getByText(/This action is irreversible/)).toBeInTheDocument();
      expect(screen.getByTestId('deleteForecastersModal')).toBeInTheDocument();
    });

    test('renders delete confirmation field and buttons', () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      // Use regex to find parts of the text that aren't broken by HTML elements
      expect(screen.getByText(/To confirm deletion/)).toBeInTheDocument();
      expect(screen.getByText('delete')).toBeInTheDocument();
      expect(screen.getByText(/in the field/)).toBeInTheDocument();
      
      expect(screen.getByTestId('typeDeleteField')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('delete')).toBeInTheDocument();
      expect(screen.getByTestId('cancelButton')).toBeInTheDocument();
      expect(screen.getByTestId('confirmButton')).toBeInTheDocument();
      expect(screen.getByText('Delete forecasters')).toBeInTheDocument();
    });

    test('shows warning callout for active forecaster', () => {
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          forecasterState={FORECASTER_STATE.RUNNING}
        />
      );
      
      expect(screen.getByText('The forecaster "Test Forecaster" is currently running.')).toBeInTheDocument();
      // Check for warning callout by class instead of icon
      expect(document.querySelector('.euiCallOut--warning')).toBeInTheDocument();
    });

    test('does not show warning callout for inactive forecaster', () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      expect(screen.queryByText('The forecaster "Test Forecaster" is currently running.')).not.toBeInTheDocument();
      expect(document.querySelector('.euiCallOut--warning')).not.toBeInTheDocument();
    });

    test('shows loading state when isListLoading is true', () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} isListLoading={true} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      expect(confirmButton).toBeDisabled();
      
      // Cancel button should be hidden when loading
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
    });
  });

  describe('Delete confirmation field', () => {
    test('delete button is disabled initially', () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      expect(confirmButton).toBeDisabled();
    });

    test('delete button remains disabled when typing incorrect text', async () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'wrong');
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
      
      await user.clear(deleteField);
      await user.type(deleteField, 'delet');
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
    });

    test('delete button is enabled when typing "delete"', async () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
    });

    test('delete button is disabled again when clearing the field', async () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
      
      await user.clear(deleteField);
      await waitFor(() => {
        expect(confirmButton).toBeDisabled();
      });
    });
  });

  describe('User interactions', () => {
    test('calls onHide when cancel button is clicked', async () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      fireEvent.click(screen.getByTestId('cancelButton'));
      
      await waitFor(() => {
        expect(defaultProps.onHide).toHaveBeenCalledTimes(1);
      });
    });

    test('calls onHide when modal is closed via overlay', async () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      const modal = screen.getByTestId('deleteForecastersModal');
      fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });
      
      await waitFor(() => {
        expect(defaultProps.onHide).toHaveBeenCalledTimes(1);
      });
    });

    test('does not call delete functions when delete button clicked without typing "delete"', async () => {
      render(<ConfirmDeleteForecastersModal {...defaultProps} />);
      
      const confirmButton = screen.getByTestId('confirmButton');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(defaultProps.onDeleteForecasters).not.toHaveBeenCalled();
        expect(defaultProps.onStopForecasters).not.toHaveBeenCalled();
        expect(defaultProps.onConfirm).not.toHaveBeenCalled();
      });
    });
  });

  describe('Delete operation for inactive forecaster', () => {
    test('calls onDeleteForecasters and onConfirm for inactive forecaster', async () => {
      const mockOnDeleteForecasters = jest.fn().mockResolvedValue(undefined);
      const mockOnConfirm = jest.fn();
      
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          onDeleteForecasters={mockOnDeleteForecasters}
          onConfirm={mockOnConfirm}
        />
      );
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
      
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnDeleteForecasters).toHaveBeenCalledWith('test-forecaster-id', 'Test Forecaster');
        expect(defaultProps.onStopForecasters).not.toHaveBeenCalled();
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    test('shows loading state during delete operation', async () => {
      const mockOnDeleteForecasters = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          onDeleteForecasters={mockOnDeleteForecasters}
        />
      );
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
      
      fireEvent.click(confirmButton);
      
      // Should show loading state immediately
      expect(confirmButton).toBeDisabled();
      expect(screen.queryByTestId('cancelButton')).not.toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockOnDeleteForecasters).toHaveBeenCalled();
      });
    });
  });

  describe('Delete operation for active forecaster', () => {
    test('calls onStopForecasters then onDeleteForecasters for active forecaster', async () => {
      const mockOnStopForecasters = jest.fn().mockResolvedValue(undefined);
      const mockOnDeleteForecasters = jest.fn().mockResolvedValue(undefined);
      const mockOnConfirm = jest.fn();
      
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          forecasterState={FORECASTER_STATE.RUNNING}
          onStopForecasters={mockOnStopForecasters}
          onDeleteForecasters={mockOnDeleteForecasters}
          onConfirm={mockOnConfirm}
        />
      );
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
      
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnStopForecasters).toHaveBeenCalledWith('test-forecaster-id', 'Test Forecaster');
        expect(mockOnDeleteForecasters).toHaveBeenCalledWith('test-forecaster-id', 'Test Forecaster');
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    test('calls operations in correct order for active forecaster', async () => {
      const callOrder: string[] = [];
      
      const mockOnStopForecasters = jest.fn().mockImplementation(() => {
        callOrder.push('stop');
        return Promise.resolve();
      });
      const mockOnDeleteForecasters = jest.fn().mockImplementation(() => {
        callOrder.push('delete');
        return Promise.resolve();
      });
      const mockOnConfirm = jest.fn().mockImplementation(() => {
        callOrder.push('confirm');
      });
      
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          forecasterState={FORECASTER_STATE.RUNNING}
          onStopForecasters={mockOnStopForecasters}
          onDeleteForecasters={mockOnDeleteForecasters}
          onConfirm={mockOnConfirm}
        />
      );
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
      
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(callOrder).toEqual(['stop', 'delete', 'confirm']);
      });
    });
  });

  describe('Error handling', () => {
    test('calls onConfirm even when delete operation fails', async () => {
      const mockOnDeleteForecasters = jest.fn().mockRejectedValue(new Error('Delete failed'));
      const mockOnConfirm = jest.fn();
      
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          onDeleteForecasters={mockOnDeleteForecasters}
          onConfirm={mockOnConfirm}
        />
      );
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
      
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnDeleteForecasters).toHaveBeenCalled();
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    test('calls onConfirm even when stop operation fails', async () => {
      const mockOnStopForecasters = jest.fn().mockRejectedValue(new Error('Stop failed'));
      const mockOnConfirm = jest.fn();
      
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          forecasterState={FORECASTER_STATE.RUNNING}
          onStopForecasters={mockOnStopForecasters}
          onConfirm={mockOnConfirm}
        />
      );
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
      
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnStopForecasters).toHaveBeenCalled();
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Props validation', () => {
    test('displays correct forecaster name in all text elements', () => {
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          forecasterName="Custom Forecaster Name"
        />
      );
      
      expect(screen.getByText('Are you sure you want to delete "Custom Forecaster Name"?')).toBeInTheDocument();
      expect(screen.getByText(/The forecaster "Custom Forecaster Name" will be permanently removed/)).toBeInTheDocument();
    });

    test('passes correct parameters to callback functions', async () => {
      const mockOnDeleteForecasters = jest.fn().mockResolvedValue(undefined);
      const mockOnConfirm = jest.fn();
      
      render(
        <ConfirmDeleteForecastersModal 
          {...defaultProps} 
          forecasterId="custom-id"
          forecasterName="Custom Name"
          onDeleteForecasters={mockOnDeleteForecasters}
          onConfirm={mockOnConfirm}
        />
      );
      
      const deleteField = screen.getByTestId('typeDeleteField');
      const confirmButton = screen.getByTestId('confirmButton');
      
      await user.type(deleteField, 'delete');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
      
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnDeleteForecasters).toHaveBeenCalledWith('custom-id', 'Custom Name');
      });
    });
  });
});
