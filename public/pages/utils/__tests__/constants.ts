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

import moment from 'moment';
import {
  EntityAnomalySummaries,
  EntityAnomalySummary,
} from '../../../../server/models/interfaces';
import { AnomalyData } from '../../../models/interfaces';

export const FAKE_START_TIME = moment('2019-10-10T09:00:00');
export const FAKE_END_TIME = FAKE_START_TIME.clone().add(2, 'd');
export const FAKE_ANOMALY_START_TIME = FAKE_START_TIME.add(
  1,
  'minutes'
).valueOf();
export const FAKE_ANOMALY_END_TIME = FAKE_START_TIME.add(
  2,
  'minutes'
).valueOf();
export const FAKE_ANOMALY_PLOT_TIME = FAKE_START_TIME.add(
  90,
  'seconds'
).valueOf();
export const FAKE_DATE_RANGE = {
  startDate: FAKE_START_TIME.valueOf(),
  endDate: FAKE_END_TIME.valueOf(),
};
export const FAKE_SINGLE_FEATURE_VALUE = {
  data: 10,
  endTime: FAKE_ANOMALY_END_TIME,
  startTime: FAKE_ANOMALY_START_TIME,
  plotTime: FAKE_ANOMALY_PLOT_TIME,
};
export const FAKE_FEATURE_DATA = {
  testFeatureId: FAKE_SINGLE_FEATURE_VALUE,
};
export const FAKE_ENTITY = { name: 'entityName', value: 'entityValue' };
export const FAKE_ANOMALY_DATA = [
  {
    anomalyGrade: 0.3,
    confidence: 0.8,
    startTime: FAKE_ANOMALY_START_TIME,
    endTime: FAKE_ANOMALY_END_TIME,
    plotTime: FAKE_ANOMALY_PLOT_TIME,
    entity: [FAKE_ENTITY],
    features: FAKE_FEATURE_DATA,
  } as AnomalyData,
];

export const FAKE_ANOMALIES_RESULT = {
  anomalies: FAKE_ANOMALY_DATA,
  featureData: {
    testFeatureId: [FAKE_SINGLE_FEATURE_VALUE],
  },
};

export const FAKE_ENTITY_ANOMALY_SUMMARY = {
  startTime: FAKE_ANOMALY_START_TIME,
  maxAnomaly: 0.9,
  anomalyCount: 1,
} as EntityAnomalySummary;

export const FAKE_ENTITY_ANOMALY_SUMMARIES = {
  entityList: [FAKE_ENTITY],
  anomalySummaries: [FAKE_ENTITY_ANOMALY_SUMMARY],
} as EntityAnomalySummaries;
