import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Formik } from 'formik';
import { SuppressionRules } from '../SuppressionRules';

export const testFeature = {
  featureId: '42a50483-59cd-4470-a65e-e85547e1a173',
  featureName: 'f1',
  featureType: 'simple_aggs',
  featureEnabled: true,
  importance: 1,
  aggregationBy: 'sum',
  newFeature: true,
  aggregationOf: [
    {
      label: 'items_purchased_failure',
      type: 'number',
    },
  ],
};

describe('SuppressionRules Component', () => {
  test('displays error when -1 is entered in suppression rules absolute threshold', async () => {
    render(
      <Formik
        initialValues={{
          suppressionRules: [
            [
              {
                featureName: '',
                absoluteThreshold: '',
                relativeThreshold: '',
                aboveBelow: 'above',
              },
            ],
          ],
        }}
        onSubmit={jest.fn()}
      >
        {() => <SuppressionRules feature={testFeature} featureIndex={0} />}
      </Formik>
    );

    screen.logTestingPlaygroundURL();

    // Click to add a new suppression rule
    const addButton = screen.getByRole('button', { name: /add rule/i });
    fireEvent.click(addButton);

    // Find the threshold input and type -1
    const thresholdInput = screen.getAllByPlaceholderText('Threshold')[0];
    userEvent.type(thresholdInput, '-1');

    // Find the dropdown using the data-test-subj attribute
    const unitDropdown = screen.getByTestId('thresholdType-dropdown-0-0');
    expect(unitDropdown).toBeInTheDocument();

    fireEvent.change(unitDropdown, { target: { value: 'units' } });

    // Trigger validation
    fireEvent.blur(thresholdInput);

    // Wait for the error message to appear
    await waitFor(() => {
      expect(
        screen.getByText(
          'Must be a positive number greater than zero'
        )
      ).toBeInTheDocument();
    });
  });
  test('displays error when -1 is entered in suppression rules relative threshold', async () => {
    render(
      <Formik
        initialValues={{
          suppressionRules: [[{ featureName: '', absoluteThreshold: '', relativeThreshold: '', aboveBelow: 'above' }]],
        }}
        onSubmit={jest.fn()}
      >
        {() => <SuppressionRules feature={testFeature} featureIndex={0} />}
      </Formik>
    );

    screen.logTestingPlaygroundURL();

  // Click to add a new suppression rule
  const addButton = screen.getByRole('button', { name: /add rule/i });
  fireEvent.click(addButton);

  // Find the threshold input and type -1
  const thresholdInput = screen.getAllByPlaceholderText('Threshold')[0];
  userEvent.type(thresholdInput, '-1');

  // Trigger validation
  fireEvent.blur(thresholdInput);

     // Wait for the error message to appear
     await waitFor(() => {
        expect(
          screen.getByText(
            'Must be a positive number greater than zero'
          )
        ).toBeInTheDocument();
      });
    });
    test('displays error when a rule aboveBelow value does not match below directionRule', async () => {
      render(
        <Formik
          initialValues={{
            suppressionRules: [
              [
                {
                  featureName: '',
                  absoluteThreshold: '',
                  relativeThreshold: '',
                  aboveBelow: 'above', 
                  directionRule: false,
                },
                {
                  featureName: 'f1',
                  absoluteThreshold: '',
                  relativeThreshold: '',
                  aboveBelow: 'below',
                  directionRule: true,
                },
              ],
            ],
          }}
          onSubmit={jest.fn()}
        >
          {() => <SuppressionRules feature={testFeature} featureIndex={0} />}
        </Formik>
      );
    
      await waitFor(() => {
        expect(
          screen.getByText(
            'Rules can only be made in the below direction. Same as the base criteria'
          )
        ).toBeInTheDocument();
      });
    });

    test('displays error when a rule aboveBelow value does not match above directionRule', async () => {
      render(
        <Formik
          initialValues={{
            suppressionRules: [
              [
                {
                  featureName: '',
                  absoluteThreshold: '',
                  relativeThreshold: '',
                  aboveBelow: 'below', 
                  directionRule: false,
                },
                {
                  featureName: '',
                  absoluteThreshold: '',
                  relativeThreshold: '',
                  aboveBelow: 'above',
                  directionRule: true,
                },
              ],
            ],
          }}
          onSubmit={jest.fn()}
        >
          {() => <SuppressionRules feature={testFeature} featureIndex={0} />}
        </Formik>
      );
    
      await waitFor(() => {
        expect(
          screen.getByText(
            'Rules can only be made in the above direction. Same as the base criteria'
          )
        ).toBeInTheDocument();
      });
    });
});
