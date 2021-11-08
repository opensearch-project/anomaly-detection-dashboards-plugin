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
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Formik } from 'formik';
import { AggregationSelector } from '../AggregationSelector';
import {
  initialState,
  mockedStore,
} from '../../../../../redux/utils/testUtils';
import { FeaturesFormikValues } from '../../../models/interfaces';
import { INITIAL_FEATURE_VALUES } from '../../../utils/constants';

const renderAggregationSelector = (initialValue: FeaturesFormikValues) => ({
  ...render(
    <Provider
      store={mockedStore({
        ...initialState,
        opensearch: {
          ...initialState.opensearch,
          dataTypes: {
            keyword: ['cityName.keyword'],
            integer: ['age'],
            text: ['cityName'],
          },
        },
      })}
    >
      <Formik initialValues={initialValue} onSubmit={jest.fn()}>
        {(formikProps) => (
          <div>
            <AggregationSelector />
          </div>
        )}
      </Formik>
    </Provider>
  ),
});

describe('<AggregationSelector /> spec', () => {
  describe('Empty results', () => {
    test('renders component with aggregation types and defaults to empty', () => {
      const { container } = renderAggregationSelector(INITIAL_FEATURE_VALUES);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
