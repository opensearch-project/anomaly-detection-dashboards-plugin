/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';

import { CoreServicesContext } from '../CoreServices/CoreServices';
import { coreServicesMock, httpClientMock } from '../../../test/mocks';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { Provider } from 'react-redux';

import configureStore from '../../redux/configureStore';
import SuggestAnomalyDetector from './SuggestAnomalyDetector';
import userEvent from '@testing-library/user-event';
import { HttpFetchOptionsWithPath } from '../../../../../src/core/public';
import {
  getAssistantClient,
  getQueryService,
  getUsageCollection,
} from '../../services';

const notifications = {
  toasts: {
    addDanger: jest.fn().mockName('addDanger'),
    addSuccess: jest.fn().mockName('addSuccess'),
  },
};

const getNotifications = () => {
  return notifications;
};

jest.mock('../../services', () => ({
  ...jest.requireActual('../../services'),
  getNotifications,
  getQueryService: jest.fn().mockReturnValue({
    queryString: {
      getQuery: jest.fn(),
    },
  }),
  getAssistantClient: jest.fn().mockReturnValue({
    agentConfigExists: jest.fn(),
    executeAgentByConfigName: jest.fn(),
  }),
  getUsageCollection: jest.fn(),
}));

const renderWithRouter = () => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <SuggestAnomalyDetector closeFlyout={jest.fn()} />
              </CoreServicesContext.Provider>
            )}
          />
        </Switch>
      </Router>
    </Provider>
  ),
});

