import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Formik } from 'formik';
import { AdvancedSettings } from '../AdvancedSettings'; // Adjust the path as necessary

describe('AdvancedSettings Component', () => {
  test('displays error when -1 is entered in suppression rules absolute threshold', async () => {
    render(
      <Formik
        initialValues={{
          suppressionRules: [{ featureName: '', absoluteThreshold: '', relativeThreshold: '', aboveBelow: 'above' }],
        }}
        onSubmit={jest.fn()}
      >
        {() => <AdvancedSettings />}
      </Formik>
    );

    // Open the advanced settings
    userEvent.click(screen.getByText('Show'));

    screen.logTestingPlaygroundURL();

    // Click to add a new suppression rule
    const addButton = screen.getByRole('button', { name: /add rule/i });
    fireEvent.click(addButton);

    // Find the absolute threshold input and type -1
    const absoluteThresholdInput = screen.getAllByPlaceholderText('Absolute')[0]; // Select the first absolute threshold input
    userEvent.type(absoluteThresholdInput, '-1');

    // Trigger validation
    fireEvent.blur(absoluteThresholdInput);

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('absolute threshold must be a positive number greater than zero')).toBeInTheDocument();
    });
  });
  test('displays error when -1 is entered in suppression rules relative threshold', async () => {
    render(
      <Formik
        initialValues={{
          suppressionRules: [{ featureName: '', absoluteThreshold: '', relativeThreshold: '', aboveBelow: 'above' }],
        }}
        onSubmit={jest.fn()}
      >
        {() => <AdvancedSettings />}
      </Formik>
    );

    // Open the advanced settings
    userEvent.click(screen.getByText('Show'));

    screen.logTestingPlaygroundURL();

    // Click to add a new suppression rule
    const addButton = screen.getByRole('button', { name: /add rule/i });
    fireEvent.click(addButton);

    // Find the relative threshold input and type -1
    const relativeThresholdInput = screen.getAllByPlaceholderText('Relative')[0]; // Select the first absolute threshold input
    userEvent.type(relativeThresholdInput, '-1');

    // Trigger validation
    fireEvent.blur(relativeThresholdInput);

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('relative threshold must be a positive number greater than zero')).toBeInTheDocument();
    });
  });
});
