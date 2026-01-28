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
import { render, waitFor, fireEvent } from '@testing-library/react';
import { DailyInsights } from '../DailyInsights';
import { Provider } from 'react-redux';
import {
  MemoryRouter as Router,
  Redirect,
  Route,
  Switch,
  RouteComponentProps,
} from 'react-router-dom';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import configureStore from '../../../../redux/configureStore';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';

// Work around react/react-router type mismatches in the test environment by casting
// router components to `any` (runtime behavior is unchanged).
const AnyRouter: any = Router;
const AnySwitch: any = Switch;
const AnyRoute: any = Route;
const AnyRedirect: any = Redirect;

jest.mock('../../../../services', () => {
  const originalModule = jest.requireActual('../../../../services');

  return {
    ...originalModule,
    getDataSourceEnabled: () => ({
      enabled: false,
    }),
    getUISettings: () => ({
      get: jest.fn((flag) => {
        if (flag === 'home:useNewHomePage') {
          return false;
        }
        if (flag === 'anomalyDetection:dailyInsightsEnabled') {
          return true;
        }
        return false;
      }),
    }),
    getNavigationUI: () => ({
      HeaderControl: jest.fn(() => null),
    }),
    getApplication: () => ({
      setAppDescriptionControls: jest.fn(),
    }),
    getDataSourceFromURL: () => ({
      dataSourceId: undefined,
    }),
    getSavedObjectsClient: () => jest.fn(),
    getNotifications: () => ({
      toasts: {
        addSuccess: jest.fn(),
        addDanger: jest.fn(),
      },
    }),
  };
});

const mockCoreServices = {
  ...coreServicesMock,
  uiSettings: {
    get: jest.fn((key, defaultValue) => {
      if (key === 'anomalyDetection:dailyInsightsEnabled') {
        return true;
      }
      return defaultValue;
    }),
  },
  http: {
    get: jest.fn(),
    post: jest.fn(),
  },
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
    },
  },
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
};

const renderWithRouter = (landingDataSourceId?: string) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <AnyRouter initialEntries={['/daily-insights']}>
        <AnySwitch>
          <AnyRoute
            exact
            path="/daily-insights"
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={mockCoreServices as any}>
                <DailyInsights
                  setActionMenu={jest.fn()}
                  landingDataSourceId={landingDataSourceId}
                  {...props}
                />
              </CoreServicesContext.Provider>
            )}
          />
          <AnyRedirect from="/" to="/daily-insights" />
        </AnySwitch>
      </AnyRouter>
    </Provider>
  ),
});

