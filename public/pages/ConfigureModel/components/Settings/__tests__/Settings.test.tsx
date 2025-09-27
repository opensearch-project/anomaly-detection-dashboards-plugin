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
import { render, fireEvent } from '@testing-library/react';
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
    const { queryByText, findByText, getByPlaceholderText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Must be a positive integer')).toBeNull();
    // Because that validator is passed in the validate prop,
    // Formik calls it every time the interval field changes
    // or loses focus (and again on form submit).
    await fireEvent.focus(getByPlaceholderText('Interval'));
    await fireEvent.blur(getByPlaceholderText('Interval'));
    expect(findByText('Must be a positive integer')).not.toBeNull();
  });
  test('shows error for invalid interval when toggling focus/blur', async () => {
    const { queryByText, findByText, getByPlaceholderText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Required')).toBeNull();
    await userEvent.type(getByPlaceholderText('Interval'), '-1');
    await fireEvent.blur(getByPlaceholderText('Interval'));
    expect(findByText('Must be a positive integer')).not.toBeNull();
  });
  test('shows error for interval of 0 when toggling focus/blur', async () => {
    const { queryByText, findByText, getByPlaceholderText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Required')).toBeNull();
    await userEvent.type(getByPlaceholderText('Interval'), '0');
    await fireEvent.blur(getByPlaceholderText('Interval'));
    expect(findByText('Must be a positive integer')).not.toBeNull();
  });
  test('shows error for invalid window delay when toggling focus/blur', async () => {
    const { queryByText, findByText, getByPlaceholderText } = render(
      <Formik initialValues={{ name: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <Settings />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Required')).toBeNull();
    await userEvent.type(getByPlaceholderText('Window delay'), '-1');
    await fireEvent.blur(getByPlaceholderText('Window delay'));
    expect(findByText('Must be a non-negative integer')).not.toBeNull();
  });

  describe('handleIntervalChange - frequency auto-adjustment', () => {
    test('syncs frequency when interval and frequency start with same value', async () => {
      const initialValues = {
        interval: 5,
        frequency: 5, // synced with interval
        windowDelay: 0,
        history: 40,
      };

      const { getByPlaceholderText } = render(
        <Formik initialValues={initialValues} onSubmit={jest.fn()}>
          {() => <Settings />}
        </Formik>
      );

      const intervalInput = getByPlaceholderText('Interval');
      const frequencyInput = getByPlaceholderText('Frequency');

      // Initially both should be 5
      expect(intervalInput).toHaveValue(5);
      expect(frequencyInput).toHaveValue(5);

      // Change interval from 5 to 10
      await userEvent.clear(intervalInput);
      // set the final value in one change event
      // when using userEvent.type, typing "10" fires two onChange events: first '1', then '10'
      // In the full file run, the assertion expect(frequencyInput).toHaveValue(10) sometimes
      // executes before that async update finishes.
      // In “maintains sync relationship through multiple changes”, we do more user actions (8 → 12 → 3).
      //  Those extra events/blur cycles effectively give time for the async state/effect/validation to
      //  settle before each assertion, so it passes.
      fireEvent.change(intervalInput, { target: { value: 10 } });
      fireEvent.blur(intervalInput);

      // Frequency should automatically update to 10 (maintaining sync)
      expect(frequencyInput).toHaveValue(10);
    });

    test('does not adjust frequency when values are not initially synced', async () => {
      const initialValues = {
        interval: 5,
        frequency: 10, // not synced with interval
        windowDelay: 0,
        history: 40,
      };

      const { getByPlaceholderText } = render(
        <Formik initialValues={initialValues} onSubmit={jest.fn()}>
          {() => <Settings />}
        </Formik>
      );

      const intervalInput = getByPlaceholderText('Interval');
      const frequencyInput = getByPlaceholderText('Frequency');

      // Initially interval is 5, frequency is 10
      expect(intervalInput).toHaveValue(5);
      expect(frequencyInput).toHaveValue(10);

      // Change interval from 5 to 8
      await userEvent.clear(intervalInput);
      await userEvent.type(intervalInput, '8');
      fireEvent.blur(intervalInput);

      // Frequency should remain 10 (not auto-adjusted since they weren't synced)
      expect(frequencyInput).toHaveValue(10);
    });

    test('maintains sync relationship through multiple changes', async () => {
      const initialValues = {
        interval: 5,
        frequency: 5, // synced
        windowDelay: 0,
        history: 40,
      };

      const { getByPlaceholderText } = render(
        <Formik initialValues={initialValues} onSubmit={jest.fn()}>
          {() => <Settings />}
        </Formik>
      );

      const intervalInput = getByPlaceholderText('Interval');
      const frequencyInput = getByPlaceholderText('Frequency');

      // First change: 5 -> 8
      await userEvent.clear(intervalInput);
      await userEvent.type(intervalInput, '8');
      fireEvent.blur(intervalInput);
      expect(frequencyInput).toHaveValue(8);

      // Second change: 8 -> 12 (should maintain sync)
      await userEvent.clear(intervalInput);
      await userEvent.type(intervalInput, '12');
      fireEvent.blur(intervalInput);
      expect(frequencyInput).toHaveValue(12);

      // Third change: 12 -> 3 (should maintain sync)
      await userEvent.clear(intervalInput);
      await userEvent.type(intervalInput, '3');
      fireEvent.blur(intervalInput);
      expect(frequencyInput).toHaveValue(3);
    });

    test('handles edge case where frequency becomes unsynced after manual change', async () => {
      const initialValues = {
        interval: 5,
        frequency: 5, // initially synced
        windowDelay: 0,
        history: 40,
      };

      const { getByPlaceholderText } = render(
        <Formik initialValues={initialValues} onSubmit={jest.fn()}>
          {() => <Settings />}
        </Formik>
      );

      const intervalInput = getByPlaceholderText('Interval');
      const frequencyInput = getByPlaceholderText('Frequency');

      // Manually change frequency to break sync
      await userEvent.clear(frequencyInput);
      await userEvent.type(frequencyInput, '15');
      fireEvent.blur(frequencyInput);

      // Now change interval - should not auto-adjust frequency since they're no longer synced
      await userEvent.clear(intervalInput);
      await userEvent.type(intervalInput, '10');
      fireEvent.blur(intervalInput);

      // Frequency should remain 15 (not auto-adjusted)
      expect(frequencyInput).toHaveValue(15);
    });
  });
});
