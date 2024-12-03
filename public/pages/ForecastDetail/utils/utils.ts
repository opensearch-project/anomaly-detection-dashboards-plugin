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

import { Forecaster } from '../../../models/interfaces';
import { FORECASTER_STATE } from '../../../../server/utils/constants';

export const IS_INIT_OVERTIME_FIELD = 'isInitOvertime';
export const INIT_DETAILS_FIELD = 'initDetails';
export const INIT_ERROR_MESSAGE_FIELD = 'initErrorMessage';
export const INIT_ACTION_ITEM_FIELD = 'initActionItem';
export const DEFAULT_ENTITIES_TO_SHOW = 5;

export const getForecasterInitializationInfo = (forecaster: Forecaster) => {

  let result = {
    [IS_INIT_OVERTIME_FIELD]: false,
    [INIT_DETAILS_FIELD]: {},
  };
  if (isForecasterInitOverTime(forecaster)) {
    result[IS_INIT_OVERTIME_FIELD] = true;
    result[INIT_DETAILS_FIELD] = getInitOverTimeDetails(); 
  }
  return result;
};

const isForecasterInitOverTime = (forecaster: Forecaster) => {
  return (
    forecaster &&
    (forecaster.curState === FORECASTER_STATE.AWAITING_DATA_TO_INIT)
  );
};

const getInitOverTimeDetails = () => {
  return {
    [INIT_ERROR_MESSAGE_FIELD]: 'Insufficient data',
    [INIT_ACTION_ITEM_FIELD]: 'Ingest more data and restart the forecast. Or increase the forecast time interval and try again.',
  };
};