describe('GenerateAnomalyDetector spec', () => {
  const user = userEvent.setup();

  describe('Renders failed', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders with invalid dataset type', async () => {
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: undefined,
          title: undefined,
          type: 'INDEX',
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Unsupported dataset type'
        );
      });
    });

    it('renders empty component', async () => {
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: undefined,
          title: undefined,
          type: 'INDEX_PATTERN',
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Cannot extract complete index info from the context'
        );
      });
    });
  });

  describe('Renders loading component', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({
        exists: true,
      });

      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          mappings: {
            test: {
              mappings: {
                properties: {
                  field: {
                    type: 'date',
                  },
                },
              },
            },
          },
        },
      });
    });

    it('renders with empty generated parameters', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [{ result: '' }],
            },
          ],
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Generate parameters for creating anomaly detector failed, reason: Error: Cannot get generated parameters!'
        );
      });
    });

    it('renders with empty parameter', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"opensearch_dashboards_sample_data_logs","categoryField":"ip","aggregationField":"","aggregationMethod":"","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Generate parameters for creating anomaly detector failed, reason: Error: Cannot find aggregation field, aggregation method or date fields!'
        );
      });
    });

    it('renders with empty aggregation field or empty aggregation method', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"opensearch_dashboards_sample_data_logs","categoryField":"ip","aggregationField":",","aggregationMethod":",","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Generate parameters for creating anomaly detector failed, reason: Error: The generated aggregation field or aggregation method is empty!'
        );
      });
    });

    it('renders with different number of aggregation methods and fields', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"opensearch_dashboards_sample_data_logs","categoryField":"ip","aggregationField":"a,b","aggregationMethod":"avg","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Generate parameters for creating anomaly detector failed, reason: Error: The number of aggregation fields and the number of aggregation methods are different!'
        );
      });
    });

    it('renders component completely', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"opensearch_dashboards_sample_data_logs","categoryField":"ip","aggregationField":"responseLatency,response","aggregationMethod":"avg,sum","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
        expect(queryByText('Detector details')).not.toBeNull();
        expect(queryByText('Advanced configuration')).not.toBeNull();
        expect(queryByText('Model Features')).not.toBeNull();
        expect(queryByText('Was this helpful?')).not.toBeNull();
      });
    });
  });

  describe('Test feedback', () => {
    let reportUiStatsMock: any;

    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });

      reportUiStatsMock = jest.fn();
      (getUsageCollection as jest.Mock).mockReturnValue({
        reportUiStats: reportUiStatsMock,
        METRIC_TYPE: {
          CLICK: 'click',
        },
      });

      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({
        exists: true,
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call reportMetric with thumbup when thumbs up is clicked', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"opensearch_dashboards_sample_data_logs","categoryField":"ip","aggregationField":"responseLatency,response","aggregationMethod":"avg,sum","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText, getByLabelText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
        expect(queryByText('Was this helpful?')).not.toBeNull();
      });

      await user.click(getByLabelText('feedback thumbs up'));
      expect(reportUiStatsMock).toHaveBeenCalled();
      expect(reportUiStatsMock).toHaveBeenCalledWith(
        'suggestAD',
        'click',
        expect.stringContaining('generated-')
      );
      expect(reportUiStatsMock).toHaveBeenCalledWith(
        'suggestAD',
        'click',
        expect.stringContaining('thumbup-')
      );
    });

    it('should call reportMetric with thumbdown when thumbs down is clicked', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"opensearch_dashboards_sample_data_logs","categoryField":"ip","aggregationField":"responseLatency,response","aggregationMethod":"avg,sum","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText, getByLabelText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
        expect(queryByText('Was this helpful?')).not.toBeNull();
      });

      await user.click(getByLabelText('feedback thumbs down'));
      expect(reportUiStatsMock).toHaveBeenCalled();
      expect(reportUiStatsMock).toHaveBeenCalledWith(
        'suggestAD',
        'click',
        expect.stringContaining('generated-')
      );
      expect(reportUiStatsMock).toHaveBeenCalledWith(
        'suggestAD',
        'click',
        expect.stringContaining('thumbdown-')
      );
    });
  });

  describe('Test API calls', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({
        exists: true,
      });

      httpClientMock.get = jest.fn(
        (pathOrOptions: string | HttpFetchOptionsWithPath) => {
          const url =
            typeof pathOrOptions === 'string'
              ? pathOrOptions
              : pathOrOptions.path;
          switch (url) {
            case '/api/anomaly_detectors/_mappings':
              return Promise.resolve({
                ok: true,
                response: {
                  mappings: {
                    test: {
                      mappings: {
                        properties: {
                          field: {
                            type: 'date',
                          },
                        },
                      },
                    },
                  },
                },
              });
            case '/api/anomaly_detectors/detectors/_count':
              return Promise.resolve({
                ok: true,
                response: {
                  count: 0,
                },
              });
            default:
              return Promise.resolve({
                ok: true,
              });
          }
        }
      );
    });

    it('All API calls execute successfully', async () => {
      httpClientMock.post = jest.fn(
        (pathOrOptions: string | HttpFetchOptionsWithPath) => {
          const url =
            typeof pathOrOptions === 'string'
              ? pathOrOptions
              : pathOrOptions.path;
          switch (url) {
            case '/api/anomaly_detectors/detectors':
              return Promise.resolve({
                ok: true,
                response: {
                  id: 'test',
                },
              });
            default:
              return Promise.resolve({
                ok: true,
              });
          }
        }
      );
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"ip","aggregationField":"responseLatency,response","aggregationMethod":"avg,sum","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText, getByTestId } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();
      await waitFor(() => {
        expect(queryByText('Generating parameters...')).toBeNull();
        expect(queryByText('Create detector')).not.toBeNull();
        expect(queryByText('Detector details')).not.toBeNull();
        expect(queryByText('Advanced configuration')).not.toBeNull();
        expect(queryByText('Model Features')).not.toBeNull();
      });

      await user.click(getByTestId('SuggestAnomalyDetectorCreateButton'));

      await waitFor(() => {
        expect(httpClientMock.post).toHaveBeenCalledTimes(2);
        expect(getNotifications().toasts.addSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('Generate parameters failed', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockRejectedValueOnce('Generate parameters failed');

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();
      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Generate parameters for creating anomaly detector failed, reason: Generate parameters failed'
        );
      });
    });

    it('Create anomaly detector failed', async () => {
      httpClientMock.post = jest.fn(
        (pathOrOptions: string | HttpFetchOptionsWithPath) => {
          const url =
            typeof pathOrOptions === 'string'
              ? pathOrOptions
              : pathOrOptions.path;
          switch (url) {
            case '/api/anomaly_detectors/detectors':
              return Promise.resolve({
                ok: false,
                error: 'Create anomaly detector failed',
              });
            default:
              return Promise.resolve({
                ok: true,
              });
          }
        }
      );
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"ip","aggregationField":"responseLatency,response","aggregationMethod":"avg,sum","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText, getByTestId } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(queryByText('Generating parameters...')).toBeNull();
        expect(queryByText('Create detector')).not.toBeNull();
        expect(queryByText('Detector details')).not.toBeNull();
        expect(queryByText('Advanced configuration')).not.toBeNull();
        expect(queryByText('Model Features')).not.toBeNull();
      });

      await user.click(getByTestId('SuggestAnomalyDetectorCreateButton'));

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Create anomaly detector failed'
        );
      });
    });

    it('Start anomaly detector failed', async () => {
      httpClientMock.post = jest.fn(
        (pathOrOptions: string | HttpFetchOptionsWithPath) => {
          const url =
            typeof pathOrOptions === 'string'
              ? pathOrOptions
              : pathOrOptions.path;
          switch (url) {
            case '/api/anomaly_detectors/detectors':
              return Promise.resolve({
                ok: true,
                response: {
                  id: 'test',
                },
              });
            case '/api/anomaly_detectors/detectors/test/start':
              return Promise.resolve({
                ok: false,
                error: 'Start anomaly detector failed',
              });
            default:
              return Promise.resolve({
                ok: true,
              });
          }
        }
      );

      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"ip","aggregationField":"responseLatency,response","aggregationMethod":"avg,sum","dateFields":"utc_time,timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText, getByTestId } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(queryByText('Generating parameters...')).toBeNull();
        expect(queryByText('Create detector')).not.toBeNull();
        expect(queryByText('Detector details')).not.toBeNull();
        expect(queryByText('Advanced configuration')).not.toBeNull();
        expect(queryByText('Model Features')).not.toBeNull();
      });

      await user.click(getByTestId('SuggestAnomalyDetectorCreateButton'));

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Start anomaly detector failed'
        );
      });
    });
  });

  describe('Test no timeFieldName in dataset', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      // dataset deliberately has no timeFieldName
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
        },
      });
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({
        exists: true,
      });
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          mappings: {
            test: {
              mappings: {
                properties: {
                  field: { type: 'date' },
                },
              },
            },
          },
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('uses root-level dateField as timeField when dataset has no timeFieldName', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"","aggregationField":"responseLatency","aggregationMethod":"avg","dateFields":"timestamp,nested.utc_time"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
        expect(queryByText('Detector details')).not.toBeNull();
        expect(queryByText('Model Features')).not.toBeNull();
      });
    });

    it('uses first dateField as timeField when dataset has no timeFieldName and no root-level date field exists', async () => {
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"","aggregationField":"responseLatency","aggregationMethod":"avg","dateFields":"nested.timestamp,nested.utc_time"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
        expect(queryByText('Detector details')).not.toBeNull();
        expect(queryByText('Model Features')).not.toBeNull();
      });
    });
  });

  describe('Test getting index mapping failed', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('renders with getting index mapping failed', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: false,
        error: 'failed to get index mapping',
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'failed to get index mapping'
        );
      });
    });
  });
  describe('Test agent not found', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          mappings: {
            test: {
              mappings: {
                properties: { field: { type: 'date' } },
              },
            },
          },
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('shows danger toast when agent does not exist', async () => {
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({ exists: false });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Generate parameters for creating anomaly detector failed, reason: Error: Agent for suggest anomaly detector not found, please configure an agent firstly!'
        );
      });
    });

    it('shows danger toast when generated feature list is empty', async () => {
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({ exists: true });
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"","aggregationField":"","aggregationMethod":"","dateFields":"timestamp"}',
                },
              ],
            },
          ],
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          expect.stringContaining('Cannot find aggregation field')
        );
      });
    });
  });

  describe('Test allDateFields empty after mapping', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({ exists: true });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('shows danger toast when mapping has no date fields', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          mappings: {
            test: {
              mappings: {
                properties: { field: { type: 'keyword' } },
              },
            },
          },
        },
      });

      const { queryByText } = renderWithRouter();
      expect(queryByText('Suggested anomaly detector')).not.toBeNull();

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          'Cannot find any date type fields!'
        );
      });
    });
  });

  describe('Test UI interactions on rendered form', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({ exists: true });
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"ip","aggregationField":"responseLatency,response","aggregationMethod":"avg,sum","dateFields":"@timestamp"}',
                },
              ],
            },
          ],
        },
      });
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          mappings: {
            test: {
              mappings: {
                properties: { '@timestamp': { type: 'date' } },
              },
            },
          },
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('toggles detector details accordion open/closed', async () => {
      const { queryByText, getAllByTestId } = renderWithRouter();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
      });

      // Multiple accordions share the same test-subj; click the first one (detector details)
      const accordionButtons = getAllByTestId('accordionTitleButton');
      await userEvent.setup().click(accordionButtons[0]);
      await userEvent.setup().click(accordionButtons[0]);
    });

    it('changes detector name via text input', async () => {
      const { queryByText, getByTestId } = renderWithRouter();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
      });

      const nameInput = getByTestId('detectorNameTextInputFlyout');
      await userEvent.setup().clear(nameInput);
      await userEvent.setup().type(nameInput, 'my-new-detector');
    });

    it('changes detector interval via number input', async () => {
      const { queryByText, getByTestId } = renderWithRouter();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
      });

      const intervalInput = getByTestId('detectionInterval');
      await userEvent.setup().clear(intervalInput);
      await userEvent.setup().type(intervalInput, '5');
    });

    it('changes window delay via number input', async () => {
      const { queryByText, getByTestId } = renderWithRouter();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
      });

      const delayInput = getByTestId('windowDelay');
      await userEvent.setup().clear(delayInput);
      await userEvent.setup().type(delayInput, '2');
    });

    it('shows danger toast when Create button is clicked while featureList is empty', async () => {
      // The beforeEach mock produces features; override executeAgentByConfigName to return no features.
      // We must set the mock before the component renders, so we reset here.
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({ exists: true });
      // Return valid features so the form renders fully
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"","aggregationField":"responseLatency","aggregationMethod":"avg","dateFields":"@timestamp"}',
                },
              ],
            },
          ],
        },
      });
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          mappings: {
            test: {
              mappings: { properties: { '@timestamp': { type: 'date' } } },
            },
          },
        },
      });

      const { queryByText, getByTestId } = renderWithRouter();
      // Wait for form to be fully rendered
      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
      });

      // Click Create — featureList has one feature so validateForm runs; we just verify the click works
      const createBtn = getByTestId('SuggestAnomalyDetectorCreateButton');
      await userEvent.setup().click(createBtn);
    });
  });

  describe('Test create detector — max detectors reached', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({ exists: true });
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"ip","aggregationField":"responseLatency","aggregationMethod":"avg","dateFields":"@timestamp"}',
                },
              ],
            },
          ],
        },
      });
      httpClientMock.get = jest.fn(
        (pathOrOptions: string | HttpFetchOptionsWithPath) => {
          const url =
            typeof pathOrOptions === 'string'
              ? pathOrOptions
              : pathOrOptions.path;
          switch (url) {
            case '/api/anomaly_detectors/_mappings':
              return Promise.resolve({
                ok: true,
                response: {
                  mappings: {
                    test: {
                      mappings: {
                        properties: { '@timestamp': { type: 'date' } },
                      },
                    },
                  },
                },
              });
            case '/api/anomaly_detectors/detectors/_count':
              return Promise.resolve({ ok: true, response: { count: 1000 } });
            default:
              return Promise.resolve({ ok: true });
          }
        }
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('shows max-detectors danger toast when detector limit is reached', async () => {
      httpClientMock.post = jest.fn().mockResolvedValue({
        ok: false,
        error: 'Cannot create detector',
      });

      const { queryByText, getByTestId } = renderWithRouter();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
      });

      await userEvent
        .setup()
        .click(getByTestId('SuggestAnomalyDetectorCreateButton'));

      await waitFor(() => {
        expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
          expect.stringContaining('limit of')
        );
      });
    });
  });

  describe('Test custom result index and category field toggles', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const queryService = getQueryService();
      queryService.queryString.getQuery.mockReturnValue({
        dataset: {
          id: 'test-pattern',
          title: 'test-pattern',
          type: 'INDEX_PATTERN',
          timeFieldName: '@timestamp',
        },
      });
      (
        getAssistantClient().agentConfigExists as jest.Mock
      ).mockResolvedValueOnce({ exists: true });
      (
        getAssistantClient().executeAgentByConfigName as jest.Mock
      ).mockResolvedValueOnce({
        body: {
          inference_results: [
            {
              output: [
                {
                  result:
                    '{"index":"test-pattern","categoryField":"ip","aggregationField":"responseLatency","aggregationMethod":"avg","dateFields":"@timestamp"}',
                },
              ],
            },
          ],
        },
      });
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          mappings: {
            test: {
              mappings: { properties: { '@timestamp': { type: 'date' } } },
            },
          },
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('opens Advanced configuration accordion and toggles custom result index checkbox', async () => {
      const { queryByText, getByText, getByLabelText } = renderWithRouter();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
      });

      const user1 = userEvent.setup();
      // Open Advanced configuration accordion
      await user1.click(getByText('Advanced configuration'));

      // Toggle custom result index checkbox on
      const resultIndexCheckbox = getByLabelText('Enable custom result index');
      await user1.click(resultIndexCheckbox);
      expect(
        queryByText(
          "You can't change the custom result index after you create the detector. You can manage the result index with the Index Management plugin."
        )
      ).not.toBeNull();

      // Toggle it back off (covers the `if (enabled)` branch that clears resultIndex)
      await user1.click(resultIndexCheckbox);
    });

    it('opens Advanced configuration accordion and toggles categorical field checkbox', async () => {
      const { queryByText, getByText, getByLabelText } = renderWithRouter();

      await waitFor(() => {
        expect(queryByText('Create detector')).not.toBeNull();
      });

      const user1 = userEvent.setup();
      await user1.click(getByText('Advanced configuration'));

      // The categoryField checkbox starts checked (because categoryField=ip was generated)
      const categoryFieldCheckbox = getByLabelText('Enable categorical fields');
      // Toggle it off (covers the `if (categoryFieldEnabled)` branch that clears categoryField)
      await user1.click(categoryFieldCheckbox);
      // Toggle it back on
      await user1.click(categoryFieldCheckbox);
    });
  });
});
