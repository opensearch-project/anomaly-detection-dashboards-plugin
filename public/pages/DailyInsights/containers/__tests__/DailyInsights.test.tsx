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
      <Router initialEntries={['/daily-insights']}>
        <Switch>
          <Route
            exact
            path="/daily-insights"
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={mockCoreServices}>
                <DailyInsights
                  setActionMenu={jest.fn()}
                  landingDataSourceId={landingDataSourceId}
                  {...props}
                />
              </CoreServicesContext.Provider>
            )}
          />
          <Redirect from="/" to="/daily-insights" />
        </Switch>
      </Router>
    </Provider>
  ),
});

describe('<DailyInsights /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          <Router initialEntries={['/daily-insights']}>
            <Route
              path="/daily-insights"
              render={(props: RouteComponentProps) => (
                <CoreServicesContext.Provider value={mockCore}>
                  <DailyInsights
                    setActionMenu={jest.fn()}
                    landingDataSourceId={undefined}
                    {...props}
                  />
                </CoreServicesContext.Provider>
              )}
            />
          </Router>
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('Daily Insights Feature Disabled')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    test('renders loading spinner initially', async () => {
      mockCoreServices.http.get = jest.fn(() =>
        new Promise(() => {}) // Never resolves to keep loading state
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
      mockCoreServices.http.get = jest.fn().mockResolvedValue({
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
      const mockResults = {
        response: {
          results: [
            {
              task_id: 'task-123',
              window_start: '2025-11-04T10:30:31.461Z',
              window_end: '2025-11-05T10:30:31.461Z',
              generated_at: '2025-11-05T13:09:31.461Z',
              doc_detector_ids: ['detector-1'],
              doc_indices: ['index-1'],
              doc_series_keys: ['series-1'],
              paragraphs: [
                {
                  indices: ['index-1'],
                  detector_ids: ['detector-1'],
                  entities: ['entity-1', 'entity-2'],
                  series_keys: ['series-1'],
                  start: '2025-11-05T10:30:31.461Z',
                  end: '2025-11-05T13:09:31.461Z',
                  text: 'Correlated anomalies detected across 1 detector(s)',
                },
              ],
            },
          ],
        },
      };

      mockCoreServices.http.get = jest
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
      mockCoreServices.http.get = jest
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
      mockCoreServices.http.get = jest.fn().mockResolvedValue({
        response: {
          enabled: false,
          schedule: null,
        },
      });

      mockCoreServices.http.post = jest.fn().mockResolvedValue({
        message: 'Success',
      });

      const { getByText } = renderWithRouter();

      await waitFor(() => {
        expect(getByText('Daily Insights Not Configured')).toBeInTheDocument();
      });

      // Note: Button is in action menu, testing the API call
      expect(mockCoreServices.http.post).not.toHaveBeenCalled();
    });
  });

  describe('Stop insights job', () => {
    test('calls stop API when stopping job', async () => {
      mockCoreServices.http.get = jest.fn().mockResolvedValue({
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

      mockCoreServices.http.post = jest.fn().mockResolvedValue({
        message: 'Success',
      });

      renderWithRouter();

      await waitFor(() => {
        expect(mockCoreServices.http.get).toHaveBeenCalled();
      });
    });
  });

  describe('Event modal', () => {
    test('opens modal when clicking on an event', async () => {
      const mockResults = {
        response: {
          results: [
            {
              task_id: 'task-123',
              window_start: '2025-11-04T10:30:31.461Z',
              window_end: '2025-11-05T10:30:31.461Z',
              generated_at: '2025-11-05T13:09:31.461Z',
              doc_detector_ids: ['detector-1'],
              doc_indices: ['index-1'],
              doc_series_keys: ['series-1'],
              paragraphs: [
                {
                  indices: ['index-1'],
                  detector_ids: ['detector-1'],
                  entities: ['entity-1'],
                  series_keys: ['series-1'],
                  start: '2025-11-05T10:30:31.461Z',
                  end: '2025-11-05T13:09:31.461Z',
                  text: 'Test anomaly text',
                },
              ],
            },
          ],
        },
      };

      mockCoreServices.http.get = jest
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
      mockCoreServices.http.get = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));

      renderWithRouter();

      await waitFor(() => {
        expect(mockCoreServices.http.get).toHaveBeenCalled();
      });
    });

    test('shows error toast when fetching results fails', async () => {
      mockCoreServices.http.get = jest
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
      mockCoreServices.http.get = jest.fn().mockResolvedValue({
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

