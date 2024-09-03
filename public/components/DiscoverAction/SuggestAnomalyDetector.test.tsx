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
import { fieldFormatsMock } from '../../../../../src/plugins/data/common/field_formats/mocks';
import { IndexPattern } from '../../../../../src/plugins/data/common';
import userEvent from '@testing-library/user-event';
import { HttpFetchOptionsWithPath } from '../../../../../src/core/public';
import { BASE_NODE_API_PATH } from '../../../utils/constants';
import { getQueryService } from '../../services';

export function shouldReadFieldFromDocValues(aggregatable: boolean, opensearchType: string) {
    return (
        aggregatable &&
        !['text', 'geo_shape'].includes(opensearchType) &&
        !opensearchType.startsWith('_')
    );
}

function stubbedSampleFields() {
    return [
        ['bytes', 'long', true, true, { count: 10 }],
        ['response', 'integer', true, true],
        ['responseLatency', 'float', true, true],
        ['@timestamp', 'date', true, true, { count: 30 }],
        ['@tags', 'keyword', true, true],
        ['utc_time', 'date', true, true],
        ['phpmemory', 'integer', true, true],
        ['ip', 'ip', true, true],
        ['geo.src', 'keyword', true, true],
        ['_id', '_id', true, true],
        ['_type', '_type', true, true],
        ['_source', '_source', true, true],
    ].map(function (row) {
        const [
            name,
            opensearchType,
            aggregatable,
            searchable,
            metadata = {},
            subType = undefined,
        ] = row;

        const {
            count = 0,
            script,
            lang = script ? 'expression' : undefined,
            scripted = !!script,
        } = metadata;

        return {
            name,
            opensearchType,
            spec: {
                esTypes: [opensearchType],
                name: name,
            },
            readFromDocValues: shouldReadFieldFromDocValues(aggregatable, opensearchType),
            aggregatable,
            searchable,
            count,
            script,
            lang,
            scripted,
            subType,
        };
    });
}

function createIndexPattern(id: string): IndexPattern {
    const type = 'index-pattern';
    const version = '2';
    const timeFieldName = 'timestamp';
    const fields = stubbedSampleFields();
    const title = id;

    return {
        id,
        type,
        version,
        timeFieldName,
        fields,
        title,
        savedObjectsClient: {} as any,
        fieldFormats: fieldFormatsMock,
        shortDotsEnable: false,
        metaFields: [],
    };
}

const mockedIndexPattern = createIndexPattern('test-pattern');

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
    getIndexPatternService: () => ({
        get: () => (mockedIndexPattern)
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
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: true,
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
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: true,
                generatedParameters: {
                    categoryField: '',
                    aggregationField: '',
                    aggregationMethod: '',
                    dateFields: '',
                },
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
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: true,
                generatedParameters: {
                    categoryField: '',
                    aggregationField: ',',
                    aggregationMethod: ',',
                    dateFields: 'timestamp',
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
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: true,
                generatedParameters: {
                    categoryField: '',
                    aggregationField: 'a,b',
                    aggregationMethod: 'avg',
                    dateFields: 'timestamp',
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
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: true,
                generatedParameters: {
                    categoryField: 'ip',
                    aggregationField: 'responseLatency,response',
                    aggregationMethod: 'avg,sum',
                    dateFields: '@timestamp,utc_time',
                },
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
                    case '/api/anomaly_detectors/_generate_parameters':
                        return Promise.resolve({
                            ok: true,
                            generatedParameters: {
                                categoryField: 'ip',
                                aggregationField: 'responseLatency,response',
                                aggregationMethod: 'avg,sum',
                                dateFields: '@timestamp,utc_time',
                            }
                        });
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

            const { queryByText, getByTestId } = renderWithRouter();
            expect(queryByText('Suggested anomaly detector')).not.toBeNull();
            await waitFor(() => {
                expect(queryByText('Generating parameters...')).toBeNull();
                expect(queryByText('Create detector')).not.toBeNull();
                expect(queryByText('Detector details')).not.toBeNull();
                expect(queryByText('Advanced configuration')).not.toBeNull();
                expect(queryByText('Model Features')).not.toBeNull();
            });

            userEvent.click(getByTestId("GenerateAnomalyDetectorCreateButton"));

            await waitFor(() => {
                expect(httpClientMock.post).toHaveBeenCalledTimes(3);
                expect(httpClientMock.post).toHaveBeenCalledWith(
                    `${BASE_NODE_API_PATH}/_generate_parameters`,
                    {
                        body: JSON.stringify({ index: 'test-pattern' }),
                    }
                );
                expect(getNotifications().toasts.addSuccess).toHaveBeenCalledTimes(1);
            });
        });

        it('Generate parameters failed', async () => {
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: false,
                error: 'Generate parameters failed'
            });

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
                    case '/api/anomaly_detectors/_generate_parameters':
                        return Promise.resolve({
                            ok: true,
                            generatedParameters: {
                                categoryField: 'ip',
                                aggregationField: 'responseLatency,response',
                                aggregationMethod: 'avg,sum',
                                dateFields: '@timestamp,utc_time',
                            }
                        });
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

            userEvent.click(getByTestId("GenerateAnomalyDetectorCreateButton"));

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
                    case '/api/anomaly_detectors/_generate_parameters':
                        return Promise.resolve({
                            ok: true,
                            generatedParameters: {
                                categoryField: 'ip',
                                aggregationField: 'responseLatency,response',
                                aggregationMethod: 'avg,sum',
                                dateFields: '@timestamp,utc_time',
                            }
                        });
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


            const { queryByText, getByTestId } = renderWithRouter();
            expect(queryByText('Suggested anomaly detector')).not.toBeNull();

            await waitFor(() => {
                expect(queryByText('Generating parameters...')).toBeNull();
                expect(queryByText('Create detector')).not.toBeNull();
                expect(queryByText('Detector details')).not.toBeNull();
                expect(queryByText('Advanced configuration')).not.toBeNull();
                expect(queryByText('Model Features')).not.toBeNull();
            });

            userEvent.click(getByTestId("GenerateAnomalyDetectorCreateButton"));

            await waitFor(() => {
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
                    'Start anomaly detector failed'
                );
            });
        });

    });


});
