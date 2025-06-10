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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Formik } from 'formik';
import { AdvancedSettings } from '../AdvancedSettings';
import { SparseDataOptionValue } from '../../../utils/constants';

const defaultInitialValues = {
  shingleSize: '',
  suggestedSeasonality: '',
  recencyEmphasis: '',
  imputationOption: {
    imputationMethod: SparseDataOptionValue.IGNORE,
    custom_value: [],
  },
};

const renderWithFormik = (initialValues = defaultInitialValues, props = {}) => {
  return render(
    <Formik initialValues={initialValues} onSubmit={jest.fn()}>
      {() => <AdvancedSettings {...props} />}
    </Formik>
  );
};

const expandPanel = () => {
  // Find the arrow icon - it could have cursor: pointer (editable) or cursor: not-allowed (non-editable)
  const icons = screen.getAllByRole('img', { hidden: true });
  const arrowIcon = icons.find(icon => {
    const style = window.getComputedStyle(icon);
    // Look for the icon that has either cursor pointer or not-allowed (both are the arrow icon)
    return style.cursor === 'pointer' || style.cursor === 'not-allowed';
  });
  
  if (arrowIcon) {
    fireEvent.click(arrowIcon);
  } else {
    // Fallback to clicking the first icon if we can't find the right one
    fireEvent.click(icons[0]);
  }
};

