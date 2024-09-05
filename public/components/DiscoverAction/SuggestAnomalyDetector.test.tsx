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
import { getAssistantClient, getQueryService } from '../../services';

const notifications = {
    toasts: {
        addDanger: jest.fn().mockName('addDanger'),
        addSuccess: jest.fn().mockName('addSuccess'),
    }
};

const getNotifications = () => {
    return notifications;
}

jest.mock('../../services', () => ({
    ...jest.requireActual('../../services'),
    getNotifications: getNotifications,
    getQueryService: jest.fn().mockReturnValue({
        queryString: {
            getQuery: jest.fn(),
        },
    }),
    getAssistantClient: jest.fn().mockReturnValue({
        executeAgentByName: jest.fn(),
    })
}));

const renderWithRouter = () => ({
    ...render(
        <Provider store={configureStore(httpClientMock)}>
            <Router>
                <Switch>
                    <Route
                        render={(props: RouteComponentProps) => (
                            <CoreServicesContext.Provider value={coreServicesMock}>
                                <SuggestAnomalyDetector
                                    closeFlyout={jest.fn()}
                                />
                            </CoreServicesContext.Provider>
                        )}
                    />
                </Switch>
            </Router>
        </Provider>
    ),
});

describe('GenerateAnomalyDetector spec', () => {
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
                    type: 'INDEX'
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
                    type: 'INDEX_PATTERN'
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

        });

        it('renders with empty generated parameters', async () => {
            (getAssistantClient().executeAgentByName as jest.Mock).mockResolvedValueOnce({
                body: {
                    inference_results: [
                        {
                            output: [
                                { result: '' }
                            ]
                        }
                    ]
                }
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
            (getAssistantClient().executeAgentByName as jest.Mock).mockResolvedValueOnce({
                body: {
                    inference_results: [
                        {
                            output: [
                                { result: "{\"index\":\"opensearch_dashboards_sample_data_logs\",\"categoryField\":\"ip\",\"aggregationField\":\"\",\"aggregationMethod\":\"\",\"dateFields\":\"utc_time,timestamp\"}" }
                            ]
                        }
                    ]
                }
            });

            const { queryByText } = renderWithRouter();
            expect(queryByText('Suggested anomaly detector')).not.toBeNull();

            await waitFor(() => {
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
                    'Generate parameters for creating anomaly detector failed, reason: Error: Cannot find aggregation field, aggregation method or data fields!'
                );
            });
        });

        it('renders with empty aggregation field or empty aggregation method', async () => {
            (getAssistantClient().executeAgentByName as jest.Mock).mockResolvedValueOnce({
                body: {
                    inference_results: [
                        {
                            output: [
                                { result: "{\"index\":\"opensearch_dashboards_sample_data_logs\",\"categoryField\":\"ip\",\"aggregationField\":\",\",\"aggregationMethod\":\",\",\"dateFields\":\"utc_time,timestamp\"}" }
                            ]
                        }
                    ]
                }
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
            (getAssistantClient().executeAgentByName as jest.Mock).mockResolvedValueOnce({
                body: {
                    inference_results: [
                        {
                            output: [
                                { result: "{\"index\":\"opensearch_dashboards_sample_data_logs\",\"categoryField\":\"ip\",\"aggregationField\":\"a,b\",\"aggregationMethod\":\"avg\",\"dateFields\":\"utc_time,timestamp\"}" }
                            ]
                        }
                    ]
                }
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
            (getAssistantClient().executeAgentByName as jest.Mock).mockResolvedValueOnce({
                body: {
                    inference_results: [
                        {
                            output: [
                                { result: "{\"index\":\"opensearch_dashboards_sample_data_logs\",\"categoryField\":\"ip\",\"aggregationField\":\"responseLatency,response\",\"aggregationMethod\":\"avg,sum\",\"dateFields\":\"utc_time,timestamp\"}" }
                            ]
                        }
                    ]
                }
            });

            const { queryByText } = renderWithRouter();
            expect(queryByText('Suggested anomaly detector')).not.toBeNull();

            await waitFor(() => {
                expect(queryByText('Create detector')).not.toBeNull();
                expect(queryByText('Detector details')).not.toBeNull();
                expect(queryByText('Advanced configuration')).not.toBeNull();
                expect(queryByText('Model Features')).not.toBeNull();
            });
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
        });

        it('All API calls execute successfully', async () => {
            httpClientMock.post = jest.fn((pathOrOptions: string | HttpFetchOptionsWithPath) => {
                const url = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
                switch (url) {
                    case '/api/anomaly_detectors/detectors':
                        return Promise.resolve({
                            ok: true,
                            response: {
                                id: 'test'
                            }
                        });
                    default:
                        return Promise.resolve({
                            ok: true
                        });
                }
            });
            (getAssistantClient().executeAgentByName as jest.Mock).mockResolvedValueOnce({
                body: {
                    inference_results: [
                        {
                            output: [
                                { result: "{\"index\":\"test-pattern\",\"categoryField\":\"ip\",\"aggregationField\":\"responseLatency,response\",\"aggregationMethod\":\"avg,sum\",\"dateFields\":\"utc_time,timestamp\"}" }
                            ]
                        }
                    ]
                }
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

            userEvent.click(getByTestId("SuggestAnomalyDetectorCreateButton"));

            await waitFor(() => {
                expect(httpClientMock.post).toHaveBeenCalledTimes(2);
                expect(getNotifications().toasts.addSuccess).toHaveBeenCalledTimes(1);
            });
        });

        it('Generate parameters failed', async () => {
            (getAssistantClient().executeAgentByName as jest.Mock).mockRejectedValueOnce('Generate parameters failed');

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
            httpClientMock.post = jest.fn((pathOrOptions: string | HttpFetchOptionsWithPath) => {
                const url = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
                switch (url) {
                    case '/api/anomaly_detectors/detectors':
                        return Promise.resolve({
                            ok: false,
                            error: 'Create anomaly detector failed'
                        });
                    default:
                        return Promise.resolve({
                            ok: true
                        });
                }
            });
            (getAssistantClient().executeAgentByName as jest.Mock).mockResolvedValueOnce({
                body: {
                    inference_results: [
                        {
                            output: [
                                { result: "{\"index\":\"test-pattern\",\"categoryField\":\"ip\",\"aggregationField\":\"responseLatency,response\",\"aggregationMethod\":\"avg,sum\",\"dateFields\":\"utc_time,timestamp\"}" }
                            ]
                        }
                    ]
                }
            });

            httpClientMock.get = jest.fn().mockResolvedValue({
                ok: true,
                response: {
                    count: 0
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

            userEvent.click(getByTestId("SuggestAnomalyDetectorCreateButton"));

            await waitFor(() => {
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
                    'Create anomaly detector failed'
                );
            });
        });


        it('Start anomaly detector failed', async () => {
            httpClientMock.post = jest.fn((pathOrOptions: string | HttpFetchOptionsWithPath) => {
                const url = typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;
                switch (url) {
                    case '/api/anomaly_detectors/detectors':
                        return Promise.resolve({
                            ok: true,
                            response: {
                                id: 'test'
                            }
                        });
                    case '/api/anomaly_detectors/detectors/test/start':
                        return Promise.resolve({
                            ok: false,
                            error: 'Start anomaly detector failed'
                        });
                    default:
                        return Promise.resolve({
                            ok: true
                        });
                }
            });

            httpClientMock.get = jest.fn().mockResolvedValue({
                ok: true,
                response: {
                    count: 0
                },
            });

            (getAssistantClient().executeAgentByName as jest.Mock).mockResolvedValueOnce({
                body: {
                    inference_results: [
                        {
                            output: [
                                { result: "{\"index\":\"test-pattern\",\"categoryField\":\"ip\",\"aggregationField\":\"responseLatency,response\",\"aggregationMethod\":\"avg,sum\",\"dateFields\":\"utc_time,timestamp\"}" }
                            ]
                        }
                    ]
                }
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

            userEvent.click(getByTestId("SuggestAnomalyDetectorCreateButton"));

            await waitFor(() => {
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
                    'Start anomaly detector failed'
                );
            });
        });
    });


});
