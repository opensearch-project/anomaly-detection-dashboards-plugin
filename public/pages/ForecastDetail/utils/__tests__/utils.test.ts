/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getForecasterInitializationInfo,
  IS_INIT_OVERTIME_FIELD,
  INIT_DETAILS_FIELD,
  INIT_ERROR_MESSAGE_FIELD,
  INIT_ACTION_ITEM_FIELD,
} from '../utils';
import { FORECASTER_STATE } from '../../../../../server/utils/constants';
import { Forecaster } from '../../../../models/interfaces';

describe('getForecasterInitializationInfo', () => {
  test('returns overtime=true when state is AWAITING_DATA_TO_INIT', () => {
    const forecaster = {
      curState: FORECASTER_STATE.AWAITING_DATA_TO_INIT,
    } as Forecaster;
    const result = getForecasterInitializationInfo(forecaster);
    expect(result[IS_INIT_OVERTIME_FIELD]).toBe(true);
    expect(result[INIT_DETAILS_FIELD]).toEqual({
      [INIT_ERROR_MESSAGE_FIELD]: 'Insufficient data',
      [INIT_ACTION_ITEM_FIELD]: expect.stringContaining('Ingest more data'),
    });
  });

  test('returns overtime=false when state is RUNNING', () => {
    const forecaster = {
      curState: FORECASTER_STATE.RUNNING,
    } as Forecaster;
    const result = getForecasterInitializationInfo(forecaster);
    expect(result[IS_INIT_OVERTIME_FIELD]).toBe(false);
    expect(result[INIT_DETAILS_FIELD]).toEqual({});
  });

  test('returns overtime=false when state is INACTIVE_STOPPED', () => {
    const forecaster = {
      curState: FORECASTER_STATE.INACTIVE_STOPPED,
    } as Forecaster;
    const result = getForecasterInitializationInfo(forecaster);
    expect(result[IS_INIT_OVERTIME_FIELD]).toBe(false);
  });

  test('returns overtime=false for undefined forecaster', () => {
    const result = getForecasterInitializationInfo(undefined as any);
    expect(result[IS_INIT_OVERTIME_FIELD]).toBe(false);
    expect(result[INIT_DETAILS_FIELD]).toEqual({});
  });
});
