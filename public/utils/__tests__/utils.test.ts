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

import { validateNonNegativeInteger, validateMultipleOf } from '../utils';

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

describe('validateMultipleOf', () => {
  test('should pass for empty string (not provided)', () => {
    expect(validateMultipleOf('', 5)).toBeUndefined();
  });

  test('should pass for null', () => {
    expect(validateMultipleOf(null, 5)).toBeUndefined();
  });

  test('should pass for undefined', () => {
    expect(validateMultipleOf(undefined, 5)).toBeUndefined();
  });

  test('should raise error for non-numeric string', () => {
    expect(validateMultipleOf('abc', 5)).toBe('Must be a number');
  });

  test('should raise error for NaN', () => {
    expect(validateMultipleOf(NaN, 5)).toBe('Must be a number');
  });

  test('should raise error for Infinity', () => {
    expect(validateMultipleOf(Infinity, 5)).toBe('Must be a number');
  });

  test('should raise error for negative number', () => {
    expect(validateMultipleOf(-5, 5)).toBe('Must be a positive integer');
  });

  test('should raise error for floating point number', () => {
    expect(validateMultipleOf(5.5, 5)).toBe('Must be a positive integer');
  });

  test('should pass when value is multiple of interval', () => {
    expect(validateMultipleOf(10, 5)).toBeUndefined();
    expect(validateMultipleOf(15, 5)).toBeUndefined();
    expect(validateMultipleOf(20, 4)).toBeUndefined();
  });

  test('should raise error when value is not multiple of interval', () => {
    expect(validateMultipleOf(7, 5)).toBe('Value "7" is not a multiple of interval (5 minutes)');
    expect(validateMultipleOf(13, 5)).toBe('Value "13" is not a multiple of interval (5 minutes)');
  });

  test('should pass when multiple is not a positive integer (gracefully ignore)', () => {
    expect(validateMultipleOf(7, 0)).toBeUndefined();
    expect(validateMultipleOf(7, -1)).toBeUndefined();
    expect(validateMultipleOf(7, 1.5)).toBeUndefined();
    expect(validateMultipleOf(7, 'invalid')).toBeUndefined();
  });
});
