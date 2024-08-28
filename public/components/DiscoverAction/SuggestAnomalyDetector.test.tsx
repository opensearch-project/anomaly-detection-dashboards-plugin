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
import GenerateAnomalyDetector from './SuggestAnomalyDetector';
import { DiscoverActionContext } from '../../../../../src/plugins/data_explorer/public';
import { fieldFormatsMock } from '../../../../../src/plugins/data/common/field_formats/mocks';
import { IndexPattern } from '../../../../../src/plugins/data/common';
import userEvent from '@testing-library/user-event';
import { HttpFetchOptionsWithPath } from '../../../../../src/core/public';
import { BASE_NODE_API_PATH } from '../../../utils/constants';

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
}));

const renderWithRouter = (context: DiscoverActionContext) => ({
    ...render(
        <Provider store={configureStore(httpClientMock)}>
            <Router>
                <Switch>
                    <Route
                        render={(props: RouteComponentProps) => (
                            <CoreServicesContext.Provider value={coreServicesMock}>
                                <GenerateAnomalyDetector
                                    context={context}
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

const expectedAnomalyDetector = {
    name: "test-pattern_anomaly_detector",
    description: "Created based on the OpenSearch Assistant",
    indices: ["test-pattern"],
    filterQuery: {
        match_all: {}
    },
    uiMetadata: {
        features: {
            feature_responseLatency: {
                featureType: "simple_aggs",
                aggregationBy: "avg",
                aggregationOf: "responseLatency"
            },
            feature_response: {
                featureType: "simple_aggs",
                aggregationBy: "sum",
                aggregationOf: "response"
            }
        },
        filters: []
    },
    featureAttributes: [
        {
            featureName: "feature_responseLatency",
            featureEnabled: true,
            importance: 1,
            aggregationQuery: {
                feature_response_latency: {
                    avg: {
                        field: "responseLatency"
                    }
                }
            }
        },
        {
            featureName: "feature_response",
            featureEnabled: true,
            importance: 1,
            aggregationQuery: {
                feature_response: {
                    sum: {
                        field: "response"
                    }
                }
            }
        }
    ],
    timeField: "timestamp",
    detectionInterval: {
        period: {
            interval: 10,
            unit: "Minutes"
        }
    },
    windowDelay: {
        period: {
            interval: 1,
            unit: "Minutes"
        }
    },
    shingleSize: 8,
    categoryField: ["ip"]
};

describe('GenerateAnomalyDetector spec', () => {
    describe('Renders loading component', () => {
        it('renders empty component', async () => {
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: true,
                generatedParameters: {
                    categoryField: '',
                    aggregationField: '',
                    aggregationMethod: '',
                    dateFields: '',
                },
            });

            const context = {
                indexPattern: createIndexPattern(''),
            };
            const { queryByText } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).toBeNull();

            await waitFor(() => {
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledTimes(1);
                expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
                    'Cannot extract index pattern from the context'
                );
            });
        });

        it('renders with empty generated parameters', async () => {
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: true,
            });

            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();

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

            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();

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

            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();

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

            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();

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

            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();

            await waitFor(() => {
                expect(queryByText('Create detector')).not.toBeNull();
                expect(queryByText('Detector details')).not.toBeNull();
                expect(queryByText('Advanced configuration')).not.toBeNull();
                expect(queryByText('Model Features')).not.toBeNull();
            });
        });

    });


    describe('Test API calls', () => {
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

            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText, getByTestId } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();
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
                expect(httpClientMock.post).toHaveBeenCalledWith(
                    `${BASE_NODE_API_PATH}/detectors`,
                    {
                        body: JSON.stringify(expectedAnomalyDetector),
                    }
                );
                expect(httpClientMock.post).toHaveBeenCalledWith(
                    `${BASE_NODE_API_PATH}/detectors/test/start`
                );
                expect(getNotifications().toasts.addSuccess).toHaveBeenCalledTimes(1);
            });
        });

        it('Generate parameters failed', async () => {
            httpClientMock.post = jest.fn().mockResolvedValue({
                ok: false,
                error: 'Generate parameters failed'
            });

            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();
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


            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText, getByTestId } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();

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


            const context = {
                indexPattern: createIndexPattern('test-pattern'),
            }
            const { queryByText, getByTestId } = renderWithRouter(context);
            expect(queryByText('Suggest anomaly detector')).not.toBeNull();

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
