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
import { DetectorJobs } from '../DetectorJobs';
import configureStore from '../../../../redux/configureStore';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { INITIAL_DETECTOR_JOB_VALUES } from '../../utils/constants';

jest.mock('../../../../services', () => ({
  ...jest.requireActual('../../../../services'),

  getDataSourceEnabled: () => ({
    enabled: false  
  })
}));

const renderWithRouter = (isEdit: boolean = false) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <DetectorJobs
                  setStep={jest.fn()}
                  initialValues={INITIAL_DETECTOR_JOB_VALUES}
                  setInitialValues={jest.fn()}
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

describe('<DetectorJobs /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  describe('configuring detector jobs', () => {
    test('renders the component', () => {
      const { container, getByText } = renderWithRouter(false);
      expect(container.firstChild).toMatchSnapshot();
      getByText('Set up detector jobs');
      getByText('Real-time detection');
      getByText('Historical analysis detection');
      getByText('Next');
    });
  });
});
