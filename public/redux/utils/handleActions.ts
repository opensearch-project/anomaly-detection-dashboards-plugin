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


import { Action, Reducer } from 'redux';

// This is utility to remove boilerplate for Redux.
// Redux requires quite few boilerplate for Reducers, this utility will help to simplify writing reducers.
const isFunction = (func: Object): Boolean => typeof func === 'function';

const makeType = (prefix: string[], type: string): string =>
  prefix.concat(type).join('_');

export interface ReducerMap {
  [key: string]: any;
}

const iterator = (
  reducers: ReducerMap,
  initial = {},
  prefix: string[] = []
): ReducerMap => {
  const reducerTypes = Object.keys(reducers);
  return reducerTypes.reduce((acc, type) => {
    const reducer = reducers[type];
    return isFunction(reducer)
      ? { ...acc, [makeType(prefix, type)]: reducer }
      : iterator(reducer, acc, [makeType(prefix, type)]);
  }, initial);
};

function handleActions<State>(
  reducerMap: ReducerMap,
  initialState: State
): Reducer<State> {
  const flattened = iterator(reducerMap);
  return (state = initialState, action: Action) => {
    const reducer = flattened[action.type];
    return reducer ? reducer(state, action) : state;
  };
}

export default handleActions;
