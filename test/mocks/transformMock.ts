/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The transform configuration in Jest allows you to 
 * specify custom transformation logic for specific file types during testing. 
 */
module.exports = {
  /**
   * This function is responsible for transforming the file.
   * @returns the string module.exports = {};, which is an empty CommonJS module.
   */
  process() {
    return {
      code: `module.exports = {};`,
    };
  },
  /**
   * The cache key helps Jest determine if a file needs to be retransformed or if it can use the cached transformation result. 
   * @returns a unique string that serves as a cache key for the transformation. 
   */
  getCacheKey() {
    return 'svgTransform';
  },
};