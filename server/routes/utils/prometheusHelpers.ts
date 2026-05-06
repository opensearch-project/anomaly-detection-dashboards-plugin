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

export const PROMETHEUS_QUERY_LANGUAGE = 'PROMQL';
export const PROMETHEUS_SOURCE_TYPE = 'PROMETHEUS';
export const PROMETHEUS_SUGGEST_TYPES =
  'detection_interval,history,window_delay';
export const DEFAULT_PROMETHEUS_INTERVAL_MINUTES = 1;
export const DEFAULT_PROMETHEUS_HISTORY = 40;
export const DEFAULT_PROMETHEUS_HISTORY_LOOKBACK_SECONDS = 24 * 60 * 60;
export const DEFAULT_PROMETHEUS_MAX_HISTORY = 256;
export const DEFAULT_PROMETHEUS_MIN_SAMPLES = 32;
export const DEFAULT_PROMETHEUS_SHINGLE_SIZE = 8;
export const DEFAULT_PROMETHEUS_FEATURE_NAME = 'prometheus_value';

const PROMQL_RANGE_SELECTOR_REGEX = /\[\s*([^\]:]+?)\s*(?::[^\]]*)?\]/;
const PROMQL_DURATION_SEGMENT_REGEX = /(\d+(?:\.\d+)?)(ms|s|m|h|d|w|y)/g;

export interface IntervalPeriod {
  period: {
    interval: number;
    unit: 'Minutes' | 'Seconds';
  };
}

const DURATION_UNIT_SECONDS: Record<string, number> = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31536000,
};

export const normalizeIntervalPeriod = (
  candidate: any,
  minimumInterval: number = 1
): IntervalPeriod | undefined => {
  const period = candidate?.period ?? candidate;
  const interval = Number(period?.interval);
  const rawUnit = String(period?.unit || '').toLowerCase();
  if (!Number.isFinite(interval)) {
    return undefined;
  }
  const roundedInterval = Math.max(minimumInterval, Math.round(interval));
  if (rawUnit.startsWith('second')) {
    return {
      period: {
        interval: roundedInterval,
        unit: 'Seconds',
      },
    };
  }
  return {
    period: {
      interval: roundedInterval,
      unit: 'Minutes',
    },
  };
};

const parsePromqlDurationToSeconds = (
  durationText: string
): number | undefined => {
  const trimmed = (durationText || '').trim();
  if (!trimmed) {
    return undefined;
  }

  let totalSeconds = 0;
  let matchedLength = 0;
  PROMQL_DURATION_SEGMENT_REGEX.lastIndex = 0;
  let matchedSegment = PROMQL_DURATION_SEGMENT_REGEX.exec(trimmed);
  while (matchedSegment) {
    if (matchedSegment.index !== matchedLength) {
      return undefined;
    }
    const value = Number(matchedSegment[1]);
    const unit = matchedSegment[2];
    if (!Number.isFinite(value) || !DURATION_UNIT_SECONDS[unit]) {
      return undefined;
    }
    totalSeconds += value * DURATION_UNIT_SECONDS[unit];
    matchedLength += matchedSegment[0].length;
    matchedSegment = PROMQL_DURATION_SEGMENT_REGEX.exec(trimmed);
  }

  if (matchedLength !== trimmed.length || totalSeconds <= 0) {
    return undefined;
  }
  return totalSeconds;
};

export const getPromqlRangeIntervalPeriod = (
  queryText: string
): IntervalPeriod | undefined => {
  const match = PROMQL_RANGE_SELECTOR_REGEX.exec(queryText || '');
  if (!match || !match[1]) {
    return undefined;
  }
  const durationSeconds = parsePromqlDurationToSeconds(match[1]);
  if (!durationSeconds || durationSeconds <= 0) {
    return undefined;
  }
  const roundedSeconds = Math.max(1, Math.ceil(durationSeconds));
  if (roundedSeconds % 60 === 0) {
    return {
      period: {
        interval: Math.max(1, Math.round(roundedSeconds / 60)),
        unit: 'Minutes',
      },
    };
  }
  return {
    period: {
      interval: roundedSeconds,
      unit: 'Seconds',
    },
  };
};

