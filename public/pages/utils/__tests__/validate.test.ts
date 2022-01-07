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

import { validateIndex, ILLEGAL_CHARACTERS } from '../validate';

describe('validateIndex', () => {
  test('returns undefined if valid index options', () => {
    expect(
      validateIndex([{ label: 'valid-index' }, { label: 'valid*' }])
    ).toBeUndefined();
  });

  test('returns error string if non array is passed in', () => {
    const invalidText = 'Must specify an index';
    expect(validateIndex(1)).toBe(invalidText);
    expect(validateIndex(null)).toBe(invalidText);
    expect(validateIndex('test')).toBe(invalidText);
    expect(validateIndex({})).toBe(invalidText);
  });

  test('returns error string if empty array', () => {
    const invalidText = 'Must specify an index';
    expect(validateIndex([])).toBe(invalidText);
  });

  test('returns error string if invalid index pattern', () => {
    const illegalCharacters = ILLEGAL_CHARACTERS.join(' ');
    const invalidText = `One of your inputs contains invalid characters or spaces. Please omit: ${illegalCharacters}`;
    expect(validateIndex([{ label: 'valid- index$' }])).toBe(invalidText);
  });
  test('returns error string if invalid index pattern', () => {
    const illegalCharacters = ILLEGAL_CHARACTERS.join(' ');
    const invalidText = `One of your inputs contains invalid characters or spaces. Please omit: ${illegalCharacters}`;
    expect(validateIndex([{ label: '..' }])).toBe(invalidText);
  });
  test('returns error string if invalid index pattern', () => {
    const illegalCharacters = ILLEGAL_CHARACTERS.join(' ');
    const invalidText = `One of your inputs contains invalid characters or spaces. Please omit: ${illegalCharacters}`;
    expect(validateIndex([{ label: '.' }])).toBe(invalidText);
  });
});
