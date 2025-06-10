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

import { Dispatch, MiddlewareAPI, AnyAction } from 'redux';
import { HttpSetup, APIAction, ThunkAction } from './types';
import { get } from 'lodash';
/*
  This a middleware for Redux. To understand this read : http://redux.js.org/docs/advanced/Middleware.html
*/

const isAPIAction = (
  action: APIAction | Function | AnyAction
): action is APIAction => (action as APIAction).request !== undefined;

//TODO: Find better way to define return type and avoid ANY.

export default function clientMiddleware<State>(client: HttpSetup) {
  return ({ dispatch, getState }: MiddlewareAPI<Dispatch, State>) =>
    (next: Dispatch) =>
    async (action: APIAction | ThunkAction | AnyAction): Promise<any> => {
      if (typeof action === 'function') {
        //@ts-ignore
        return action(dispatch, getState);
      }
      if (isAPIAction(action)) {
        console.log('action', action);
        
        const { request, type, ...rest } = action;
        try {
          console.log('action type', `${type}_REQUEST`);
          console.log('request', request);
          console.log('rest', rest);
          // Network call
          next({ ...rest, type: `${type}_REQUEST` });
          const result = await request(client);
          console.log('result', result);
          //@ts-ignore
          if (get(result, 'ok', true)) {
            next({ ...rest, result, type: `${type}_SUCCESS` });
            return result;
          } else {
            //@ts-ignore
            throw get(result, 'error', '');
          }
        } catch (error) {
          console.log('Processed error in middleware:', error);
          next({ ...rest, error, type: `${type}_FAILURE` });
          throw error;
        }
      } else {
        return next(action);
      }
    };
}
