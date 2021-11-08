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


export const ILLEGAL_CHARACTERS = [
  '\\',
  '/',
  '?',
  '"',
  '<',
  '>',
  '|',
  ',',
  ' ',
];

export const validateIndex = (options: any) => {
  if (!Array.isArray(options)) return 'Must specify an index';
  if (!options.length) return 'Must specify an index';
  const illegalCharacters = ILLEGAL_CHARACTERS.join(' ');
  const pattern = options.map(({ label }) => label).join('');
  if (!isIndexPatternQueryValid(pattern, ILLEGAL_CHARACTERS)) {
    return `One of your inputs contains invalid characters or spaces. Please omit: ${illegalCharacters}`;
  }
};

export function isIndexPatternQueryValid(
  pattern: string,
  illegalCharacters: string[]
) {
  if (!pattern || !pattern.length) {
    return false;
  }
  if (pattern === '.' || pattern === '..') {
    return false;
  }
  return !illegalCharacters.some(char => pattern.includes(char));
}
