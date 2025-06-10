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
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { DefineForecaster } from '../DefineForecaster';
import configureStore from 'redux-mock-store';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { ForecasterDefinitionFormikValues } from '../../models/interfaces';
import { matchForecaster } from '../../../../redux/reducers/forecast';
import { getApplication, getDataSourceEnabled, getNavigationUI, getUISettings } from '../../../../services';
import thunk from 'redux-thunk';

// Mock redux actions
jest.mock('../../../../redux/reducers/forecast', () => ({
  ...jest.requireActual('../../../../redux/reducers/forecast'),
  matchForecaster: jest.fn(),
}));

// Mock services
jest.mock('../../../../services', () => ({
  getDataSourceEnabled: jest.fn(),
  getUISettings: jest.fn(),
  getNavigationUI: jest.fn(),
  getApplication: jest.fn(),
  getNotifications: jest.fn(),
  getSavedObjectsClient: jest.fn(),
  getDataSourceManagementPlugin: jest.fn(),
  getMappings: jest.fn(),
}));

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

const emptyInitialValues: ForecasterDefinitionFormikValues = {
  name: '',
  description: '',
  index: [],
  filters: [],
  timeField: '',
  featureList: [],
  categoryFieldEnabled: false,
  categoryField: [],
  resultIndex: '',
};

const filledInitialValues: ForecasterDefinitionFormikValues = {
  name: 'test-forecaster-name',
  description: 'test forecaster description',
  index: [{ label: 'test-index' }],
  timeField: 'timestamp',
  filters: [],
  featureList: [
    {
      featureId: 'abc',
      featureName: 'test-feature',
      featureEnabled: true,
      featureType: {
        value: 'simple_aggs',
        label: 'Aggregation based',
      },
      aggregationBy: 'sum',
      aggregationOf: [{ label: 'value' }],
      aggregationQuery: '{"sum":{"field":"value"}}',
    },
  ],
  categoryFieldEnabled: false,
  categoryField: [],
  resultIndex: '',
};

const renderDefineForecaster = (
  isEdit: boolean = false,
  initialValues: ForecasterDefinitionFormikValues,
  setStep = jest.fn()
) => {
  // Mock store with initial state
  const store = mockStore({
    forecast: {
      forecasters: {},
      errorMessage: '',
    },
    opensearch: {
      dataTypes: {},
      requesting: false,
    }
  });

  return {
  ...render(
      <Provider store={store}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <DefineForecaster
                  setActionMenu={jest.fn()}
                  isEdit={isEdit}
                    initialValues={initialValues}
                    setStep={setStep}
                  {...props}
                />
              </CoreServicesContext.Provider>
            )}
          />
        </Switch>
      </Router>
    </Provider>
  ),
    setStep,
  };
};

describe('<DefineForecaster />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Correctly mock matchForecaster as a thunk action creator.
    // It returns a function (the thunk) which in turn returns a Promise.
    (matchForecaster as jest.Mock).mockImplementation(() => () =>
      Promise.resolve({
        response: { match: false },
      })
    );
    // Set up default mock implementations for services
    (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled: false });
    (getUISettings as jest.Mock).mockReturnValue({ get: jest.fn() });
    (getNavigationUI as jest.Mock).mockReturnValue({ HeaderControl: () => null });
    (getApplication as jest.Mock).mockReturnValue({ setAppRightControls: jest.fn() });

    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('in create mode', () => {
    test('renders the component with correct title', () => {
      renderDefineForecaster(false, emptyInitialValues);
      expect(
        screen.getByTestId('defineOrEditForecasterTitle')
      ).toHaveTextContent('Create forecaster');
    });

    test('shows validation error toast when clicking Next with empty form', async () => {
      renderDefineForecaster(false, emptyInitialValues);
      const nextButton = screen.getByTestId('defineForecasterNextButton');
      fireEvent.click(nextButton);

      // Need to wait for formik validation to complete
      await waitFor(() => {
        expect(
          coreServicesMock.notifications.toasts.addDanger
        ).toHaveBeenCalledWith('One or more input fields is invalid');
    });
  });

    test('shows duplicate name error if name already exists', async () => {
      // For this specific test, we want the thunk to resolve with match: true
      (matchForecaster as jest.Mock).mockImplementation(() => () =>
        Promise.resolve({ response: { match: true } })
      );

      const { getByTestId, findByText } = renderDefineForecaster(
        false,
        emptyInitialValues
      );

      const nameInput = getByTestId('forecasterNameTextInput');
      fireEvent.change(nameInput, { target: { value: 'existing-name' } });
      fireEvent.blur(nameInput); // Trigger validation

      expect(await findByText('Duplicate forecaster name')).toBeVisible();
    });

    test('calls setStep if form is valid', async () => {
      const { setStep } = renderDefineForecaster(false, filledInitialValues);

      const nextButton = screen.getByTestId('defineForecasterNextButton');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(setStep).toHaveBeenCalledWith(2);
      });
      expect(
        coreServicesMock.notifications.toasts.addDanger
      ).not.toHaveBeenCalled();
    });
  });

  describe('in edit mode', () => {
    test('renders with correct title', () => {
      renderDefineForecaster(true, filledInitialValues);
      expect(
        screen.getByTestId('defineOrEditForecasterTitle')
      ).toHaveTextContent('Create forecaster'); // The title is static
      // In a real app, breadcrumbs would show the edit state.
      expect(coreServicesMock.chrome.setBreadcrumbs).toHaveBeenCalled();
    });

    test('populates form with initial values', () => {
      const { getByTestId } = renderDefineForecaster(true, filledInitialValues);
      expect(getByTestId('forecasterNameTextInput')).toHaveValue(
        'test-forecaster-name'
      );
    });
  });
});
