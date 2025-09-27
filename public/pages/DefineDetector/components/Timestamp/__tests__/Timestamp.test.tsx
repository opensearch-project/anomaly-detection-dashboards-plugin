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
import { Provider } from 'react-redux';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { render } from '@testing-library/react';
import { Timestamp } from '../Timestamp';
import { DetectorDefinitionFormikValues } from '../../../models/interfaces';
import { CoreServicesContext } from '../../../../../components/CoreServices/CoreServices';
import { FormikProps, Formik } from 'formik';
import { coreServicesMock } from '../../../../../../test/mocks';

import { mockedStore } from '../../../../../redux/utils/testUtils';

const initialState = {
  opensearch: {
    indices: [
      {
        label: 'test-index',
        health: 'green',
      },
    ],
    aliases: [],
    dataTypes: {
      date: ['created_at'],
      date_nanos: ['timestamp'],
    },
    requesting: false,
    searchResult: {},
    errorMessage: '',
  },
};

const values = {
  name: 'test-ad',
  description: 'desc',
  index: [
    {
      label: 'test-index',
      health: 'green',
    },
  ],
  filters: [],
  filterQuery: JSON.stringify({ bool: { filter: [] } }, null, 4),
  timeField: '',
} as DetectorDefinitionFormikValues;

const formikProps = {
  values: { values },
  errors: {},
  touched: {
    index: true,
    name: true,
    timeField: true,
  },
  isSubmitting: false,
  isValidating: false,
  submitCount: 0,
  initialErrors: {},
  initialTouched: {},
  isValid: true,
  dirty: true,
  validateOnBlur: true,
  validateOnChange: true,
  validateOnMount: true,
} as FormikProps<DetectorDefinitionFormikValues>;

describe('<Timestamp /> spec', () => {
  test('renders the component', () => {
    const { container } = render(
      <Provider store={mockedStore(initialState)}>
        <Router>
          <Switch>
            <Route
              render={(props: RouteComponentProps) => (
                <CoreServicesContext.Provider value={coreServicesMock}>
                  <Formik initialValues={values} onSubmit={jest.fn()}>
                    <Timestamp formikProps={formikProps} />
                  </Formik>
                </CoreServicesContext.Provider>
              )}
            />
          </Switch>
        </Router>
      </Provider>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
