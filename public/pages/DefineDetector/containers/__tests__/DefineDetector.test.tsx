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
import { render, fireEvent, waitFor } from '@testing-library/react';
import { DefineDetector } from '../DefineDetector';
import configureStore from '../../../../redux/configureStore';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import {
  INITIAL_DETECTOR_DEFINITION_VALUES,
  testDetectorDefinitionValues,
} from '../../utils/constants';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { useFetchDetectorInfo } from '../../../CreateDetectorSteps/hooks/useFetchDetectorInfo';

jest.mock('../../../../services', () => {
  const originalModule = jest.requireActual('../../../../services');

  return {
    ...originalModule,
    getDataSourceEnabled: () => ({
      enabled: false,
    }),
    getUISettings: () => ({
      get: (flag) => {
        if (flag === 'home:useNewHomePage') {
          return false;
        }
        return originalModule.getUISettings().get(flag);
      },
    }),
    getNavigationUI: () => ({
      HeaderControl: null,
    }),
    getApplication: () => ({
      setAppRightControls: null,
    }),
  };
});

jest.mock('../../../CreateDetectorSteps/hooks/useFetchDetectorInfo', () => ({
  // Within each test, the mock implementation for useFetchDetectorInfo is set using jest.Mock.
  // This ensures that the hook returns the desired values for each test case.
  useFetchDetectorInfo: jest.fn(),
}));

const renderWithRouterEmpty = (isEdit: boolean = false) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <DefineDetector
                  setActionMenu={jest.fn()}
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

const renderWithRouterFull = (isEdit: boolean = false) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <DefineDetector
                  setActionMenu={jest.fn()}
                  isEdit={isEdit}
                  initialValues={testDetectorDefinitionValues}
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

const renderWithRouterFullAndEdit = (isEdit: boolean = true) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <DefineDetector
                  setActionMenu={jest.fn()}
                  isEdit={isEdit}
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

describe('<DefineDetector /> Full', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  describe('creating detector definition', () => {
    test('renders the component', () => {
      const detectorInfo = {
        detector: getRandomDetector(true),
        hasError: false,
        isLoadingDetector: true,
        errorMessage: undefined,
      };

      (useFetchDetectorInfo as jest.Mock).mockImplementation(
        () => detectorInfo
      );
      const { container, getByText } = renderWithRouterFull(false);
      getByText('Define detector');
      expect(container.firstChild).toMatchSnapshot();
    });

    test('duplicate name', async () => {
      const detectorInfo = {
        detector: getRandomDetector(true),
        hasError: false,
        isLoadingDetector: true,
        errorMessage: undefined,
      };

      (useFetchDetectorInfo as jest.Mock).mockImplementation(
        () => detectorInfo
      );
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          count: 0,
          match: true,
        },
      });

      const { getByText } = renderWithRouterFull();
      fireEvent.click(getByText('Next'));

      await waitFor(() => {});
      getByText('Duplicate detector name');
      getByText('Must specify an index');
    });
  });
});

describe('<DefineDetector /> FullEdit', () => {
  beforeEach(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  describe('editing detector page', () => {
    test('renders the component', () => {
      const detectorInfo = {
        detector: getRandomDetector(true, '', ['opensearch:index-1']),
        hasError: false,
        isLoadingDetector: true,
        errorMessage: undefined,
      };

      (useFetchDetectorInfo as jest.Mock).mockImplementation(
        () => detectorInfo
      );
      const { container, getByText } = renderWithRouterFullAndEdit(true);
      getByText('Edit detector settings');
      getByText('opensearch (Remote)');
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});

describe('<DefineDetector /> empty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });
  describe('creating detector definition', () => {
    test('renders the component', () => {
      const { container, getByText } = renderWithRouterEmpty(false);
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
      const { getByText } = renderWithRouterEmpty();
      fireEvent.click(getByText('Next'));
      await waitFor(() => {});
      getByText('Detector name cannot be empty');
      getByText('Must specify an index');
      getByText('Required');
    });
  });
  describe('editing detector definition', () => {
    test('renders the component', () => {
      const { container, getByText } = renderWithRouterEmpty(true);
      expect(container.firstChild).toMatchSnapshot();
      getByText('Edit detector settings');
      getByText('Save changes');
    });
  });
});
