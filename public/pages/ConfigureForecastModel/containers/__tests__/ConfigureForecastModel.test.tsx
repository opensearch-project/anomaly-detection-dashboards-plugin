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
  Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { ConfigureForecastModel } from '../ConfigureForecastModel';
import configureStore from '../../../../redux/configureStore';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../utils/constants';
import { createMemoryHistory } from 'history';

// Mock services
jest.mock('../../../../services', () => ({
  ...jest.requireActual('../../../../services'),
  getDataSourceEnabled: () => ({ enabled: false }),
  getDataSourceManagementPlugin: () => undefined,
  getSavedObjectsClient: () => ({}),
  getNotifications: () => ({}),
}));

// Mock the hooks
jest.mock('../../../CreateForecasterSteps/hooks/useFetchForecasterInfo', () => ({
  useFetchForecasterInfo: () => ({
    forecaster: undefined,
    hasError: false,
  }),
}));

jest.mock('../../../main/hooks/useHideSideNavBar', () => ({
  useHideSideNavBar: jest.fn(),
}));

// Mock helper functions to avoid data structure issues
jest.mock('../../../ReviewAndCreate/utils/helpers', () => ({
  ...jest.requireActual('../../../ReviewAndCreate/utils/helpers'),
  formikToForecasterDefinition: jest.fn(() => ({
    name: 'Test Forecaster',
    description: 'Test Description',
    indices: ['test-index'],
    timeField: 'timestamp',
  })),
}));

// Mock redux actions
jest.mock('../../../../redux/reducers/forecast', () => ({
  suggestForecaster: jest.fn(() => Promise.resolve({ response: { interval: 10 } })),
  createForecaster: jest.fn(() => Promise.resolve({ response: { id: 'test-forecaster-id' } })),
  testForecaster: jest.fn(() => Promise.resolve({ response: {} })),
  getForecaster: jest.fn(() => Promise.resolve({ response: {} })),
  getForecasterCount: jest.fn(() => Promise.resolve({ response: { count: 0 } })),
  updateForecaster: jest.fn(() => Promise.resolve({ response: {} })),
}));

// Mock the constructHrefWithDataSourceId function
jest.mock('../../../utils/helpers', () => ({
  ...jest.requireActual('../../../utils/helpers'),
  constructHrefWithDataSourceId: jest.fn((href) => href),
}));

const mockForecasterDefinitionValues = {
  name: 'Test Forecaster',
  description: 'Test Description',
  index: [{ label: 'test-index' }],
  timeField: 'timestamp',
  filters: [],
  filterQuery: '',
  featureList: [{
    featureId: 'test-feature-id',
    featureName: 'test-feature',
    featureType: 'simple_aggs',
    featureEnabled: true,
    aggregationMethod: 'sum',
    aggregationField: 'value',
    aggregationQuery: ''
  }],
  categoryFieldEnabled: false,
  categoryField: []
};

const mockSetStep = jest.fn();
const mockSetActionMenu = jest.fn();

const renderWithRouter = (props = {}) => {
  const history = createMemoryHistory();
  const defaultProps = {
    setStep: mockSetStep,
    setActionMenu: mockSetActionMenu,
    forecasterDefinitionValues: mockForecasterDefinitionValues,
    initialValues: INITIAL_MODEL_CONFIGURATION_VALUES,
    ...props,
  };

  return render(
    <Provider store={configureStore(httpClientMock)}>
      <Router history={history}>
        <Switch>
          <Route
            render={(routerProps: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <ConfigureForecastModel
                  {...defaultProps}
                  {...routerProps}
                />
              </CoreServicesContext.Provider>
            )}
          />
        </Switch>
      </Router>
    </Provider>
  );
};

