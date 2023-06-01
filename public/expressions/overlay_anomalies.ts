/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { get, isEmpty } from 'lodash';
import { i18n } from '@osd/i18n';
import { ExpressionFunctionDefinition } from '../../../../src/plugins/expressions/public';
import {
  VisLayerTypes,
  VisLayers,
  ExprVisLayers,
  PluginResource,
} from '../../../../src/plugins/vis_augmenter/public';
import {
  TimeRange,
  calculateBounds,
} from '../../../../src/plugins/data/common';
import {
  getAnomalySummaryQuery,
  parsePureAnomalies,
} from '../pages/utils/anomalyResultUtils';
import { AD_NODE_API } from '../../utils/constants';
import { AnomalyData } from '../models/interfaces';
import { getClient } from '../services';
import {
  PointInTimeEventsVisLayer,
  VisLayerError,
  VisLayerErrorTypes,
} from '../../../../src/plugins/vis_augmenter/public';
import { PLUGIN_NAME } from '../utils/constants';
import {
  CANT_FIND_KEY_WORD,
  DOES_NOT_HAVE_PERMISSIONS_KEY_WORD,
  NO_PERMISSIONS_KEY_WORD,
} from '../../server/utils/helpers';
import {
  DETECTOR_HAS_BEEN_DELETED,
  ORIGIN_PLUGIN_VIS_LAYER,
  OVERLAY_ANOMALIES,
  PLUGIN_EVENT_TYPE,
  START_OR_END_TIME_INVALID_ERROR,
  TYPE_OF_EXPR_VIS_LAYERS,
  VIS_LAYER_PLUGIN_TYPE,
} from './constants';

type Input = ExprVisLayers;
type Output = Promise<ExprVisLayers>;
type Name = typeof OVERLAY_ANOMALIES;

interface Arguments {
  detectorId: string;
}

export type OverlayAnomaliesExpressionFunctionDefinition =
  ExpressionFunctionDefinition<Name, Input, Arguments, Output>;

// This gets all the needed anomalies for the given detector ID and time range
export const getAnomalies = async (
  detectorId: string,
  startTime: number,
  endTime: number
): Promise<AnomalyData[]> => {
  const anomalySummaryQuery = getAnomalySummaryQuery(
    startTime,
    endTime,
    detectorId,
    undefined,
    true
  );

  const anomalySummaryResponse = await getClient().post(
    `..${AD_NODE_API.DETECTOR}/results/_search`,
    {
      body: JSON.stringify(anomalySummaryQuery),
    }
  );

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
      timestamp: anomaly.startTime + (anomaly.endTime - anomaly.startTime) / 2,
      metadata: {},
    };
  });
  return {
    originPlugin: ORIGIN_PLUGIN_VIS_LAYER,
    type: VisLayerTypes.PointInTimeEvents,
    pluginResource: ADPluginResource,
    events: events,
  } as PointInTimeEventsVisLayer;
};

