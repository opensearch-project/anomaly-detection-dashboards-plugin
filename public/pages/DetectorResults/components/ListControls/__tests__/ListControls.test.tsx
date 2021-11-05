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
import { ListControls } from '../ListControls';

describe('<ListControls /> spec', () => {
  const defaultProps = {
    activePage: 1,
    pageCount: 10,
    search: '',
    onSearchChange: jest.fn(),
    onPageClick: jest.fn(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Empty results', () => {
    test('renders component with empty message', async () => {
      const { container } = render(<ListControls {...defaultProps} />);
      expect(container.firstChild).toMatchSnapshot();
    });
    test('pagination should be visible if pages count more than 1', async () => {
      const { queryByTestId } = render(
        <ListControls {...defaultProps} pageCount={2} />
      );
      expect(queryByTestId('anomaliesPageControls')).not.toBeNull();
    });
    test('should call onPageClick when click on the page', async () => {
      const { getByTestId } = render(<ListControls {...defaultProps} />);
      fireEvent.click(getByTestId('pagination-button-3'));
      expect(defaultProps.onPageClick).toHaveBeenCalledTimes(1);
    });
  });
});
