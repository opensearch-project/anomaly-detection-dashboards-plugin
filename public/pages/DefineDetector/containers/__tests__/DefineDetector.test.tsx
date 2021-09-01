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

/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
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
import { DefineDetector } from '../DefineDetector';
import configureStore from '../../../../redux/configureStore';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../utils/constants';

const renderWithRouter = (isEdit: boolean = false) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <DefineDetector
                  isEdit={isEdit}
                  initialValues={INITIAL_DETECTOR_DEFINITION_VALUES}
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

describe('<DefineDetector /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  describe('creating detector definition', () => {
    test('renders the component', () => {
      const { container, getByText } = renderWithRouter(false);
      expect(container.firstChild).toMatchSnapshot();
      getByText('Define detector');
    });

    test('validate all required fields', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          indices: [
            { index: 'hello', health: 'green' },
            { index: 'world', health: 'yellow' },
          ],
        },
      });
      const { getByText } = renderWithRouter();
      fireEvent.click(getByText('Next'));
      await wait();
      getByText('Detector name cannot be empty');
      getByText('Must specify an index');
      getByText('Required');
    });
  });
  describe('editing detector definition', () => {
    test('renders the component', () => {
      const { container, getByText } = renderWithRouter(true);
      expect(container.firstChild).toMatchSnapshot();
      getByText('Edit detector settings');
      getByText('Save changes');
    });
  });
});