const checkIfPermissionErrors = (error): boolean => {
  return typeof error === 'string'
    ? error.includes(NO_PERMISSIONS_KEY_WORD) ||
        error.includes(DOES_NOT_HAVE_PERMISSIONS_KEY_WORD)
    : get(error, 'message', '').includes(NO_PERMISSIONS_KEY_WORD) ||
        get(error, 'message', '').includes(DOES_NOT_HAVE_PERMISSIONS_KEY_WORD);
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
  } else if (
    typeof error === 'string'
      ? error.includes(DETECTOR_HAS_BEEN_DELETED)
      : get(error, 'message', '').includes(DETECTOR_HAS_BEEN_DELETED)
  ) {
    console.log('inside resource deleted');
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

/*
 * This function defines the Anomaly Detection expression function of type vis_layers.
 * The expression-fn defined takes an argument of detectorId and an array of VisLayers as input,
 * it then returns back the VisLayers array with an additional vislayer composed of anomalies.
 *
 * The purpose of this function is to allow us on the visualization rendering to gather additional
 * overlays from an associated plugin resource such as an anomaly detector in this occasion. The VisLayers will
 * now have anomaly data as one of its VisLayers.
 *
 * To create the new added VisLayer the function uses the detectorId and daterange from the search context
 * to fetch anomalies. Next, the anomalies are mapped into events based on timestamps in order to convert them to a
 * PointInTimeEventsVisLayer.
 *
 * If there are any errors fetching the anomalies the function will return a VisLayerError in the
 * VisLayer detailing the error type.
 */

export const overlayAnomaliesFunction =
  (): OverlayAnomaliesExpressionFunctionDefinition => ({
    name: OVERLAY_ANOMALIES,
    type: TYPE_OF_EXPR_VIS_LAYERS,
    inputTypes: [TYPE_OF_EXPR_VIS_LAYERS],
    help: i18n.translate('data.functions.overlay_anomalies.help', {
      defaultMessage: 'Add an anomaly vis layer',
    }),
    args: {
      detectorId: {
        types: ['string'],
        default: '""',
        help: '',
      },
    },

    async fn(input, args, context): Promise<ExprVisLayers> {
      // Parsing all of the args & input
      const detectorId = get(args, 'detectorId', '');
      const timeRange = get(
        context,
        'searchContext.timeRange',
        ''
      ) as TimeRange;
      const origVisLayers = get(input, 'layers', [] as VisLayers) as VisLayers;
      const parsedTimeRange = timeRange ? calculateBounds(timeRange) : null;
      const startTimeInMillis = parsedTimeRange?.min?.unix()
        ? parsedTimeRange?.min?.unix() * 1000
        : undefined;
      const endTimeInMillis = parsedTimeRange?.max?.unix()
        ? parsedTimeRange?.max?.unix() * 1000
        : undefined;
      var ADPluginResource = {
        type: VIS_LAYER_PLUGIN_TYPE,
        id: detectorId,
        name: '',
        urlPath: `${PLUGIN_NAME}#/detectors/${detectorId}/results`, //details page for detector in AD plugin
      };
      try {
        const detectorResponse = await getDetectorResponse(detectorId);
        if (get(detectorResponse, 'error', '').includes(CANT_FIND_KEY_WORD)) {
          throw new Error('Anomaly Detector - ' + DETECTOR_HAS_BEEN_DELETED);
        } else if (
          get(detectorResponse, 'error', '').includes(
            DOES_NOT_HAVE_PERMISSIONS_KEY_WORD
          )
        ) {
          throw new Error(get(detectorResponse, 'error', ''));
        }
        const detectorName = get(detectorResponse.response, 'name', '');
        if (detectorName === '') {
          throw new Error('Anomaly Detector - Unable to get detector');
        }
        ADPluginResource.name = detectorName;

        if (startTimeInMillis === undefined || endTimeInMillis === undefined) {
          throw new RangeError(START_OR_END_TIME_INVALID_ERROR);
        }
        const anomalies = await getAnomalies(
          detectorId,
          startTimeInMillis,
          endTimeInMillis
        );
        const anomalyLayer = convertAnomaliesToPointInTimeEventsVisLayer(
          anomalies,
          ADPluginResource
        );
        return {
          type: TYPE_OF_EXPR_VIS_LAYERS,
          layers: origVisLayers
            ? origVisLayers.concat(anomalyLayer)
            : ([anomalyLayer] as VisLayers),
        };
      } catch (error) {
        console.error('Anomaly Detector - Unable to get anomalies: ', error);
        const visLayerError = getVisLayerError(error);
        const anomalyErrorLayer = {
          type: VisLayerTypes.PointInTimeEvents,
          originPlugin: PLUGIN_NAME,
          pluginResource: ADPluginResource,
          events: [],
          error: visLayerError,
          pluginEventType: PLUGIN_EVENT_TYPE,
        } as PointInTimeEventsVisLayer;
        return {
          type: TYPE_OF_EXPR_VIS_LAYERS,
          layers: origVisLayers
            ? origVisLayers.concat(anomalyErrorLayer)
            : ([anomalyErrorLayer] as VisLayers),
        };
      }
    },
  });
