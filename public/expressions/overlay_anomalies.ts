// /*
//  * SPDX-License-Identifier: Apache-2.0
//  *
//  * The OpenSearch Contributors require contributions made to
//  * this file be licensed under the Apache-2.0 license or a
//  * compatible open source license.
//  *
//  * Any modifications Copyright OpenSearch Contributors. See
//  * GitHub history for details.
//  */

import { get } from 'lodash';
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
import { PLUGIN_NAME } from '../../public/utils/constants';
import { NO_PERMISSIONS_KEY_WORD } from '../../server/utils/helpers';

type Input = ExprVisLayers;
type Output = Promise<ExprVisLayers>;

interface Arguments {
  detectorId: string;
}

const name = 'overlay_anomalies';

export type OverlayAnomaliesExpressionFunctionDefinition =
  ExpressionFunctionDefinition<'overlay_anomalies', Input, Arguments, Output>;

// This gets all the needed anomalies for the given detector ID and time range
const getAnomalies = async (
  detectorId: string,
  startTime: number,
  endTime: number
): Promise<AnomalyData[]> => {
  const anomalySummaryQuery = getAnomalySummaryQuery(
    startTime,
    endTime,
    detectorId,
    undefined,
    false
  );

  // We set the http client in the plugin.ts setup() fn. We pull it in here to make a
  // server-side call directly.
  // Note we can't use the redux fns here (e.g., searchResults()) since it requires
  // hooks (e.g., useDispatch()) which doesn't make sense in this context, plus is not allowed by React.
  const anomalySummaryResponse = await getClient().post(
    `..${AD_NODE_API.DETECTOR}/results/_search`,
    {
      body: JSON.stringify(anomalySummaryQuery),
    }
  );

  return parsePureAnomalies(anomalySummaryResponse);
};

// This takes anomalies and returns them as vis layer of type PointInTimeEvents
const convertAnomaliesToLayer = (
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
    originPlugin: 'anomaly-detection',
    type: VisLayerTypes.PointInTimeEvents,
    pluginResource: ADPluginResource,
    events: events,
  } as PointInTimeEventsVisLayer;
};

export const overlayAnomaliesFunction =
  (): OverlayAnomaliesExpressionFunctionDefinition => ({
    name,
    type: 'vis_layers',
    inputTypes: ['vis_layers'],
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
      const ADPluginResource = {
        type: 'anomaly-detection-type',
        id: detectorId,
        name: PLUGIN_NAME,
        urlPath: `${PLUGIN_NAME}#/detectors`,
      };
      try {
        if (startTimeInMillis === undefined || endTimeInMillis === undefined) {
          throw new RangeError('start or end time invalid');
        }
        const anomalies: AnomalyData[] = await getAnomalies(
          detectorId,
          startTimeInMillis,
          endTimeInMillis
        );
        const anomalyLayer = convertAnomaliesToLayer(
          anomalies,
          ADPluginResource
        );
        return {
          type: 'vis_layers',
          layers: origVisLayers
            ? origVisLayers.concat(anomalyLayer)
            : ([anomalyLayer] as VisLayers),
        };
      } catch (error) {
        console.log('Anomaly Detector - Unable to get anomalies: ', error);
        let visLayerError: VisLayerError = {} as VisLayerError;
        if (
          typeof error === 'string' &&
          error.includes(NO_PERMISSIONS_KEY_WORD)
        ) {
          visLayerError = {
            type: VisLayerErrorTypes.PERMISSIONS_FAILURE,
            message: error, // might just change this to a generic message like rest of AD plugin
          };
        } else {
          visLayerError = {
            type: VisLayerErrorTypes.FETCH_FAILURE,
            message:
              error === 'string'
                ? error
                : error instanceof Error
                ? error.message
                : '',
          };
        }
        const anomalyErrorLayer = {
          type: VisLayerTypes.PointInTimeEvents,
          originPlugin: PLUGIN_NAME,
          pluginResource: ADPluginResource,
          events: [],
          error: visLayerError,
        } as PointInTimeEventsVisLayer;
        return {
          type: 'vis_layers',
          layers: origVisLayers
            ? origVisLayers.concat(anomalyErrorLayer)
            : ([anomalyErrorLayer] as VisLayers),
        };
      }
    },
  });
