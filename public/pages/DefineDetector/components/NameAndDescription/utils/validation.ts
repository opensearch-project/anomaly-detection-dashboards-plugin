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

//TODO:: Check Length, allowed characters.
export const validateDetectorDesc = (
  description: string
): String | undefined => {
  if (description.length > 400) {
    return 'Description Should not exceed 400 characters';
  }
  return undefined;
};
