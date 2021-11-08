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


import { getVisibleOptions, sanitizeSearchText } from '../helpers';
describe('helpers', () => {
  describe('getVisibleOptions', () => {
    test('returns without system indices if valid index options', () => {
      expect(
        getVisibleOptions(
          [
            { index: 'hello', health: 'green' },
            { index: '.world', health: 'green' },
          ],
          [
            { alias: 'hello', index: 'world' },
            { alias: '.system', index: 'opensearch_dashboards' },
          ]
        )
      ).toEqual([
        {
          label: 'Indices',
          options: [{ label: 'hello', health: 'green' }],
        },
        {
          label: 'Aliases',
          options: [{ label: 'hello' }],
        },
      ]);
    });
    test('returns empty aliases and index ', () => {
      expect(
        getVisibleOptions(
          [
            { index: '.hello', health: 'green' },
            { index: '.world', health: 'green' },
          ],
          [{ alias: '.system', index: 'opensearch_dashboards' }]
        )
      ).toEqual([
        {
          label: 'Indices',
          options: [],
        },
        {
          label: 'Aliases',
          options: [],
        },
      ]);
    });
  });
  describe('sanitizeSearchText', () => {
    test('should return empty', () => {
      expect(sanitizeSearchText('*')).toBe('');
      expect(sanitizeSearchText('')).toBe('');
    });
    test('should prepend and append wildcard on valid input', () => {
      expect(sanitizeSearchText('h')).toBe('*h*');
      expect(sanitizeSearchText('hello')).toBe('*hello*');
    });
  });
});