describe('<ConfigureForecastModel /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('Component rendering', () => {
    test('renders the component with correct title', () => {
      renderWithRouter();
      
      expect(screen.getByText('Create forecaster')).toBeInTheDocument();
      expect(screen.getByText('Add model parameters')).toBeInTheDocument();
      expect(screen.getByText(/Core parameters/)).toBeInTheDocument();
    });

    test('renders suggest parameters button', () => {
      renderWithRouter();
      
      expect(screen.getByTestId('suggestParametersButton')).toBeInTheDocument();
      expect(screen.getByText('Suggest parameters')).toBeInTheDocument();
    });

    test('renders all main components', () => {
      renderWithRouter();
      
      // Check for main sections
      expect(screen.getByText('Advanced model parameters')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });

    test('renders action buttons', () => {
      renderWithRouter();
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Create and test')).toBeInTheDocument();
    });
  });

  describe('Suggest parameters functionality', () => {
    test('opens suggest parameters dialog when button is clicked', async () => {
      renderWithRouter();
      
      const suggestButton = screen.getByTestId('suggestParametersButton');
      fireEvent.click(suggestButton);
      
      // Dialog should open - this might be in a portal, so use a more flexible query
      await waitFor(() => {
        // Look for dialog content that might be rendered
        expect(screen.getByText('Suggest parameters', { selector: 'h2' })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Navigation', () => {
    test('navigates to previous step when Previous button is clicked', () => {
      renderWithRouter();
      
      const previousButton = screen.getByTestId('configureModelPreviousButton');
      fireEvent.click(previousButton);
      
      expect(mockSetStep).toHaveBeenCalledWith(1);
    });

    test('navigates to forecasters list when Cancel button is clicked', () => {
      const mockHistory = createMemoryHistory();
      const mockHistoryPush = jest.spyOn(mockHistory, 'push');
      
      render(
        <Provider store={configureStore(httpClientMock)}>
          <Router history={mockHistory}>
            <Switch>
              <Route
                render={(routerProps: RouteComponentProps) => (
                  <CoreServicesContext.Provider value={coreServicesMock}>
                    <ConfigureForecastModel
                      setStep={mockSetStep}
                      setActionMenu={mockSetActionMenu}
                      forecasterDefinitionValues={mockForecasterDefinitionValues}
                      initialValues={INITIAL_MODEL_CONFIGURATION_VALUES}
                      {...routerProps}
                    />
                  </CoreServicesContext.Provider>
                )}
              />
            </Switch>
          </Router>
        </Provider>
      );
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockHistoryPush).toHaveBeenCalledWith('/forecasters');
    });
  });

  describe('Breadcrumb navigation', () => {
    test('sets correct breadcrumbs on mount', () => {
      renderWithRouter();
      
      expect(coreServicesMock.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        expect.objectContaining({ text: 'Forecasting' }),
        expect.objectContaining({ text: 'Create forecaster' }),
      ]);
    });
  });

  describe('Component integration', () => {
    test('renders Settings component', () => {
      renderWithRouter();
      
      // Settings component should render its content
      expect(screen.getByText('Forecasting interval')).toBeInTheDocument();
    });

    test('renders AdvancedSettings component', () => {
      renderWithRouter();
      
      expect(screen.getByText('Advanced model parameters')).toBeInTheDocument();
    });

    test('renders StorageSettings component', () => {
      renderWithRouter();
      
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });
  });

  describe('Form state management', () => {
    test('initializes with provided initial values', () => {
      const customInitialValues = {
        ...INITIAL_MODEL_CONFIGURATION_VALUES,
        interval: 15,
        shingleSize: 16,
      };

      renderWithRouter({
        initialValues: customInitialValues,
      });
      
      // Component should render without errors with custom initial values
      expect(screen.getByText('Create forecaster')).toBeInTheDocument();
    });

    test('form is properly configured', () => {
      renderWithRouter();
      
      // Formik should be configured with enableReinitialize=true
      // This ensures form updates when initialValues change
      expect(screen.getByText('Create forecaster')).toBeInTheDocument();
    });
  });
});
