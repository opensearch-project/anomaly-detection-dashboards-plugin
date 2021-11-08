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

import chance from 'chance';
import { validateDetectorDesc } from '../validation';

describe('validations', () => {
  describe('validateDetectorDesc', () => {
    const descriptionGenerator = new chance('seed');
    test('should throw size limit if exceed  400', () => {
      expect(
        validateDetectorDesc(descriptionGenerator.paragraph({ length: 500 }))
      ).toEqual('Description Should not exceed 400 characters');
    });
    test('should return undefined if not empty', () => {
      expect(validateDetectorDesc('This is description')).toBeUndefined();
    });
  });
});
