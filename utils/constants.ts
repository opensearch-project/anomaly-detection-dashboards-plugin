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

export const BASE_NODE_API_PATH = '/api/anomaly_detectors';

export const AD_NODE_API = Object.freeze({
  _SEARCH: `${BASE_NODE_API_PATH}/_search`,
  _INDICES: `${BASE_NODE_API_PATH}/_indices`,
  _ALIASES: `${BASE_NODE_API_PATH}/_aliases`,
  _MAPPINGS: `${BASE_NODE_API_PATH}/_mappings`,
  DETECTOR: `${BASE_NODE_API_PATH}/detectors`,
  CREATE_INDEX: `${BASE_NODE_API_PATH}/create_index`,
  BULK: `${BASE_NODE_API_PATH}/bulk`,
  DELETE_INDEX: `${BASE_NODE_API_PATH}/delete_index`,
  CREATE_SAMPLE_DATA: `${BASE_NODE_API_PATH}/create_sample_data`,
});
export const ALERTING_NODE_API = Object.freeze({
  _SEARCH: `${BASE_NODE_API_PATH}/monitors/_search`,
  ALERTS: `${BASE_NODE_API_PATH}/monitors/alerts`,
  MONITORS: `${BASE_NODE_API_PATH}/monitors`,
});