describe('AdvancedSettings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering and collapsibility', () => {
    test('renders collapsed by default', () => {
      renderWithFormik();
      
      expect(screen.getByText('Advanced model parameters')).toBeInTheDocument();
      expect(screen.queryByTestId('shingleSize')).not.toBeInTheDocument();
      expect(screen.queryByTestId('suggestedSeasonality')).not.toBeInTheDocument();
      expect(screen.queryByTestId('recencyEmphasis')).not.toBeInTheDocument();
    });

    test('expands when arrow icon is clicked', () => {
      renderWithFormik();
      
      expandPanel();
      
      expect(screen.getByTestId('shingleSize')).toBeInTheDocument();
      expect(screen.getByTestId('suggestedSeasonality')).toBeInTheDocument();
      expect(screen.getByTestId('recencyEmphasis')).toBeInTheDocument();
    });

    test('icon is clickable even when not editable', () => {
      renderWithFormik(defaultInitialValues, { isEditable: false });
      
      expandPanel();
      
      // Panel should expand even when not editable
      expect(screen.getByTestId('shingleSize')).toBeInTheDocument();
      expect(screen.getByTestId('suggestedSeasonality')).toBeInTheDocument();
      expect(screen.getByTestId('recencyEmphasis')).toBeInTheDocument();
    });
  });

  describe('Shingle size field', () => {
    beforeEach(() => {
      renderWithFormik();
      expandPanel();
    });

    test('renders shingle size field with correct attributes', () => {
      const shingleSizeInput = screen.getByTestId('shingleSize');
      
      expect(shingleSizeInput).toBeInTheDocument();
      expect(shingleSizeInput).toHaveAttribute('min', '4');
      expect(shingleSizeInput).toHaveAttribute('max', '128');
      expect(shingleSizeInput).toHaveAttribute('placeholder', 'Shingle size');
      
      // Check that at least one intervals badge exists
      const intervalsBadges = screen.getAllByText('intervals');
      expect(intervalsBadges.length).toBeGreaterThan(0);
    });

    test('displays help text for shingle size', () => {
      expect(screen.getByText(/Set the number of past forecast intervals/)).toBeInTheDocument();
      expect(screen.getByText(/shingle size to be in the range of 4 and 128/)).toBeInTheDocument();
    });

    test('accepts valid shingle size values', async () => {
      const shingleSizeInput = screen.getByTestId('shingleSize');
      
      fireEvent.change(shingleSizeInput, { target: { value: '16' } });
      expect((shingleSizeInput as HTMLInputElement).value).toBe('16');
    });
  });

  describe('Non-editable mode', () => {
    test('shingle size is disabled when not editable', () => {
      renderWithFormik(defaultInitialValues, { isEditable: false });
      expandPanel();
      
      const shingleSizeInput = screen.getByTestId('shingleSize');
      expect(shingleSizeInput).toBeDisabled();
    });
  });

  describe('Suggested seasonality field', () => {
    beforeEach(() => {
      renderWithFormik();
      expandPanel();
    });

    test('renders suggested seasonality field with correct attributes', () => {
      const seasonalityInput = screen.getByTestId('suggestedSeasonality');
      
      expect(seasonalityInput).toBeInTheDocument();
      expect(seasonalityInput).toHaveAttribute('min', '8');
      expect(seasonalityInput).toHaveAttribute('max', '256');
    });

    test('displays help text for suggested seasonality', () => {
      expect(screen.getByText(/consistent seasonal variation of the data/)).toBeInTheDocument();
      expect(screen.getByText(/suggested seasonality to be in the range of 8 and 256/)).toBeInTheDocument();
    });

    test('accepts valid seasonality values', async () => {
      const seasonalityInput = screen.getByTestId('suggestedSeasonality');
      
      fireEvent.change(seasonalityInput, { target: { value: '24' } });
      expect((seasonalityInput as HTMLInputElement).value).toBe('24');
    });
  });

  describe('Recency emphasis field', () => {
    beforeEach(() => {
      renderWithFormik();
      expandPanel();
    });

    test('renders recency emphasis field with correct attributes', () => {
      const recencyInput = screen.getByTestId('recencyEmphasis');
      
      expect(recencyInput).toBeInTheDocument();
      expect(recencyInput).toHaveAttribute('min', '1');
    });

    test('displays detailed help text for recency emphasis', () => {
      expect(screen.getByText(/window size.*in a classic moving average/)).toBeInTheDocument();
      expect(screen.getByText(/exponential decay/)).toBeInTheDocument();
      // Test for the parts separately since they're in different elements
      expect(screen.getByText(/The default is/)).toBeInTheDocument();
      expect(screen.getByText('2560')).toBeInTheDocument();
    });

    test('accepts valid recency emphasis values', async () => {
      const recencyInput = screen.getByTestId('recencyEmphasis');
      
      fireEvent.change(recencyInput, { target: { value: '2560' } });
      expect((recencyInput as HTMLInputElement).value).toBe('2560');
    });
  });

  describe('Sparse data handling', () => {
    beforeEach(() => {
      renderWithFormik();
      expandPanel();
    });

    test('renders sparse data handling dropdown with all options', () => {
      const dropdown = screen.getByDisplayValue('Ignore missing value');
      
      expect(dropdown).toBeInTheDocument();
      expect(screen.getByText('Choose how to handle missing data points.')).toBeInTheDocument();
    });

    test('shows all sparse data options', () => {
      const dropdown = screen.getByDisplayValue('Ignore missing value');
      
      // Check that all options are available in the select
      expect(dropdown.querySelector('option[value="ignore"]')).toBeInTheDocument();
      expect(dropdown.querySelector('option[value="previous_value"]')).toBeInTheDocument();
      expect(dropdown.querySelector('option[value="set_to_zero"]')).toBeInTheDocument();
      expect(dropdown.querySelector('option[value="custom_value"]')).toBeInTheDocument();
    });

    test('changes sparse data handling option', () => {
      const dropdown = screen.getByDisplayValue('Ignore missing value');
      
      fireEvent.change(dropdown, { target: { value: SparseDataOptionValue.PREVIOUS_VALUE } });
      expect(dropdown).toHaveValue(SparseDataOptionValue.PREVIOUS_VALUE);
    });

    test('shows custom value section when custom value is selected', () => {
      const dropdown = screen.getByDisplayValue('Ignore missing value');
      
      fireEvent.change(dropdown, { target: { value: SparseDataOptionValue.CUSTOM_VALUE } });
      
      expect(screen.getByRole('heading', { level: 5, name: 'Custom value' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Custom value')).toBeInTheDocument();
    });

    test('hides custom value section when other options are selected', () => {
      // First select custom value
      const dropdown = screen.getByDisplayValue('Ignore missing value');
      fireEvent.change(dropdown, { target: { value: SparseDataOptionValue.CUSTOM_VALUE } });
      expect(screen.getByRole('heading', { level: 5, name: 'Custom value' })).toBeInTheDocument();
      
      // Then select a different option
      fireEvent.change(dropdown, { target: { value: SparseDataOptionValue.SET_TO_ZERO } });
      expect(screen.queryByRole('heading', { level: 5, name: 'Custom value' })).not.toBeInTheDocument();
    });
  });

  describe('Custom value functionality', () => {
    test('automatically adds custom value field when custom value option is selected', () => {
      const initialValues = {
        ...defaultInitialValues,
        imputationOption: {
          imputationMethod: SparseDataOptionValue.CUSTOM_VALUE,
          custom_value: [],
        },
      };
      
      renderWithFormik(initialValues);
      expandPanel();
      
      expect(screen.getByRole('heading', { level: 5, name: 'Custom value' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Custom value')).toBeInTheDocument();
    });

    test('custom value input accepts numeric values', async () => {
      const initialValues = {
        ...defaultInitialValues,
        imputationOption: {
          imputationMethod: SparseDataOptionValue.CUSTOM_VALUE,
          custom_value: [{ data: '' }],
        },
      };
      
      renderWithFormik(initialValues);
      expandPanel();
      
      const customValueInput = screen.getByPlaceholderText('Custom value');
      fireEvent.change(customValueInput, { target: { value: '42.5' } });
      
      expect((customValueInput as HTMLInputElement).value).toBe('42.5');
    });

    test('custom value field is disabled when not editable', () => {
      const initialValues = {
        ...defaultInitialValues,
        imputationOption: {
          imputationMethod: SparseDataOptionValue.CUSTOM_VALUE,
          custom_value: [{ data: '' }],
        },
      };
      
      renderWithFormik(initialValues, { isEditable: false });
      expandPanel();
      
      const customValueInput = screen.getByPlaceholderText('Custom value');
      expect(customValueInput).toBeDisabled();
    });
  });

  describe('Form integration', () => {
    test('handles empty string values for numeric fields', () => {
      renderWithFormik();
      expandPanel();
      
      const shingleSizeInput = screen.getByTestId('shingleSize');
      fireEvent.change(shingleSizeInput, { target: { value: '' } });
      
      expect((shingleSizeInput as HTMLInputElement).value).toBe('');
    });

    test('converts string input to numbers for numeric fields', () => {
      renderWithFormik();
      expandPanel();
      
      const shingleSizeInput = screen.getByTestId('shingleSize');
      fireEvent.change(shingleSizeInput, { target: { value: '16' } });
      
      expect((shingleSizeInput as HTMLInputElement).value).toBe('16');
    });

    test('displays initial values correctly', () => {
      const initialValues = {
        shingleSize: 16,
        suggestedSeasonality: 24,
        recencyEmphasis: 2560,
        imputationOption: {
          imputationMethod: SparseDataOptionValue.PREVIOUS_VALUE,
          custom_value: [],
        },
      };
      
      renderWithFormik(initialValues);
      expandPanel();
      
      expect((screen.getByTestId('shingleSize') as HTMLInputElement).value).toBe('16');
      expect((screen.getByTestId('suggestedSeasonality') as HTMLInputElement).value).toBe('24');
      expect((screen.getByTestId('recencyEmphasis') as HTMLInputElement).value).toBe('2560');
      expect(screen.getByDisplayValue('Previous value')).toBeInTheDocument();
    });
  });

  describe('Accessibility and UX', () => {
    test('has proper labels and help text', () => {
      renderWithFormik();
      expandPanel();
      
      // Use getAllByText and target the first occurrence (which should be the field label)
      expect(screen.getByText('Shingle size')).toBeInTheDocument();
      expect(screen.getByText('Suggested seasonality')).toBeInTheDocument();
      expect(screen.getAllByText('Recency emphasis')[0]).toBeInTheDocument();
      expect(screen.getByText('Sparse data handling')).toBeInTheDocument();
    });

    test('shows unit badges for numeric fields', () => {
      renderWithFormik();
      expandPanel();
      
      const intervalsBadges = screen.getAllByText('intervals');
      expect(intervalsBadges).toHaveLength(3); // shingle size, seasonality, recency emphasis
    });

    test('all fields are properly disabled in non-editable mode', () => {
      renderWithFormik(defaultInitialValues, { isEditable: false });
      expandPanel();
      
      expect(screen.getByTestId('shingleSize')).toBeDisabled();
      expect(screen.getByTestId('suggestedSeasonality')).toBeDisabled();
      expect(screen.getByTestId('recencyEmphasis')).toBeDisabled();
      expect(screen.getByDisplayValue('Ignore missing value')).toBeDisabled();
    });
  });
});
