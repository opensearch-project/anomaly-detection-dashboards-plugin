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

import { APIAction, APIResponseAction, HttpSetup } from '../middleware/types';
import handleActions from '../utils/handleActions';
import { ALERTING_NODE_API } from '../../../utils/constants';
import { Monitor } from '../../../server/models/types';
import { get } from 'lodash';

const SEARCH_MONITORS = 'alerting/SEARCH_MONITORS';
const SEARCH_ALERTS = 'alerting/SEARCH_ALERTS';

export interface Monitors {
  requesting: boolean;
  totalMonitors: number;
  totalAdMonitors: number;
  monitors: { [key: string]: Monitor };
  errorMessage: string;
}

export const initialDetectorsState: Monitors = {
  requesting: false,
  errorMessage: '',
  totalMonitors: 0,
  totalAdMonitors: 0,
  monitors: {},
};

const MONITOR_DETECTOR_ID_PATH =
  'inputs.0.search.query.query.bool.filter.1.term.detector_id.value';

const reducer = handleActions<Monitors>(
  {
    [SEARCH_MONITORS]: {
      REQUEST: (state: Monitors): Monitors => ({
        ...state,
        requesting: true,
        errorMessage: '',
      }),
      SUCCESS: (state: Monitors, action: APIResponseAction): Monitors => {
        let totalAdMonitors = 0;
        const monitors = get(
          action,
          'result.response.monitors',
          []
          // @ts-ignore
        ).reduce((map, obj) => {
          const detectorId = get(obj, MONITOR_DETECTOR_ID_PATH);
          if (detectorId) {
            if (!map[detectorId]) {
              map[detectorId] = [];
            }
            totalAdMonitors++;
            map[detectorId].push(obj);
          }
          return map;
        }, {});
        return {
          ...state,
          requesting: false,
          totalMonitors: get(action, 'result.response.totalMonitors', 0),
          totalAdMonitors: totalAdMonitors,
          monitors: monitors,
        };
      },
      FAILURE: (state: Monitors, action: APIResponseAction): Monitors => ({
        ...state,
        requesting: false,
        errorMessage: action.error,
      }),
    },

    //TODO: add requesting and errorMessage
    [SEARCH_ALERTS]: {
      REQUEST: (state: Monitors): Monitors => ({
        ...state,
      }),
      SUCCESS: (state: Monitors, action: APIResponseAction): Monitors => ({
        ...state,
      }),
      FAILURE: (state: Monitors, action: APIResponseAction): Monitors => ({
        ...state,
      }),
    },
  },
  initialDetectorsState
);

export const searchMonitors = ( dataSourceId = ''): APIAction => {
  const baseUrl = `..${ALERTING_NODE_API._SEARCH}`;
  const url = dataSourceId ? `${baseUrl}/${dataSourceId}` : baseUrl;
  
  return {
    type: SEARCH_MONITORS,
    request: (client: HttpSetup) => client.post(url),
  };
};

export const searchAlerts = (
  monitorId: string,
  startTime: number,
  endTime: number
): APIAction => ({
  type: SEARCH_ALERTS,
  request: (client: HttpSetup) =>
    client.get(`..${ALERTING_NODE_API.ALERTS}`, {
      query: {
        monitorId: monitorId,
        startTime: startTime,
        endTime: endTime,
      },
    }),
});

export default reducer;
