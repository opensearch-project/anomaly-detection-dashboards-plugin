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
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { EmptyForecasterMessage } from '../EmptyMessage';
import { BASE_DOCS_LINK } from '../../../../../utils/constants';

jest.mock('../../../../../services', () => ({
  ...jest.requireActual('../../../../../services'),
  getDataSourceEnabled: () => ({
    enabled: false  
  })
}));

describe('<EmptyForecasterMessage /> spec', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://test.com',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true
    });
  });

  describe('Empty results', () => {
    test('renders component with empty message and learn more link', () => {
      const history = createMemoryHistory(); 

      const { container, getByText } = render(
        <Router history={history}>
          <EmptyForecasterMessage
            isFilterApplied={false}
            onResetFilters={jest.fn()}
          />
        </Router>
      );
      expect(container.firstChild).toMatchSnapshot();
      expect(getByText('Forecasts appear here.')).toBeInTheDocument();
      expect(getByText('Learn more')).toBeInTheDocument();
      expect(getByText('Learn more').closest('a')).toHaveAttribute('href', `${BASE_DOCS_LINK}/forecast`);
    });
  });

  describe('Filters results message', () => {
    test('renders component no result for filters message without learn more link', () => {
      const { container, queryByText } = render(
        <EmptyForecasterMessage
          isFilterApplied={true}
          onResetFilters={jest.fn()}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
      expect(queryByText('Learn more')).not.toBeInTheDocument();
    });

    test('resets filters when click on reset filters', () => {
      const handleResetFilters = jest.fn();
      const { getByTestId } = render(
        <EmptyForecasterMessage
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
