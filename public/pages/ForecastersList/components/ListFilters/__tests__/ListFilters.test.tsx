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

import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ALL_DETECTOR_STATES, ALL_INDICES } from '../../../../utils/constants';
import { ListFilters } from '../ListFilters';
import { DETECTOR_STATE } from '../../../../../../server/utils/constants';

describe('<ListFilters /> spec', () => {
  const defaultProps = {
    activePage: 1,
    pageCount: 10,
    search: '',
    selectedDetectorStates: ALL_DETECTOR_STATES,
    selectedIndices: ALL_INDICES,
    detectorStateOptions: [],
    indexOptions: [],
    onDetectorStateChange: jest.fn(),
    onIndexChange: jest.fn(),
    onSearchDetectorChange: jest.fn(),
    onSearchIndexChange: jest.fn(),
    onPageClick: jest.fn(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Empty results', () => {
    test('renders component with empty message', async () => {
      const { container } = render(<ListFilters {...defaultProps} />);
      expect(container.firstChild).toMatchSnapshot();
    });
    test('should call onSearchDetectorChange callback when user inputs text', () => {
      const { getByPlaceholderText } = render(
        <ListFilters {...defaultProps} />
      );
      userEvent.type(getByPlaceholderText('Search'), 'Testing');
      expect(defaultProps.onSearchDetectorChange).toHaveBeenCalledTimes(7);
    });
    test('pagination should be hidden if pages count is 1', async () => {
      const { queryByTestId } = render(
        <ListFilters {...defaultProps} pageCount={1} />
      );
      expect(queryByTestId('detectorPageControls')).toBeNull();
    });
    test('pagination should be visible if pages count more than 1', async () => {
      const { queryByTestId } = render(
        <ListFilters {...defaultProps} pageCount={2} />
      );
      expect(queryByTestId('detectorPageControls')).not.toBeNull();
    });
    test('should call onPageClick when click on the page', async () => {
      const { getByTestId } = render(<ListFilters {...defaultProps} />);
      fireEvent.click(getByTestId('pagination-button-3'));
      expect(defaultProps.onPageClick).toHaveBeenCalledTimes(1);
    });
    test('should display default detector state and index options', () => {
      const { getByText } = render(<ListFilters {...defaultProps} />);
      expect(getByText('All detector states')).toBeInTheDocument();
      expect(getByText('All indices')).toBeInTheDocument();
    });
    test('should display selected detector state and index options', () => {
      const updatedProps = {
        ...defaultProps,
        selectedDetectorStates: [DETECTOR_STATE.DISABLED],
        selectedIndices: ['test_index'],
      };
      const { getByText } = render(<ListFilters {...updatedProps} />);
      expect(getByText(DETECTOR_STATE.DISABLED)).toBeInTheDocument();
      expect(getByText('test_index')).toBeInTheDocument();
    });
    test('should call onIndexSearchChange when searching in index filter', () => {
      const { getAllByTestId } = render(<ListFilters {...defaultProps} />);
      userEvent.type(getAllByTestId('comboBoxSearchInput')[1], 'Testing');
      expect(defaultProps.onSearchIndexChange).toHaveBeenCalledTimes(7);
    });
    test('should display multiple selected detector state and index options', () => {
      const updatedProps = {
        ...defaultProps,
        selectedDetectorStates: [DETECTOR_STATE.DISABLED, DETECTOR_STATE.INIT],
        selectedIndices: ['test_index_1', 'test_index_2'],
      };
      const { getByText } = render(<ListFilters {...updatedProps} />);
      expect(getByText(DETECTOR_STATE.DISABLED)).toBeInTheDocument();
      expect(getByText(DETECTOR_STATE.INIT)).toBeInTheDocument();
      expect(getByText('test_index_1')).toBeInTheDocument();
      expect(getByText('test_index_2')).toBeInTheDocument();
    });
  });
});