const intervalPeriodToSeconds = (intervalPeriod?: IntervalPeriod): number => {
  const interval = Number(intervalPeriod?.period?.interval);
  if (!Number.isFinite(interval) || interval <= 0) {
    return 0;
  }
  return intervalPeriod?.period?.unit === 'Seconds' ? interval : interval * 60;
};

export const getPromqlLookbackHistoryBuffer = (
  queryText: string,
  intervalPeriod?: IntervalPeriod
): number => {
  const match = PROMQL_RANGE_SELECTOR_REGEX.exec(queryText || '');
  if (!match || !match[1]) {
    return 0;
  }

  const lookbackSeconds = parsePromqlDurationToSeconds(match[1]);
  const intervalSeconds = intervalPeriodToSeconds(intervalPeriod);
  if (!lookbackSeconds || lookbackSeconds <= 0 || intervalSeconds <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(lookbackSeconds / intervalSeconds));
};

export const getPrometheusHistoryFloor = (
  intervalPeriod?: IntervalPeriod
): number => {
  const intervalSeconds = intervalPeriodToSeconds(intervalPeriod);
  if (intervalSeconds <= 0) {
    return DEFAULT_PROMETHEUS_HISTORY;
  }

  return Math.max(
    DEFAULT_PROMETHEUS_HISTORY,
    Math.min(
      DEFAULT_PROMETHEUS_MAX_HISTORY,
      Math.ceil(DEFAULT_PROMETHEUS_HISTORY_LOOKBACK_SECONDS / intervalSeconds)
    )
  );
};

const sanitizeFeatureName = (rawName: string): string => {
  const sanitized = (rawName || '')
    .trim()
    .replace(/[^a-zA-Z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized || DEFAULT_PROMETHEUS_FEATURE_NAME;
};

const PROMQL_RESERVED_WORDS = new Set([
  'bool',
  'by',
  'without',
  'on',
  'ignoring',
  'group_left',
  'group_right',
  'and',
  'or',
  'unless',
  'sum',
  'avg',
  'min',
  'max',
  'count',
  'stddev',
  'stdvar',
  'topk',
  'bottomk',
  'quantile',
]);

export const extractPromqlMetricName = (
  queryText: string
): string | undefined => {
  const query = (queryText || '').trim();
  if (!query) {
    return undefined;
  }

  const metricSelectorRegex = /([a-zA-Z_:][a-zA-Z0-9_:]*)\s*(?=\{|\[)/;
  const selectorMatch = metricSelectorRegex.exec(query);
  if (selectorMatch && selectorMatch[1]) {
    return sanitizeFeatureName(selectorMatch[1]);
  }

  const tokenRegex = /\b([a-zA-Z_:][a-zA-Z0-9_:]*)\b/g;
  let tokenMatch = tokenRegex.exec(query);
  while (tokenMatch) {
    const token = tokenMatch[1];
    const nextChar = query
      .slice(tokenMatch.index + token.length)
      .trimStart()[0];
    const isFunction = nextChar === '(';
    if (!isFunction && !PROMQL_RESERVED_WORDS.has(token.toLowerCase())) {
      return sanitizeFeatureName(token);
    }
    tokenMatch = tokenRegex.exec(query);
  }

  return undefined;
};

export const buildPrometheusDetectorName = (
  queryText: string,
  metricName?: string,
  seriesFilter?: Record<string, string>
): string => {
  const base = (metricName || queryText || 'promql').trim().slice(0, 36);
  const compactQuery = base
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const compactSeries = seriesFilter
    ? Object.entries(seriesFilter)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}-${value}`)
        .join('-')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24)
    : '';
  const suffix = Date.now().toString(36).slice(-6);
  return compactSeries
    ? `metrics-${compactQuery || 'promql'}-${compactSeries}-${suffix}`
    : `metrics-${compactQuery || 'promql'}-${suffix}`;
};
