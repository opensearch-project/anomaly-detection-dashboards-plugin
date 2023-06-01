/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { setClient } from '../../services';
import { httpClientMock, coreServicesMock } from '../../../test/mocks';
import {
  convertAnomaliesToPointInTimeEventsVisLayer,
  getAnomalies,
  getVisLayerError,
  getDetectorResponse,
} from '../overlay_anomalies';
import {
  anomalyResultSummary,
  noAnomaliesResultResponse,
  parsedAnomalies,
  selectedDetectors,
} from '../../pages/utils/__tests__/constants';
import {
  DETECTOR_HAS_BEEN_DELETED,
  START_OR_END_TIME_INVALID_ERROR,
  VIS_LAYER_PLUGIN_TYPE,
} from '../constants';
import { PLUGIN_NAME } from '../../utils/constants';
import { VisLayerErrorTypes } from '../../../../../src/plugins/vis_augmenter/public';
import { DOES_NOT_HAVE_PERMISSIONS_KEY_WORD } from '../../../server/utils/helpers';

describe('overlay_anomalies spec', () => {
  setClient(httpClientMock);

  const ADPluginResource = {
    type: VIS_LAYER_PLUGIN_TYPE,
    id: 'hNX8l4ABuV34PY9I1EAZ',
    name: 'test-1',
    urlPath: `${PLUGIN_NAME}#/detectors/hNX8l4ABuV34PY9I1EAZ/results`, //details page for detector in AD plugin
  };

  describe('getAnomalies()', () => {
    test('One anomaly', async () => {
      httpClientMock.post = jest.fn().mockResolvedValue(anomalyResultSummary);
      const receivedAnomalies = await getAnomalies(
        'hNX8l4ABuV34PY9I1EAZ',
        1589258564789,
        1589258684789
      );
      expect(receivedAnomalies).toStrictEqual(parsedAnomalies);
    });
    test('No Anomalies', async () => {
      httpClientMock.post = jest
        .fn()
        .mockResolvedValue(noAnomaliesResultResponse);
      const receivedAnomalies = await getAnomalies(
        'hNX8l4ABuV34PY9I1EAZ',
        1589258564789,
        1589258684789
      );
      expect(receivedAnomalies).toStrictEqual([]);
    });
    test('Failed response', async () => {
      httpClientMock.post = jest.fn().mockResolvedValue({ ok: false });
      const receivedAnomalies = await getAnomalies(
        'hNX8l4ABuV34PY9I1EAZ',
        1589258564789,
        1589258684789
      );
      expect(receivedAnomalies).toStrictEqual([]);
    });
  });
  describe('getDetectorResponse()', () => {
    test('get detector', async () => {
      httpClientMock.get = jest
        .fn()
        .mockResolvedValue({ ok: true, response: selectedDetectors[0] });
      const receivedAnomalies = await getDetectorResponse(
        'gtU2l4ABuV34PY9ITTdm'
      );
      expect(receivedAnomalies).toStrictEqual({
        ok: true,
        response: selectedDetectors[0],
      });
    });
  });
  describe('convertAnomaliesToPointInTimeEventsVisLayer()', () => {
    test('convert anomalies to PointInTimeEventsVisLayer', async () => {
      const expectedTimeStamp =
        parsedAnomalies[0].startTime +
        (parsedAnomalies[0].endTime - parsedAnomalies[0].startTime) / 2;
      const expectedPointInTimeEventsVisLayer = {
        events: [
          {
            metadata: {},
            timestamp: expectedTimeStamp,
          },
        ],
        originPlugin: 'anomalyDetectionDashboards',
        pluginResource: {
          id: 'hNX8l4ABuV34PY9I1EAZ',
          name: 'test-1',
          type: 'Anomaly Detectors',
          urlPath:
            'anomaly-detection-dashboards#/detectors/hNX8l4ABuV34PY9I1EAZ/results',
        },
        type: 'PointInTimeEvents',
      };
      const pointInTimeEventsVisLayer =
        await convertAnomaliesToPointInTimeEventsVisLayer(
          parsedAnomalies,
          ADPluginResource
        );
      expect(pointInTimeEventsVisLayer).toStrictEqual(
        expectedPointInTimeEventsVisLayer
      );
    });
  });
  describe('getErrorLayerVisLayer()', () => {
    test('get resource deleted ErrorVisLayer', async () => {
      const error = new Error(
        'Anomaly Detector - ' + DETECTOR_HAS_BEEN_DELETED
      );
      const expectedVisLayerError = {
        type: VisLayerErrorTypes.RESOURCE_DELETED,
        message: error.message,
      };
      const visLayerError = await getVisLayerError(error);
      console.log('receivedError: ' + JSON.stringify(visLayerError));
      expect(visLayerError).toStrictEqual(expectedVisLayerError);
    });
    test('get no permission ErrorVisLayer', async () => {
      const error = new Error(
        'Anomaly Detector - ' + DOES_NOT_HAVE_PERMISSIONS_KEY_WORD
      );
      const expectedVisLayerError = {
        type: VisLayerErrorTypes.PERMISSIONS_FAILURE,
        message: error.message,
      };
      const visLayerError = await getVisLayerError(error);
      console.log('recievedError: ' + JSON.stringify(visLayerError));
      expect(visLayerError).toStrictEqual(expectedVisLayerError);
    });
    test('get fetch issue ErrorVisLayer', async () => {
      const error = new Error(START_OR_END_TIME_INVALID_ERROR);
      const expectedVisLayerError = {
        type: VisLayerErrorTypes.FETCH_FAILURE,
        message: error.message,
      };
      const visLayerError = await getVisLayerError(error);
      console.log('recievedError: ' + JSON.stringify(visLayerError));
      expect(visLayerError).toStrictEqual(expectedVisLayerError);
    });
  });
});
