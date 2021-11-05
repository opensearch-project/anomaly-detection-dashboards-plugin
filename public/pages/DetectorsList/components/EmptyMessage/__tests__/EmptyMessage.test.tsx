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
import { EmptyDetectorMessage } from '../EmptyMessage';

describe('<EmptyDetectorMessage /> spec', () => {
  describe('Empty results', () => {
    test('renders component with empty message', () => {
      const { container, getByText } = render(
        <EmptyDetectorMessage
          isFilterApplied={false}
          onResetFilters={jest.fn()}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
      getByText('Create detector');
    });
  });
  describe('Filters results message', () => {
    test('renders component no result for filters message', () => {
      const { container } = render(
        <EmptyDetectorMessage
          isFilterApplied={true}
          onResetFilters={jest.fn()}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
    test('resets filters when click on reset filters', () => {
      const handleResetFilters = jest.fn();
      const { getByTestId } = render(
        <EmptyDetectorMessage
          isFilterApplied={true}
          onResetFilters={handleResetFilters}
        />
      );
      fireEvent.click(getByTestId('resetListFilters'));
      expect(handleResetFilters).toHaveBeenCalled();
      expect(handleResetFilters).toHaveBeenCalledTimes(1);
    });
  });
});
