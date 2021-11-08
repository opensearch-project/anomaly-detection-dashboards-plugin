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

import {validateNonNegativeInteger} from '../utils';

describe('validateNonNegativeInteger', () => {

  test('should pass for positive', () => {
      expect(validateNonNegativeInteger(1)).toBeUndefined();
  });

  test('should pass for zero', () => {
      expect(validateNonNegativeInteger(0)).toBeUndefined();
  });

  test('should raise for negative', () => {
      expect(validateNonNegativeInteger(-1)).not.toBeUndefined();
  });

  test('should raise for floating-point', () => {
      expect(validateNonNegativeInteger(1.1)).not.toBeUndefined();
  });

});
