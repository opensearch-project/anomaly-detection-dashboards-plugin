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
import { render, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../Settings';

import { Formik } from 'formik';

describe('<Settings /> spec', () => {
  test('renders the component', () => {
    const { container } = render(
      <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
  test('shows error for empty interval when toggling focus/blur', async () => {
    const { queryByText, findByText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Required')).toBeNull();
    const intervalRow = screen.getByTitle('Forecasting interval');
    const intervalInput = within(intervalRow).getByRole('spinbutton');
    fireEvent.focus(intervalInput);
    fireEvent.blur(intervalInput);
    expect(findByText('Required')).not.toBeNull();
  });
  test('shows error for invalid interval when toggling focus/blur', async () => {
    const { queryByText, findByText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Required')).toBeNull();
    const intervalRow = screen.getByTitle('Forecasting interval');
    const intervalInput = within(intervalRow).getByRole('spinbutton');
    userEvent.type(intervalInput, '-1');
    fireEvent.blur(intervalInput);
    expect(findByText('Must be a positive integer')).not.toBeNull();
  });
  test('shows error for interval of 0 when toggling focus/blur', async () => {
    const { queryByText, findByText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Required')).toBeNull();
    const intervalRow = screen.getByTitle('Forecasting interval');
    const intervalInput = within(intervalRow).getByRole('spinbutton');
    userEvent.type(intervalInput, '0');
    fireEvent.blur(intervalInput);
    expect(findByText('Must be a positive integer')).not.toBeNull();
  });
  test('shows error for empty window delay when toggling focus/blur', async () => {
    const { queryByText, findByText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Required')).toBeNull();
    const windowDelayRow = screen.getByTitle('Window delay');
    const windowDelayInput = within(windowDelayRow).getByRole('spinbutton');
    fireEvent.focus(windowDelayInput);
    fireEvent.blur(windowDelayInput);
    expect(findByText('Required')).not.toBeNull();
  });
  test('shows error for invalid window delay when toggling focus/blur', async () => {
    const { queryByText, findByText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Required')).toBeNull();
    const windowDelayRow = screen.getByTitle('Window delay');
    const windowDelayInput = within(windowDelayRow).getByRole('spinbutton');
    userEvent.type(windowDelayInput, '-1');
    fireEvent.blur(windowDelayInput);
    expect(findByText('Must be a non-negative integer')).not.toBeNull();
  });
});
