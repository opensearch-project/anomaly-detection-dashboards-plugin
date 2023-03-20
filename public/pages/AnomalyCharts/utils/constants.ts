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

export const INITIAL_ANOMALY_SUMMARY = {
  anomalyOccurrence: 0,
  minAnomalyGrade: 0.0,
  maxAnomalyGrade: 0.0,
  minConfidence: 0.0,
  maxConfidence: 0.0,
  lastAnomalyOccurrence: '',
};

export enum CHART_FIELDS {
  PLOT_TIME = 'plotTime',
  ANOMALY_GRADE = 'anomalyGrade',
  CONFIDENCE = 'confidence',
  DATA = 'data',
  AGG_INTERVAL = 'aggInterval',
  EXPECTED_VALUE = 'expectedValue',
}

export enum CHART_COLORS {
  ANOMALY_GRADE_COLOR = '#D13212',
  FEATURE_DATA_COLOR = '#16191F',
  FEATURE_COLOR = '#fcd529',
  CONFIDENCE_COLOR = '#017F75',
  LIGHT_BACKGROUND = '#FFFFFF',
  DARK_BACKGROUND = '#1D1E24',
}

export const FEATURE_CHART_THEME = [
  {
    lineSeriesStyle: {
      line: {
        strokeWidth: 2,
        visible: true,
        opacity: 0.5,
      },
      point: {
        visible: true,
        stroke: CHART_COLORS.FEATURE_DATA_COLOR,
      },
    },
  },
  {
    colors: {
      vizColors: [CHART_COLORS.FEATURE_DATA_COLOR],
    },
  },
];

export const ANOMALY_CHART_THEME = [
  {
    colors: {
      vizColors: [
        CHART_COLORS.CONFIDENCE_COLOR,
        CHART_COLORS.ANOMALY_GRADE_COLOR,
      ],
    },
  },
];

export const DATE_PICKER_QUICK_OPTIONS = [
  { start: 'now-24h', end: 'now', label: 'last 24 hours' },
  { start: 'now-7d', end: 'now', label: 'last 7 days' },
  { start: 'now-30d', end: 'now', label: 'last 30 days' },
  { start: 'now-90d', end: 'now', label: 'last 90 days' },

  { start: 'now/d', end: 'now', label: 'Today' },
  { start: 'now/w', end: 'now', label: 'Week to date' },
  { start: 'now/M', end: 'now', label: 'Month to date' },
  { start: 'now/y', end: 'now', label: 'Year to date' },
];

export enum LIVE_CHART_CONFIG {
  REFRESH_INTERVAL_IN_SECONDS = 30 * 1000, //poll anomaly result every 30 seconds
  MONITORING_INTERVALS = 60,
}

export const DEFAULT_ANOMALY_SUMMARY = {
  anomalyOccurrence: 0,
  minAnomalyGrade: 0,
  maxAnomalyGrade: 0,
  minConfidence: 0,
  maxConfidence: 0,
  lastAnomalyOccurrence: '-',
};

export const HEATMAP_CHART_Y_AXIS_WIDTH = 30;
