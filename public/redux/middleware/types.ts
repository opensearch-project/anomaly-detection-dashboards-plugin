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


import { HttpSetup, HttpResponse } from '../../../../../src/core/public';
import { Action, Dispatch } from 'redux';
import { AppState } from '../reducers';

interface APIAction extends Action {
  // NOTE: there is no HttpPromise equivalent in core, using TypeScript's default Promise. Will need to confirm this still works as expected
  request: (client: HttpSetup) => Promise<HttpResponse<any>>;
  [key: string]: any;
}

interface APIResponseAction extends Action {
  result: any;
  [key: string]: any;
}

interface APIErrorAction extends Action {
  error: any;
  [key: string]: any;
}

type ThunkAction<State = AppState> = (
  dispatch: Dispatch,
  getState: () => State
) => void;

export {
  HttpSetup,
  HttpResponse,
  APIAction,
  APIResponseAction,
  APIErrorAction,
  ThunkAction,
};
