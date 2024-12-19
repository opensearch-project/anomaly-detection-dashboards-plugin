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
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { AdditionalSettings } from '../AdditionalSettings/AdditionalSettings';

import { Formik } from 'formik';

describe('<AdditionalSettings /> spec', () => {
  test('renders the component with high cardinality disabled', () => {
    const { container, getByText, getAllByText, queryByRole } = render(
      <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <AdditionalSettings
              categoryField={[]}
              shingleSize={8}
              imputationMethod="Ignore"
              customValues={[]}
              suppressionRules={[]}
            />
          </div>
        )}
      </Formik>
    );
    expect(container.firstChild).toMatchSnapshot();
    getAllByText('Category field');
    getAllByText('Shingle size');
    getByText('8');
    getByText('Ignore');

    // Assert that multiple elements with the text '-' are present
    const dashElements = getAllByText('-');
    expect(dashElements.length).toBeGreaterThan(1); // Checks that more than one '-' is found
  });
  test('renders the component with high cardinality enabled', async () => {
    const { container, getByText, getAllByText, getByRole, queryByRole } =
      render(
        <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
          {() => (
            <div>
              <AdditionalSettings
                categoryField={['test_field']}
                shingleSize={8}
                imputationMethod="Custom"
                customValues={['denyMax:5', 'denySum:10']}
                suppressionRules={[
                  "Ignore anomalies for feature 'CPU Usage' with no more than 5 above expected value.",
                  "Ignore anomalies for feature 'Memory Usage' with no more than 10% below expected value.",
                ]}
              />
            </div>
          )}
        </Formik>
      );
    expect(container.firstChild).toMatchSnapshot();
    getAllByText('Category field');
    getAllByText('Shingle size');
    getByText('test_field');
    getByText('8');
    getByText('Custom');
    // Check for the custom values
    getByText('denyMax:5');
    getByText('denySum:10');
  });
});
