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
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListFilters } from '../ListFilters';
import {
  FORECASTER_STATE,
  FORECASTER_STATE_TO_DISPLAY,
} from '../../../../../../server/utils/constants';

// Mock the helper to return consistent state options for tests.
// We use hardcoded strings here because jest.mock() is hoisted and cannot
// access variables defined outside its scope, like the imported
// FORECASTER_STATE_DISPLAY object.
jest.mock('../../../utils/helpers', () => ({
  getForecasterStateOptions: jest.fn(() => [
    { label: 'Running' },
    { label: 'Inactive' },
    { label: 'Error' },
  ]),
}));

describe('<ListFilters />', () => {
  const mockOnForecasterStateChange = jest.fn();
  const mockOnIndexChange = jest.fn();
  const mockOnSearchForecasterChange = jest.fn();
  const mockOnSearchIndexChange = jest.fn();

  const defaultProps = {
    search: '',
    selectedForecasterStates: [],
    selectedIndices: [],
    indexOptions: [
      { label: 'index-1' },
      { label: 'index-2' },
      { label: 'index-3' },
    ],
    onForecasterStateChange: mockOnForecasterStateChange,
    onIndexChange: mockOnIndexChange,
    onSearchForecasterChange: mockOnSearchForecasterChange,
    onSearchIndexChange: mockOnSearchIndexChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly with default props', () => {
    render(<ListFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getByTestId('forecasterStateFilter')).toBeInTheDocument();
    expect(screen.getByTestId('indicesFilter')).toBeInTheDocument();
    });

  test('calls onSearchForecasterChange when user types in search box', () => {
    const user = userEvent.setup();
    render(<ListFilters {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'test search');
    expect(mockOnSearchForecasterChange).toHaveBeenCalled();
    });

  test('displays selected items as pills instead of placeholder text', () => {
    const propsWithSelections = {
      ...defaultProps,
      selectedForecasterStates: [FORECASTER_STATE.RUNNING],
      selectedIndices: ['index-1', 'index-2'],
    };
    const { container } = render(<ListFilters {...propsWithSelections} />);

    // When items are selected, EuiComboBox renders them as "pills"
    // and the placeholder text is no longer visible. We should test
    // for the presence of these pills instead.
    expect(
      container.querySelector(
        `[title="${
          FORECASTER_STATE_TO_DISPLAY[FORECASTER_STATE.RUNNING]
        }"]`
      )
    ).toBeInTheDocument();
    expect(container.querySelector(`[title="index-1"]`)).toBeInTheDocument();
    expect(container.querySelector(`[title="index-2"]`)).toBeInTheDocument();
    });

  test('correctly maps selected states to display names', () => {
    const propsWithSelections = {
        ...defaultProps,
      selectedForecasterStates: [
        FORECASTER_STATE.RUNNING,
        FORECASTER_STATE.INACTIVE_STOPPED,
        FORECASTER_STATE.INACTIVE_NOT_STARTED, // This should map to the same display name as stopped
      ],
      };
    const { container } = render(<ListFilters {...propsWithSelections} />);

    // Check that the rendered component contains the correct display names
    // EUI ComboBox renders selected options as EuiPill
    expect(container.querySelector(`[title="${FORECASTER_STATE_TO_DISPLAY[FORECASTER_STATE.RUNNING]}"]`)).toBeInTheDocument();
    expect(container.querySelector(`[title="${FORECASTER_STATE_TO_DISPLAY[FORECASTER_STATE.INACTIVE_STOPPED]}"]`)).toBeInTheDocument();
    });
  
  test('calls onForecasterStateChange when a status is selected', async () => {
    render(<ListFilters {...defaultProps} />);
    // To reliably open the EuiComboBox, we must find the specific toggle button within it.
    const stateFilter = screen.getByTestId('forecasterStateFilter');
    const toggleButton = within(stateFilter).getByTestId(
      'comboBoxToggleListButton'
    );
    fireEvent.click(toggleButton);

    // Find and click an option using the hardcoded string from our mock
    const option = await screen.findByText('Running');
    fireEvent.click(option);
    expect(mockOnForecasterStateChange).toHaveBeenCalledWith([
      { label: 'Running' },
    ]);
    });

  test('calls onIndexChange when an index is selected', async () => {
    render(<ListFilters {...defaultProps} />);
    // To reliably open the EuiComboBox, we must find the specific toggle button within it.
    const indexFilter = screen.getByTestId('indicesFilter');
    const toggleButton = within(indexFilter).getByTestId(
      'comboBoxToggleListButton'
    );
    fireEvent.click(toggleButton);

    // Find and click an option
    const option = await screen.findByText('index-1');
    fireEvent.click(option);
    expect(mockOnIndexChange).toHaveBeenCalledWith([{ label: 'index-1' }]);
  });

  // This test must be `async` because `userEvent.type()` is an asynchronous
  // function. It simulates a user typing characters one by one and returns
  // a promise that resolves after all events have been fired. We use `await`
  // to ensure our assertions run only after the typing is complete.
  test('calls onSearchIndexChange when searching in index filter', async () => {
    const user = userEvent.setup();
    render(<ListFilters {...defaultProps} />);
    const indexFilter = screen.getByTestId('indicesFilter');
    const input = within(indexFilter).getByRole('textbox');
    await user.type(input, 'search-term');
    // We verify that the callback was fired for each character typed.
    expect(mockOnSearchIndexChange).toHaveBeenCalledTimes('search-term'.length);
    // We use `toHaveBeenLastCalledWith` to check that the *final* call
    // was with the complete string.
    expect(mockOnSearchIndexChange).toHaveBeenLastCalledWith('search-term', false);
  });
});
