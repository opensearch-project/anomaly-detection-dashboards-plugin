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

//@ts-ignore
import moment from 'moment';
import {
  getAnomalySummary,
  convertAlerts,
  generateAlertAnnotations,
} from '../anomalyChartUtils';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { MonitorAlert } from '../../../../models/interfaces';

describe('anomalyChartUtils', () => {
  describe('getAnomalySummary', () => {
    test('test anomaly summary happy case', () => {
      const anomalySummary = getAnomalySummary([
        {
          anomalyGrade: 0.7,
          confidence: 0.87,
          endTime: 1589313164793,
          plotTime: 1589313164793,
          startTime: 1589313044793,
        },
        {
          anomalyGrade: 0.1,
          confidence: 0.98,
          endTime: 1589258804798,
          plotTime: 1589258804798,
          startTime: 1589258684798,
        },
        {
          anomalyGrade: 0.4,
          confidence: 0.86,
          endTime: 1589258684789,
          plotTime: 1589258684789,
          startTime: 1589258564789,
        },
      ]);

      expect(anomalySummary).toEqual({
        anomalyOccurrence: 3,
        minAnomalyGrade: 0.1,
        maxAnomalyGrade: 0.7,
        avgAnomalyGrade: 0.4,
        minConfidence: 0.86,
        maxConfidence: 0.98,
        lastAnomalyOccurrence: moment(1589313164793).format('MM/DD/YY hh:mm A'),
      });
    });
    test('test anomaly summary with empty anomalies', () => {
      const anomalySummary = getAnomalySummary([]);

      expect(anomalySummary).toEqual({
        anomalyOccurrence: 0,
        minAnomalyGrade: 0,
        maxAnomalyGrade: 0,
        minConfidence: 0,
        maxConfidence: 0,
        lastAnomalyOccurrence: '-',
      });
    });
    test('test anomaly summary with undefined anomalies', () => {
      const anomalySummary = getAnomalySummary(undefined);
      expect(anomalySummary).toEqual({
        anomalyOccurrence: 0,
        minAnomalyGrade: 0,
        maxAnomalyGrade: 0,
        minConfidence: 0,
        maxConfidence: 0,
        lastAnomalyOccurrence: '-',
      });
    });
  });
});

describe('anomalyChartUtils function tests', () => {
  const alertResponse = {
    response: {
      alerts: [
        {
          id: 'eQURa3gBKo1jAh6qUo49',
          version: 300,
          monitor_id: 'awUMa3gBKo1jAh6qu47E',
          schema_version: 2,
          monitor_version: 2,
          monitor_name: 'Example_monitor_name',
          monitor_user: {
            name: 'admin',
            backend_roles: ['admin'],
            roles: ['all_access', 'own_index'],
            custom_attribute_names: [],
            user_requested_tenant: null,
          },
          trigger_id: 'bQUQa3gBKo1jAh6qnY6G',
          trigger_name: 'Example_trigger_name',
          state: 'ACTIVE',
          error_message: null,
          alert_history: [
            {
              timestamp: 1617314504873,
              message: 'Example error emssage',
            },
            {
              timestamp: 1617312543925,
              message: 'Example error message',
            },
          ],
          severity: 1,
          action_execution_results: [
            {
              action_id: 'bgUQa3gBKo1jAh6qnY6G',
              last_execution_time: 1617317979908,
              throttled_count: 0,
            },
          ],
          start_time: 1616704000492,
          last_notification_time: 1617317979908,
          end_time: null,
          acknowledged_time: null,
        },
      ],
      totalAlerts: 1,
    },
  };
  const alertConverted = [
    {
      monitorName: 'Example_monitor_name',
      triggerName: 'Example_trigger_name',
      severity: 1,
      state: 'ACTIVE',
      error: null,
      startTime: 1616704000492,
      endTime: null,
      acknowledgedTime: null,
    },
  ] as MonitorAlert[];
  test('convertAlerts', () => {
    expect(convertAlerts(alertResponse)).toStrictEqual(alertConverted);
  });
  test('generateAlertAnnotations', () => {
    const alertsConverted = generateAlertAnnotations(alertConverted);
    expect(alertsConverted).toStrictEqual([
      {
        dataValue: 1616704000492,
        details:
          'There is a severity 1 alert with state ACTIVE from 03/25/21 08:26:40 PM.',
        header: '03/25/21 08:26:40 PM',
      },
    ]);
  });
});
