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
import { Formik } from 'formik';
import NameAndDescription from '../NameAndDescription';

// Mock the validation function
jest.mock('../utils/validation', () => ({
  validateForecasterDesc: jest.fn(),
}));

const { validateForecasterDesc } = require('../utils/validation');

const defaultProps = {
  onValidateForecasterName: jest.fn(),
};

const renderWithFormik = (
  initialValues = { name: '', description: '' },
  props = defaultProps
) => {
  return render(
    <Formik initialValues={initialValues} onSubmit={jest.fn()}>
      {() => <NameAndDescription {...props} />}
    </Formik>
  );
};

describe('<NameAndDescription /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    test('renders the component with default props', () => {
      renderWithFormik();
      
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('- optional')).toBeInTheDocument();
      expect(screen.getByTestId('forecasterNameTextInput')).toBeInTheDocument();
      expect(screen.getByTestId('forecasterDescriptionTextInput')).toBeInTheDocument();
    });

    test('renders without title when omitTitle is true', () => {
      renderWithFormik({ name: '', description: '' }, { ...defaultProps, omitTitle: true });
      
      expect(screen.queryByText('Details')).not.toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    test('renders with correct placeholders', () => {
      renderWithFormik();
      
      expect(screen.getByPlaceholderText('Enter forecaster name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe the forecaster')).toBeInTheDocument();
    });

    test('renders with help text for name field', () => {
      renderWithFormik();
      
      expect(screen.getByText(/Specify a unique name. Must contain 1-64 characters/)).toBeInTheDocument();
      expect(screen.getByText(/Valid characters are a-z, A-Z, 0-9/)).toBeInTheDocument();
    });
  });

  describe('Editable vs non-editable modes', () => {
    test('fields are enabled when isEditable is true (default)', () => {
      renderWithFormik();
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      
      expect(nameInput).not.toBeDisabled();
      expect(descriptionInput).not.toBeDisabled();
    });

    test('fields are disabled when isEditable is false', () => {
      renderWithFormik({ name: '', description: '' }, { ...defaultProps, isEditable: false });
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      
      expect(nameInput).toBeDisabled();
      expect(descriptionInput).toBeDisabled();
    });

    test('validation is not called when isEditable is false', async () => {
      const mockValidateName = jest.fn();
      renderWithFormik({ name: '', description: '' }, { 
        onValidateForecasterName: mockValidateName, 
        isEditable: false 
      });
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);
      
      expect(mockValidateName).not.toHaveBeenCalled();
    });
  });

  describe('Name field validation', () => {
    test('calls validation function when name field loses focus', async () => {
      const mockValidateName = jest.fn().mockResolvedValue('');
      renderWithFormik({ name: '', description: '' }, { 
        onValidateForecasterName: mockValidateName 
      });
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(mockValidateName).toHaveBeenCalledWith('');
      });
    });

    test('shows validation error for name field', async () => {
      const mockValidateName = jest.fn().mockResolvedValue('Name is required');
      renderWithFormik({ name: '', description: '' }, { 
        onValidateForecasterName: mockValidateName 
      });
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    test('validates name with actual input value', async () => {
      const mockValidateName = jest.fn().mockResolvedValue('');
      renderWithFormik({ name: '', description: '' }, { 
        onValidateForecasterName: mockValidateName 
      });
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      fireEvent.change(nameInput, { target: { value: 'test-forecaster' } });
      fireEvent.blur(nameInput);
      
      await waitFor(() => {
        expect(mockValidateName).toHaveBeenCalledWith('test-forecaster');
      });
    });
  });

  describe('Description field validation', () => {
    test('calls validation function when description field loses focus', async () => {
      validateForecasterDesc.mockReturnValue('');
      renderWithFormik();
      
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      fireEvent.focus(descriptionInput);
      fireEvent.blur(descriptionInput);
      
      await waitFor(() => {
        expect(validateForecasterDesc).toHaveBeenCalled();
      });
    });

    test('shows validation error for description field', async () => {
      validateForecasterDesc.mockReturnValue('Description is too long');
      renderWithFormik();
      
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      fireEvent.focus(descriptionInput);
      fireEvent.blur(descriptionInput);
      
      await waitFor(() => {
        expect(screen.getByText('Description is too long')).toBeInTheDocument();
      });
    });

    test('does not validate description when isEditable is false', async () => {
      validateForecasterDesc.mockClear();
      renderWithFormik({ name: '', description: '' }, { 
        ...defaultProps, 
        isEditable: false 
      });
      
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      fireEvent.focus(descriptionInput);
      fireEvent.blur(descriptionInput);
      
      expect(validateForecasterDesc).not.toHaveBeenCalled();
    });
  });

  describe('Field values and controlled inputs', () => {
    test('displays initial values correctly', () => {
      renderWithFormik({ name: 'initial-name', description: 'initial description' });
      
      const nameInput = screen.getByTestId('forecasterNameTextInput') as HTMLInputElement;
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput') as HTMLTextAreaElement;
      
      expect(nameInput.value).toBe('initial-name');
      expect(descriptionInput.value).toBe('initial description');
    });

    test('handles empty string values without React warnings', () => {
      renderWithFormik({ name: '', description: '' });
      
      const nameInput = screen.getByTestId('forecasterNameTextInput') as HTMLInputElement;
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput') as HTMLTextAreaElement;
      
      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });

    test('handles undefined/null values gracefully', () => {
      renderWithFormik({ name: undefined, description: null } as any);
      
      const nameInput = screen.getByTestId('forecasterNameTextInput') as HTMLInputElement;
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput') as HTMLTextAreaElement;
      
      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });

    test('updates field values when typing', () => {
      renderWithFormik();
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      
      fireEvent.change(nameInput, { target: { value: 'new-name' } });
      fireEvent.change(descriptionInput, { target: { value: 'new description' } });
      
      expect((nameInput as HTMLInputElement).value).toBe('new-name');
      expect((descriptionInput as HTMLTextAreaElement).value).toBe('new description');
    });
  });

  describe('Form field attributes', () => {
    test('has correct field names and IDs', () => {
      renderWithFormik();
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      
      expect(nameInput).toHaveAttribute('name', 'name');
      expect(descriptionInput).toHaveAttribute('name', 'description');
      
      expect(nameInput).toHaveAttribute('id');
      expect(descriptionInput).toHaveAttribute('id');
    });

    test('description textarea has correct rows attribute', () => {
      renderWithFormik();
      
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      expect(descriptionInput).toHaveAttribute('rows', '3');
    });

    test('shows invalid state when validation fails', async () => {
      const mockValidateName = jest.fn().mockResolvedValue('Invalid name');
      validateForecasterDesc.mockReturnValue('Invalid description');
      
      renderWithFormik({ name: '', description: '' }, { 
        onValidateForecasterName: mockValidateName 
      });
      
      const nameInput = screen.getByTestId('forecasterNameTextInput');
      const descriptionInput = screen.getByTestId('forecasterDescriptionTextInput');
      
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);
      fireEvent.focus(descriptionInput);
      fireEvent.blur(descriptionInput);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid name')).toBeInTheDocument();
        expect(screen.getByText('Invalid description')).toBeInTheDocument();
        
        expect(nameInput).toHaveAttribute('aria-describedby');
        expect(descriptionInput).toHaveAttribute('aria-describedby');
      });
    });
  });
});
