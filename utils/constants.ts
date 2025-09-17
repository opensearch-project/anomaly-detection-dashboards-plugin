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
  GET_CLUSTERS_INFO: `${BASE_NODE_API_PATH}/_remote/info`,
  GET_INDICES_AND_ALIASES: `${BASE_NODE_API_PATH}/_indices_and_aliases`,
  GET_CLUSTERS_SETTING: `${BASE_NODE_API_PATH}/_cluster/settings`,
});
export const ALERTING_NODE_API = Object.freeze({
  _SEARCH: `${BASE_NODE_API_PATH}/monitors/_search`,
  ALERTS: `${BASE_NODE_API_PATH}/monitors/alerts`,
  MONITORS: `${BASE_NODE_API_PATH}/monitors`,
});

export const FORECAST_BASE_NODE_API_PATH = '/api/forecasting';

export const FORECAST_NODE_API = Object.freeze({
  _SEARCH: `${FORECAST_BASE_NODE_API_PATH}/_search`,
  _INDICES: `${FORECAST_BASE_NODE_API_PATH}/_indices`,
  _ALIASES: `${FORECAST_BASE_NODE_API_PATH}/_aliases`,
  _MAPPINGS: `${FORECAST_BASE_NODE_API_PATH}/_mappings`,
  FORECASTER: `${FORECAST_BASE_NODE_API_PATH}/forecasters`,
  CREATE_INDEX: `${FORECAST_BASE_NODE_API_PATH}/create_index`,
  BULK: `${FORECAST_BASE_NODE_API_PATH}/bulk`,
  DELETE_INDEX: `${FORECAST_BASE_NODE_API_PATH}/delete_index`,
  CREATE_SAMPLE_DATA: `${FORECAST_BASE_NODE_API_PATH}/create_sample_data`,
  GET_CLUSTERS_INFO: `${FORECAST_BASE_NODE_API_PATH}/_remote/info`,
  GET_INDICES_AND_ALIASES: `${FORECAST_BASE_NODE_API_PATH}/_indices_and_aliases`,
});
