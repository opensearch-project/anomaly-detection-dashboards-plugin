/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
export = {
  process(): { code: string } {
    return {
      code: `module.exports = {};`,
    };
  },
  getCacheKey(): string {
    return 'svgTransform';
  },
};