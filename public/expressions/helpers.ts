/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getAnomalySummaryQuery,
  parsePureAnomalies,
} from '../pages/utils/anomalyResultUtils';
import { AD_NODE_API } from '../../utils/constants';
import { AnomalyData } from '../models/interfaces';
import { getClient } from '../services';
import {
  PluginResource,
  PointInTimeEventsVisLayer,
  VisLayerError,
  VisLayerErrorTypes,
  VisLayerTypes,
} from '../../../../src/plugins/vis_augmenter/public';
import {
  DETECTOR_HAS_BEEN_DELETED,
  ORIGIN_PLUGIN_VIS_LAYER,
  PLUGIN_EVENT_TYPE,
} from './constants';
import {
  DOES_NOT_HAVE_PERMISSIONS_KEY_WORD,
  NO_PERMISSIONS_KEY_WORD,
} from '../../server/utils/helpers';
import { get } from 'lodash';

// This gets all the needed anomalies for the given detector ID and time range
export const getAnomalies = async (
  detectorId: string,
  startTime: number,
  endTime: number,
  resultIndex: string
): Promise<AnomalyData[]> => {
  const anomalySummaryQuery = getAnomalySummaryQuery(
    startTime,
    endTime,
    detectorId,
    undefined,
    false
  );
  let anomalySummaryResponse;
  if (resultIndex === '') {
    anomalySummaryResponse = await getClient().post(
      `..${AD_NODE_API.DETECTOR}/results/_search`,
      {
        body: JSON.stringify(anomalySummaryQuery),
      }
    );
  } else {
    anomalySummaryResponse = await getClient().post(
      `..${AD_NODE_API.DETECTOR}/results/_search/${resultIndex}/true`,
      {
        body: JSON.stringify(anomalySummaryQuery),
      }
    );
  }

  return parsePureAnomalies(anomalySummaryResponse);
};

export const getDetectorResponse = async (detectorId: string) => {
  const resp = await getClient().get(`..${AD_NODE_API.DETECTOR}/${detectorId}`);
  return resp;
};

// This takes anomalies and returns them as vis layer of type PointInTimeEvents
export const convertAnomaliesToPointInTimeEventsVisLayer = (
  anomalies: AnomalyData[],
  ADPluginResource: PluginResource
): PointInTimeEventsVisLayer => {
  const events = anomalies.map((anomaly: AnomalyData) => {
    return {
      timestamp: anomaly.startTime,
      metadata: {},
    };
  });
  return {
    originPlugin: ORIGIN_PLUGIN_VIS_LAYER,
    type: VisLayerTypes.PointInTimeEvents,
    pluginResource: ADPluginResource,
    events: events,
    pluginEventType: PLUGIN_EVENT_TYPE,
  } as PointInTimeEventsVisLayer;
};

const checkIfPermissionErrors = (error): boolean => {
  return typeof error === 'string'
    ? error.includes(NO_PERMISSIONS_KEY_WORD) ||
        error.includes(DOES_NOT_HAVE_PERMISSIONS_KEY_WORD)
    : get(error, 'message', '').includes(NO_PERMISSIONS_KEY_WORD) ||
        get(error, 'message', '').includes(DOES_NOT_HAVE_PERMISSIONS_KEY_WORD);
};

const checkIfDeletionErrors = (error): boolean => {
  return typeof error === 'string'
    ? error.includes(DETECTOR_HAS_BEEN_DELETED)
    : get(error, 'message', '').includes(DETECTOR_HAS_BEEN_DELETED);
};

//Helps convert any possible errors into either permission, deletion or fetch related failures
export const getVisLayerError = (error): VisLayerError => {
  let visLayerError: VisLayerError = {} as VisLayerError;
  if (checkIfPermissionErrors(error)) {
    visLayerError = {
      type: VisLayerErrorTypes.PERMISSIONS_FAILURE,
      message:
        error === 'string'
          ? error
          : error instanceof Error
          ? get(error, 'message', '')
          : '',
    };
  } else if (checkIfDeletionErrors(error)) {
    visLayerError = {
      type: VisLayerErrorTypes.RESOURCE_DELETED,
      message:
        error === 'string'
          ? error
          : error instanceof Error
          ? get(error, 'message', '')
          : '',
    };
  } else {
    visLayerError = {
      type: VisLayerErrorTypes.FETCH_FAILURE,
      message:
        error === 'string'
          ? error
          : error instanceof Error
          ? get(error, 'message', '')
          : '',
    };
  }
  return visLayerError;
};
