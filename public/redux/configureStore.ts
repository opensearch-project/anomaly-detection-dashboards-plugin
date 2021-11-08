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

import { createStore, applyMiddleware, compose } from 'redux';
import clientMiddleware from './middleware/clientMiddleware';
import { HttpSetup } from './middleware/types';
import reducers, { AppState } from './reducers';

function configureStore(httpClient: HttpSetup) {
  const middleWares = [clientMiddleware<AppState>(httpClient)];
  const composeWithReduxDevTools =
    (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = composeWithReduxDevTools(applyMiddleware(...middleWares))(
    createStore
  );
  //@ts-ignore
  return store(reducers);
}

export default configureStore;
