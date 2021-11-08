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
import { render, fireEvent, wait } from '@testing-library/react';
import { ConfigureModel } from '../ConfigureModel';
import configureStore from '../../../../redux/configureStore';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../../DefineDetector/utils/constants';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../utils/constants';

const renderWithRouter = (isEdit: boolean = false) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <ConfigureModel
                  isEdit={isEdit}
                  detectorDefinitionValues={INITIAL_DETECTOR_DEFINITION_VALUES}
                  initialValues={INITIAL_MODEL_CONFIGURATION_VALUES}
                  {...props}
                />
              </CoreServicesContext.Provider>
            )}
          />
        </Switch>
      </Router>
    </Provider>
  ),
});

describe('<ConfigureModel /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  describe('creating model configuration', () => {
    test('renders the component', () => {
      const { container, getByText } = renderWithRouter(false);
      expect(container.firstChild).toMatchSnapshot();
      getByText('Configure model');
    });

    test('validate all required fields', async () => {
      const { getByText } = renderWithRouter();
      fireEvent.click(getByText('Next'));
      await wait();
      getByText('You must enter a feature name');
      getByText('You must select a field');
    });
  });
  describe('editing model configuration', () => {
    test('renders the component', () => {
      const { container, getByText } = renderWithRouter(true);
      expect(container.firstChild).toMatchSnapshot();
      getByText('Edit model configuration');
      getByText('Save changes');
    });
  });
});
