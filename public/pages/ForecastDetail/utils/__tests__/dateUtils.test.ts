/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  parseDateMath,
  convertToEpochRange,
  formatEpochDate,
  createRelativeDateRange,
  createAbsoluteDateRange,
  dateRangeToString,
  isRelativeDateRange,
} from '../dateUtils';
import { DateRange } from '../interface';

describe('parseDateMath', () => {
  test('returns Date.now() for empty string', () => {
    const before = Date.now();
    const result = parseDateMath('');
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(Date.now());
  });

  test('returns numeric value for numeric string', () => {
    expect(parseDateMath('1609459200000')).toBe(1609459200000);
  });

  test('parses relative expression like now-1h', () => {
    const result = parseDateMath('now-1h');
    const expected = Date.now() - 3600000;
    expect(result).toBeGreaterThanOrEqual(expected - 1000);
    expect(result).toBeLessThanOrEqual(expected + 1000);
  });

  test('parses "now"', () => {
    const before = Date.now();
    const result = parseDateMath('now');
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(Date.now());
  });

  test('falls back to moment for non-math date strings', () => {
    const result = parseDateMath('2021-01-01T00:00:00.000Z');
    expect(result).toBe(1609459200000);
  });

  test('returns NaN for completely unparseable string (dateMath returns invalid moment)', () => {
    const result = parseDateMath('not-a-date-at-all-xyz');
    expect(isNaN(result)).toBe(true);
  });
});

describe('convertToEpochRange', () => {
  test('converts relative date range', () => {
    const dateRange: DateRange = {
      startDate: 'now-1h',
      endDate: 'now',
      isRelative: true,
    };
    const result = convertToEpochRange(dateRange);
    expect(result.endDate).toBeGreaterThan(result.startDate);
    expect(result.endDate - result.startDate).toBeGreaterThanOrEqual(3500000);
    expect(result.endDate - result.startDate).toBeLessThanOrEqual(3700000);
  });

  test('converts absolute numeric date range', () => {
    const dateRange: DateRange = {
      startDate: 1609459200000,
      endDate: 1609462800000,
      isRelative: false,
    };
    const result = convertToEpochRange(dateRange);
    expect(result.startDate).toBe(1609459200000);
    expect(result.endDate).toBe(1609462800000);
  });

  test('converts absolute string date range', () => {
    const dateRange: DateRange = {
      startDate: '2021-01-01T00:00:00.000Z',
      endDate: '2021-01-01T01:00:00.000Z',
      isRelative: false,
    };
    const result = convertToEpochRange(dateRange);
    expect(result.startDate).toBe(1609459200000);
    expect(result.endDate).toBe(1609462800000);
  });

  test('handles numeric string as absolute date', () => {
    const dateRange: DateRange = {
      startDate: '1609459200000',
      endDate: '1609462800000',
      isRelative: false,
    };
    const result = convertToEpochRange(dateRange);
    expect(result.startDate).toBe(1609459200000);
    expect(result.endDate).toBe(1609462800000);
  });
});

describe('formatEpochDate', () => {
  test('formats with default format', () => {
    const ts = 1609459200000;
    const result = formatEpochDate(ts);
    // Use moment to generate expected value so test is timezone-independent
    const expected = require('moment')(ts).format('MM/DD/YYYY hh:mm A');
    expect(result).toBe(expected);
  });

  test('formats with custom format', () => {
    const ts = 1609459200000;
    const result = formatEpochDate(ts, 'YYYY-MM-DD');
    const expected = require('moment')(ts).format('YYYY-MM-DD');
    expect(result).toBe(expected);
  });
});

describe('createRelativeDateRange', () => {
  test('creates relative date range', () => {
    const result = createRelativeDateRange('now-1h', 'now');
    expect(result).toEqual({
      startDate: 'now-1h',
      endDate: 'now',
      isRelative: true,
    });
  });
});

describe('createAbsoluteDateRange', () => {
  test('creates absolute date range', () => {
    const result = createAbsoluteDateRange(1000, 2000);
    expect(result).toEqual({
      startDate: 1000,
      endDate: 2000,
      isRelative: false,
    });
  });
});

describe('dateRangeToString', () => {
  test('returns friendly label for known quick option', () => {
    const dateRange: DateRange = {
      startDate: 'now-1h',
      endDate: 'now',
      isRelative: true,
    };
    expect(dateRangeToString(dateRange)).toBe('Last 1 hour');
  });

  test('returns friendly label for Today', () => {
    const dateRange: DateRange = {
      startDate: 'now/d',
      endDate: 'now',
      isRelative: true,
    };
    expect(dateRangeToString(dateRange)).toBe('Today');
  });

  test('falls back to formatted dates for unknown relative range', () => {
    const dateRange: DateRange = {
      startDate: 'now-3h',
      endDate: 'now',
      isRelative: true,
    };
    const result = dateRangeToString(dateRange);
    expect(result).toContain(' to ');
  });

  test('formats absolute date range', () => {
    const dateRange: DateRange = {
      startDate: 1609459200000,
      endDate: 1609462800000,
      isRelative: false,
    };
    const result = dateRangeToString(dateRange);
    expect(result).toContain(' to ');
  });
});

describe('isRelativeDateRange', () => {
  test('returns true when start contains now', () => {
    expect(isRelativeDateRange('now-1h', '2021-01-01')).toBe(true);
  });

  test('returns true when end contains now', () => {
    expect(isRelativeDateRange('2021-01-01', 'now')).toBe(true);
  });

  test('returns false for absolute dates', () => {
    expect(isRelativeDateRange('2021-01-01', '2021-01-02')).toBe(false);
  });
});