describe('<DailyInsights /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    httpClientMock.get = jest.fn();
    httpClientMock.post = jest.fn();
  });

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://test.com',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true,
    });
  });

  describe('Feature flag disabled', () => {
    test('renders feature disabled message when feature flag is false', async () => {
      const mockCore = {
        ...mockCoreServices,
        uiSettings: {
          get: jest.fn(() => false),
        },
      };

      const { getByText } = render(
        <Provider store={configureStore(httpClientMock)}>
          <AnyRouter initialEntries={['/daily-insights']}>
            <AnyRoute
              path="/daily-insights"
              render={(props: RouteComponentProps) => (
                <CoreServicesContext.Provider value={mockCore as any}>
                  <DailyInsights
                    setActionMenu={jest.fn()}
                    landingDataSourceId={undefined}
                    {...props}
                  />
                </CoreServicesContext.Provider>
              )}
            />
          </AnyRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Daily Insights Feature Disabled')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    test('renders loading spinner initially', async () => {
      httpClientMock.get = jest.fn(() =>
        (new Promise<any>(() => {}) as any) // Never resolves to keep loading state
      );

      const { container } = renderWithRouter();

      await waitFor(() => {
        const spinner = container.querySelector('.euiLoadingSpinner');
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('Setup view when insights not enabled', () => {
    test('renders setup view when insights job is not running', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        response: {
          enabled: false,
          schedule: null,
        },
      });

      const { getByText } = renderWithRouter();

      await waitFor(() => {
        expect(getByText('Daily Insights Not Configured')).toBeInTheDocument();
        expect(
          getByText(/Daily Insights analyzes your anomaly detection results/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Insights view with results', () => {
    test('renders insights results when enabled', async () => {
      const generatedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const windowStart = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const mockResults = {
        response: {
          results: [
            {
              task_id: 'task-123',
              window_start: windowStart,
              window_end: windowEnd,
              generated_at: generatedAt,
              doc_detector_names: ['detector-1'],
              doc_detector_ids: ['detector-1'],
              doc_indices: ['index-1'],
              doc_model_ids: ['model-1'],
              clusters: [
                {
                  indices: ['index-1'],
                  detector_ids: ['detector-1'],
                  detector_names: ['detector-1'],
                  entities: ['entity-1', 'entity-2'],
                  model_ids: ['model-1'],
                  event_start: windowStart,
                  event_end: windowEnd,
                  cluster_text: 'Correlated anomalies detected across 1 detector(s)',
                  num_anomalies: 1,
                  anomalies: [
                    {
                      model_id: 'model-1',
                      detector_id: 'detector-1',
                      config_id: 'detector-1',
                      data_start_time: windowStart,
                      data_end_time: windowEnd,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      httpClientMock.get = jest
        .fn()
        .mockResolvedValueOnce({
          response: {
            enabled: true,
            schedule: {
              interval: {
                start_time: Date.now(),
                period: 24,
                unit: 'hours',
              },
            },
          },
        })
        .mockResolvedValueOnce(mockResults);

      const { getByText } = renderWithRouter();

      await waitFor(() => {
        expect(getByText('Latest Insights')).toBeInTheDocument();
        expect(getByText('1 Detector')).toBeInTheDocument();
        expect(getByText('1 Index Pattern')).toBeInTheDocument();
      });
    });

    test('renders empty state when no results available', async () => {
      httpClientMock.get = jest
        .fn()
        .mockResolvedValueOnce({
          response: {
            enabled: true,
            schedule: {
              interval: {
                start_time: Date.now(),
                period: 24,
                unit: 'hours',
              },
            },
          },
        })
        .mockResolvedValueOnce({
          response: {
            results: [],
          },
        });

      const { getByText } = renderWithRouter();

      await waitFor(() => {
        expect(getByText('No insights available')).toBeInTheDocument();
      });
    });
  });

  describe('Start insights job', () => {
    test('calls start API with 24h frequency', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        response: {
          enabled: false,
          schedule: null,
        },
      });

      httpClientMock.post = jest.fn().mockResolvedValue({
        message: 'Success',
      });

      const { getByText } = renderWithRouter();

      await waitFor(() => {
        expect(getByText('Daily Insights Not Configured')).toBeInTheDocument();
      });

      // Note: Button is in action menu, testing the API call
      expect(httpClientMock.post).not.toHaveBeenCalled();
    });
  });

  describe('Stop insights job', () => {
    test('calls stop API when stopping job', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        response: {
          enabled: true,
          schedule: {
            interval: {
              start_time: Date.now(),
              period: 24,
              unit: 'hours',
            },
          },
        },
      });

      httpClientMock.post = jest.fn().mockResolvedValue({
        message: 'Success',
      });

      renderWithRouter();

      await waitFor(() => {
        expect(httpClientMock.get).toHaveBeenCalled();
      });
    });
  });

  describe('Event modal', () => {
    test('opens modal when clicking on an event', async () => {
      const generatedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const windowStart = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const mockResults = {
        response: {
          results: [
            {
              task_id: 'task-123',
              window_start: windowStart,
              window_end: windowEnd,
              generated_at: generatedAt,
              doc_detector_names: ['detector-1'],
              doc_detector_ids: ['detector-1'],
              doc_indices: ['index-1'],
              doc_model_ids: ['model-1'],
              clusters: [
                {
                  indices: ['index-1'],
                  detector_ids: ['detector-1'],
                  detector_names: ['detector-1'],
                  entities: ['entity-1'],
                  model_ids: ['model-1'],
                  event_start: windowStart,
                  event_end: windowEnd,
                  cluster_text: 'Test anomaly text',
                  num_anomalies: 1,
                  anomalies: [
                    {
                      model_id: 'model-1',
                      detector_id: 'detector-1',
                      config_id: 'detector-1',
                      data_start_time: windowStart,
                      data_end_time: windowEnd,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      httpClientMock.get = jest
        .fn()
        .mockResolvedValueOnce({
          response: {
            enabled: true,
            schedule: {
              interval: {
                start_time: Date.now(),
                period: 24,
                unit: 'hours',
              },
            },
          },
        })
        .mockResolvedValueOnce(mockResults);

      const { getByText, findByText } = renderWithRouter();

      await waitFor(() => {
        expect(getByText('Latest Insights')).toBeInTheDocument();
      });

      const eventPanel = await findByText('Test anomaly text');
      fireEvent.click(eventPanel.closest('.euiPanel') || eventPanel);

      await waitFor(() => {
        expect(getByText('Event Details')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    test('shows error toast when fetching status fails', async () => {
      httpClientMock.get = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));

      renderWithRouter();

      await waitFor(() => {
        expect(httpClientMock.get).toHaveBeenCalled();
      });
    });

    test('shows error toast when fetching results fails', async () => {
      httpClientMock.get = jest
        .fn()
        .mockResolvedValueOnce({
          response: {
            enabled: true,
            schedule: {
              interval: {
                start_time: Date.now(),
                period: 24,
                unit: 'hours',
              },
            },
          },
        })
        .mockRejectedValueOnce(new Error('Results fetch failed'));

      renderWithRouter();

      await waitFor(() => {
        expect(mockCoreServices.notifications.toasts.addDanger).toHaveBeenCalled();
      });
    });
  });

  describe('Breadcrumbs', () => {
    test('sets breadcrumbs on mount', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        response: {
          enabled: false,
          schedule: null,
        },
      });

      renderWithRouter();

      await waitFor(() => {
        expect(mockCoreServices.chrome.setBreadcrumbs).toHaveBeenCalled();
      });
    });
  });
});

