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

import handleActions from '../handleActions';
import { Reducer } from 'redux';

describe('Handle Actions', () => {
  const tempAction = { type: 'TEMP_ACTION' };

  test('Should accept initial State', () => {
    const initialState = { initial: 'state' };
    const reducer = handleActions({}, initialState);
    expect(reducer(undefined, tempAction)).toEqual(initialState);
  });
  describe('Given flat reducer', () => {
    const initialState = { initial: 'state' };
    const mockReducer = {
      FOO: jest.fn().mockReturnValue({ state: 'foo' }),
      BAR: jest.fn().mockReturnValue({ state: 'bar' }),
    };
    let reducer: Reducer;
    beforeEach(() => {
      reducer = handleActions(mockReducer, initialState);
    });

    test('should ignore reducers when no matching type', () => {
      const anotherAction = { type: 'ANOTHER' };
      const newState = reducer(undefined, anotherAction);
      expect(newState).toEqual(initialState);
      expect(mockReducer.FOO).toHaveBeenCalledTimes(0);
      expect(mockReducer.BAR).toHaveBeenCalledTimes(0);
    });
    test('should ignore reducers when no matching type', () => {
      const action = { type: 'FOO' };
      const newState = reducer(undefined, action);
      expect(newState).toEqual({ state: 'foo' });
      expect(mockReducer.FOO).toHaveBeenCalledTimes(1);
      expect(mockReducer.BAR).toHaveBeenCalledTimes(0);
    });
  });

  describe('Works with Nested reducer (Async)', () => {
    const initialState = { initial: 'state' };
    const mockReducer = {
      FOO: {
        REQUEST: jest.fn().mockReturnValue({ requesting: true }),
        SUCCESS: jest
          .fn()
          .mockReturnValue({ requesting: false, requested: true }),
        FAILURE: jest
          .fn()
          .mockReturnValue({ requesting: false, requested: false }),
      },
    };
    let reducer: Reducer;
    beforeEach(() => {
      reducer = handleActions(mockReducer, initialState);
    });

    test('should call nested with matching reducer and matching prefix', () => {
      const action = { type: 'FOO_REQUEST' };
      const state = { test: 'test' };
      const newState = reducer(state, action);
      expect(newState).toEqual({ requesting: true });
      expect(mockReducer.FOO.REQUEST).toHaveBeenCalledTimes(1);
      expect(mockReducer.FOO.REQUEST).toHaveBeenCalledWith(state, action);
      expect(mockReducer.FOO.SUCCESS).toHaveBeenCalledTimes(0);
      expect(mockReducer.FOO.FAILURE).toHaveBeenCalledTimes(0);
    });
  });
});
