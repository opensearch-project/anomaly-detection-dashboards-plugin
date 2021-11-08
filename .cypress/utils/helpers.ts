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

import {
  API_URL_PREFIX,
  SLASH,
  AD_PATH,
  APP_URL_PREFIX,
  AD_URL,
} from './constants';

export const buildAdApiUrl = (apiPath: string): string => {
  return buildServerApiUrl(AD_PATH, apiPath);
};

export const buildServerApiUrl = (appPath: string, apiPath: string): string => {
  return [Cypress.config('baseUrl'), API_URL_PREFIX, appPath, apiPath].join(
    SLASH
  );
};

export const buildAdAppUrl = (pagePath: string): string => {
  return buildAppUrl(AD_URL, pagePath);
};

export const buildAppUrl = (appPath: string, pagePath: string): string => {
  return [APP_URL_PREFIX, appPath, pagePath].join(SLASH);
};
