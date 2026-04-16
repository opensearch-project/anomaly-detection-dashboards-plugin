/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatEntityValue, localizeTimestamps } from '../insightCardHelpers';
import moment from 'moment';

describe('insightCardHelpers', () => {
  describe('formatEntityValue', () => {
    test('extracts value from OTel entity', () => {
      expect(formatEntityValue('resource.attributes.service.name: load-generator')).toBe(
        'load-generator'
      );
    });

    test('extracts value from simple field: value', () => {
      expect(formatEntityValue('service.name: checkout')).toBe('checkout');
    });

    test('returns entity as-is when no colon separator', () => {
      expect(formatEntityValue('some-entity')).toBe('some-entity');
    });

    test('returns entity as-is when value after colon is empty', () => {
      expect(formatEntityValue('field:')).toBe('field:');
    });

    test('preserves colons in value (e.g., URL)', () => {
      expect(formatEntityValue('url: http://example.com:8080')).toBe(
        'http://example.com:8080'
      );
    });

    test('trims whitespace', () => {
      expect(formatEntityValue('  service.name :  frontend  ')).toBe('frontend');
    });

    test('handles empty string', () => {
      expect(formatEntityValue('')).toBe('');
    });

    test('extracts value with = separator (insight format)', () => {
      expect(formatEntityValue('serviceName.keyword=checkout')).toBe('checkout');
    });
  });

  describe('localizeTimestamps', () => {
    test('replaces UTC timestamp with Z suffix', () => {
      const result = localizeTimestamps('Anomaly detected at Mar 10, 2026 08:12 Z on service');
      // Should not contain the original UTC timestamp
      expect(result).not.toContain('Mar 10, 2026 08:12 Z');
      // Should contain a localized time (moment lll format)
      expect(result).toContain('Anomaly detected at ');
      expect(result).toContain(' on service');
    });

    test('replaces UTC timestamp with UTC suffix', () => {
      const result = localizeTimestamps('Started at Jan 5, 2026 14:30 UTC');
      expect(result).not.toContain('Jan 5, 2026 14:30 UTC');
    });

    test('replaces multiple timestamps in same string', () => {
      const input = 'From Mar 10, 2026 08:12 Z to Mar 10, 2026 09:45 Z';
      const result = localizeTimestamps(input);
      expect(result).not.toContain(' Z');
    });

    test('leaves non-UTC timestamps unchanged', () => {
      const input = 'Anomaly at Mar 10, 2026 08:12 PST';
      expect(localizeTimestamps(input)).toBe(input);
    });

    test('leaves text without timestamps unchanged', () => {
      const input = 'No timestamps here';
      expect(localizeTimestamps(input)).toBe(input);
    });

    test('produces correct local time value', () => {
      const result = localizeTimestamps('At Jun 15, 2026 12:00 Z');
      const expected = moment.utc('Jun 15, 2026 12:00', 'MMM D, YYYY HH:mm').local().format('lll');
      expect(result).toBe(`At ${expected}`);
    });
  });
});
