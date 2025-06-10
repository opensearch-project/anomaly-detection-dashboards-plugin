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

import {
  getURLQueryParams,
  getForecasterStateOptions,
  getActionsForForecaster,
  getMonitorsForAction,
} from '../helpers';
import { ForecasterListItem, Monitor } from '../../../../models/interfaces';
import {
  FORECASTER_STATE,
  FORECASTER_STATE_DISPLAY,
} from '../../../../../server/utils/constants';
import { FORECASTER_ACTION } from '../constants';

describe('ForecastersList helpers spec', () => {
  describe('getURLQueryParams', () => {
    test('should return dataSourceId if present in query', () => {
      const location = { search: '?dataSourceId=test-source' };
      const queryParams = getURLQueryParams(location);
      expect(queryParams).toEqual({ dataSourceId: 'test-source' });
    });

    test('should return undefined for dataSourceId if not present', () => {
      const location = { search: '?otherParam=value' };
      const queryParams = getURLQueryParams(location);
      expect(queryParams).toEqual({ dataSourceId: undefined });
    });

    test('should return undefined for dataSourceId for empty search string', () => {
      const location = { search: '' };
      const queryParams = getURLQueryParams(location);
      expect(queryParams).toEqual({ dataSourceId: undefined });
    });
  });

  describe('getForecasterStateOptions', () => {
    test('should return unique forecaster state display options', () => {
      const options = getForecasterStateOptions();
      const uniqueDisplayStates = [
        ...new Set(Object.values(FORECASTER_STATE_DISPLAY)),
      ];
      expect(options.length).toBe(uniqueDisplayStates.length);
      expect(options[0].label).toBe(uniqueDisplayStates[0]);
    });
  });

  describe('getActionsForForecaster', () => {
    test('should return start/test/delete actions for inactive forecasters', () => {
      const forecaster = {
        curState: FORECASTER_STATE.INACTIVE_STOPPED,
      } as ForecasterListItem;
      const actions = getActionsForForecaster(forecaster);
      expect(actions).toContain(FORECASTER_ACTION.START);
      expect(actions).toContain(FORECASTER_ACTION.TEST);
      expect(actions).toContain(FORECASTER_ACTION.DELETE);
      expect(actions.length).toBe(3);
    });

    test('should return cancel/delete actions for initializing forecasters', () => {
      const forecaster = {
        curState: FORECASTER_STATE.INITIALIZING_FORECAST,
      } as ForecasterListItem;
      const actions = getActionsForForecaster(forecaster);
      expect(actions).toContain(FORECASTER_ACTION.CANCEL);
      expect(actions).toContain(FORECASTER_ACTION.DELETE);
      expect(actions.length).toBe(2);
    });

    test('should return stop/delete actions for running forecasters', () => {
      const forecaster = {
        curState: FORECASTER_STATE.RUNNING,
      } as ForecasterListItem;
      const actions = getActionsForForecaster(forecaster);
      expect(actions).toContain(FORECASTER_ACTION.STOP);
      expect(actions).toContain(FORECASTER_ACTION.DELETE);
      expect(actions.length).toBe(2);
    });

    test('should return empty array for unknown states', () => {
      const forecaster = { curState: 'UNKNOWN_STATE' } as ForecasterListItem;
      const actions = getActionsForForecaster(forecaster);
      expect(actions).toEqual([]);
    });
  });

  describe('getMonitorsForAction', () => {
    const testForecasters = [
      { id: 'forecasterId1', name: 'test-forecaster-1' },
      { id: 'forecasterId2', name: 'test-forecaster-2' },
    ] as ForecasterListItem[];

    test('should return empty if no related monitors', () => {
      const testMonitors: { [key: string]: Monitor } = {};
      expect(getMonitorsForAction(testForecasters, testMonitors)).toEqual({});
    });

    test('should return related monitors', () => {
      const testMonitors: { [key: string]: any } = {
        forecasterId1: [{ id: 'monitorId1', name: 'test-monitor-1' }],
        forecasterId2: [],
      };
      expect(getMonitorsForAction(testForecasters, testMonitors)).toEqual({
        forecasterId1: { id: 'monitorId1', name: 'test-monitor-1' },
      });
    });
  });
});
