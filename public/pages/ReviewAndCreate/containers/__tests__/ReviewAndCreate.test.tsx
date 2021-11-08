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
import { ReviewAndCreate } from '../ReviewAndCreate';
import configureStore from '../../../../redux/configureStore';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { INITIAL_DETECTOR_JOB_VALUES } from '../../../DetectorJobs/utils/constants';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../../ConfigureModel/utils/constants';
import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../../DefineDetector/utils/constants';

const renderWithRouter = (isEdit: boolean = false) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <ReviewAndCreate
                  setStep={jest.fn()}
                  values={{
                    ...INITIAL_DETECTOR_DEFINITION_VALUES,
                    ...INITIAL_MODEL_CONFIGURATION_VALUES,
                    ...INITIAL_DETECTOR_JOB_VALUES,
                  }}
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

describe('<ReviewAndCreate /> spec', () => {
  test('renders the component', () => {
    const { container, getByText } = renderWithRouter(false);
    expect(container.firstChild).toMatchSnapshot();
    getByText('Review and create');
    getByText('Detector settings');
    getByText('Model configuration');
    getByText('Detector schedule');
    getByText('Create detector');
  });
});
