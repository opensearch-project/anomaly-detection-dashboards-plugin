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

import queryString from 'query-string';
import { get, } from 'lodash';
import { GetForecastersQueryParams } from '../../../../server/models/types';
import { FORECASTER_STATE, FORECASTER_STATE_DISPLAY } from '../../../../server/utils/constants';
import { Monitor } from '../../../models/interfaces';
import { ForecasterListItem } from '../../../models/interfaces';
import { FORECASTER_ACTION } from '../utils/constants';

/**
 * Parses URL query parameters from the location object's search string.
 * Currently, this function specifically looks for the 'dataSourceId' parameter.
 * It uses the 'query-string' library to parse the raw search string (e.g., "?dataSourceId=xyz")
 * into an object.
 *
 * Example:
 * If location.search is "?dataSourceId=abc&otherParam=123", this function will return
 * { dataSourceId: 'abc' }.
 * If location.search is "?someOtherParam=456" or empty, it will return
 * { dataSourceId: undefined }.
 *
 * @param location - The location object, typically provided by a router (like react-router),
 *                   containing the current URL parts. Only the 'search' property is used.
 * @param location.search - The query string part of the URL (e.g., "?param1=value1&param2=value2").
 * @returns An object conforming to GetForecastersQueryParams, containing the extracted
 *          'dataSourceId' if present, otherwise 'dataSourceId' will be undefined.
 */
export const getURLQueryParams = (location: {
  search: string;
}): GetForecastersQueryParams => {
  const {
    dataSourceId,
  } = queryString.parse(location.search) as { [key: string]: string };
  return {
    // @ts-ignore
    dataSourceId: dataSourceId === undefined ? undefined : dataSourceId,
  };
};

export const getForecasterStateOptions = () => {
  // Get unique display values from the enum
  const uniqueDisplayStates = [
    ...new Set(Object.values(FORECASTER_STATE_DISPLAY)),
  ];
  return uniqueDisplayStates.map((displayState) => ({
    label: displayState,
    text: displayState, // Using display state for text as well
  }));
};

export const getActionsForForecaster = (
  forecaster: ForecasterListItem
) => {
  switch (forecaster.curState) {
    case FORECASTER_STATE.INACTIVE_NOT_STARTED:
    case FORECASTER_STATE.INACTIVE_STOPPED:
    case FORECASTER_STATE.TEST_COMPLETE:
    case FORECASTER_STATE.FORECAST_FAILURE:
    case FORECASTER_STATE.INIT_ERROR:
    case FORECASTER_STATE.INIT_TEST_FAILED: {
      return [
        FORECASTER_ACTION.TEST,
        FORECASTER_ACTION.START,
        FORECASTER_ACTION.DELETE
      ]
    }
    case FORECASTER_STATE.AWAITING_DATA_TO_INIT:
    case FORECASTER_STATE.AWAITING_DATA_TO_RESTART:
    case FORECASTER_STATE.INIT_TEST:
    case FORECASTER_STATE.INITIALIZING_FORECAST: {
      return [
        FORECASTER_ACTION.CANCEL,
        FORECASTER_ACTION.DELETE
      ];
    }
    case FORECASTER_STATE.RUNNING: {
      return [
        FORECASTER_ACTION.STOP,
        FORECASTER_ACTION.DELETE
      ];
    }
    default:
      return [];
  }
};

export const getMonitorsForAction = (
  forecastersForAction: ForecasterListItem[],
  monitors: { [key: string]: Monitor }
) => {
  let monitorsForAction = {} as { [key: string]: Monitor };
  forecastersForAction.forEach((forecaster) => {
    const relatedMonitor = get(monitors, `${forecaster.id}.0`);
    if (relatedMonitor) {
      monitorsForAction[`${forecaster.id}`] = relatedMonitor;
    }
  });
  return monitorsForAction;
};
