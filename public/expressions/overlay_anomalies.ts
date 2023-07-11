/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { get } from 'lodash';
import { i18n } from '@osd/i18n';
import { ExpressionFunctionDefinition } from '../../../../src/plugins/expressions/public';
import {
  VisLayerTypes,
  VisLayers,
  ExprVisLayers,
} from '../../../../src/plugins/vis_augmenter/public';
import {
  TimeRange,
  calculateBounds,
} from '../../../../src/plugins/data/common';
import { PointInTimeEventsVisLayer } from '../../../../src/plugins/vis_augmenter/public';
import { PLUGIN_NAME } from '../utils/constants';
import {
  CANT_FIND_KEY_WORD,
  DOES_NOT_HAVE_PERMISSIONS_KEY_WORD,
} from '../../server/utils/helpers';
import {
  DETECTOR_HAS_BEEN_DELETED,
  OVERLAY_ANOMALIES,
  PLUGIN_EVENT_TYPE,
  START_OR_END_TIME_INVALID_ERROR,
  TYPE_OF_EXPR_VIS_LAYERS,
  VIS_LAYER_PLUGIN_TYPE,
} from './constants';
import {
  convertAnomaliesToPointInTimeEventsVisLayer,
  getAnomalies,
  getDetectorResponse,
  getVisLayerError,
} from './helpers';

type Input = ExprVisLayers;
type Output = Promise<ExprVisLayers>;
type Name = typeof OVERLAY_ANOMALIES;

interface Arguments {
  detectorId: string;
}

export type OverlayAnomaliesExpressionFunctionDefinition =
  ExpressionFunctionDefinition<Name, Input, Arguments, Output>;

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
        const resultIndex = get(detectorResponse.response, 'resultIndex', '');
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
          endTimeInMillis,
          resultIndex
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
