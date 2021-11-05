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


import configureStore, { MockStore } from 'redux-mock-store';
import clientMiddleware from '../middleware/clientMiddleware';
import httpClientMock from '../../../test/mocks/httpClientMock';
import { AppState } from '../reducers';
export const initialState = {
  ad: {
    requesting: false,
    detectors: {},
    totalDetectors: 0,
    errorMessage: '',
    detectorList: {},
  },
  opensearch: {
    indices: [],
    aliases: [],
    dataTypes: {},
    requesting: false,
    searchResult: {},
    errorMessage: '',
  },
  anomalies: {
    requesting: false,
    anomaliesResult: {
      anomalies: [],
      featureData: {},
    },
    errorMessage: '',
  },
  anomalyResults: {
    requesting: false,
    total: 0,
    anomalies: [],
    errorMessage: '',
  },
};

export const mockedStore = (mockState = initialState): MockStore<AppState> => {
  const middlewares = [clientMiddleware(httpClientMock)];
  const mockStore = configureStore<AppState>(middlewares);
  const store = mockStore(mockState);
  return store;
};
