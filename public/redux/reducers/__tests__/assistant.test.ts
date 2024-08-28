/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { MockStore } from 'redux-mock-store';
import httpMockedClient from '../../../../test/mocks/httpClientMock';
import { BASE_NODE_API_PATH } from '../../../../utils/constants';
import { mockedStore } from '../../utils/testUtils';
import reducer, { generateParameters, initialState } from '../assistant';

describe('assistant reducer actions', () => {
    let store: MockStore;
    beforeEach(() => {
        store = mockedStore();
    });

    describe('generate parameters', () => {
        test('should invoke [REQUEST, SUCCESS]', async () => {
            const indexPattern = 'test-index-pattern';
            httpMockedClient.post = jest.fn().mockResolvedValue({
                ok: true,
                generatedParameters: {
                    categoryField: 'ip',
                    aggregationField: 'responseLatency,response',
                    aggregationMethod: 'avg,sum',
                    dateFields: '@timestamp,utc_time',
                },
            });
            await store.dispatch(generateParameters(indexPattern));
            const actions = store.getActions();
            expect(actions[0].type).toBe('assistant/GENERATE_PARAMETERS_REQUEST');
            expect(reducer(initialState, actions[0])).toEqual({
                ...initialState,
                requesting: true,
                errorMessage: '',
            });
            expect(actions[1].type).toBe('assistant/GENERATE_PARAMETERS_SUCCESS');
            expect(reducer(initialState, actions[1])).toEqual({
                ...initialState,
                requesting: false,
            });
            expect(httpMockedClient.post).toHaveBeenCalledWith(
                `${BASE_NODE_API_PATH}/_generate_parameters`,
                {
                    body: JSON.stringify({ index: indexPattern }),
                }
            );
        });

        test('should invoke [REQUEST, FAILURE]', async () => {
            const indexPattern = 'test-index-pattern';
            httpMockedClient.post = jest.fn().mockResolvedValue({
                ok: false,
                error: 'generate parameters failed'
            });
            try {
                await store.dispatch(generateParameters(indexPattern));
            } catch (e) {
                const actions = store.getActions();
                expect(actions[0].type).toBe('assistant/GENERATE_PARAMETERS_REQUEST');
                expect(reducer(initialState, actions[0])).toEqual({
                    ...initialState,
                    requesting: true,
                    errorMessage: '',
                });
                expect(actions[1].type).toBe('assistant/GENERATE_PARAMETERS_FAILURE');
                expect(reducer(initialState, actions[1])).toEqual({
                    ...initialState,
                    requesting: false,
                    errorMessage: 'generate parameters failed',
                });
                expect(httpMockedClient.post).toHaveBeenCalledWith(
                    `${BASE_NODE_API_PATH}/_generate_parameters`,
                    {
                        body: JSON.stringify({ index: indexPattern }),
                    }
                );
            }
        });
    });

});
