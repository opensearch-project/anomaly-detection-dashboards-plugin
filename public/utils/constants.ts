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

export enum DATA_TYPES {
  NUMBER = 'number',
  TEXT = 'text',
  BOOLEAN = 'boolean',
  KEYWORD = 'keyword',
  DATE = 'date',
}

export const BREADCRUMBS = Object.freeze({
  ANOMALY_DETECTOR: { text: 'Anomaly detection', href: '#/' },
  DETECTORS: { text: 'Detectors', href: '#/detectors' },
  CREATE_DETECTOR: { text: 'Create detector' },
  EDIT_DETECTOR: { text: 'Edit detector' },
  DASHBOARD: { text: 'Dashboard', href: '#/dashboard' },
  EDIT_MODEL_CONFIGURATION: { text: 'Edit model configuration' },
});

export const APP_PATH = {
  DASHBOARD: '/dashboard',
  LIST_DETECTORS: '/detectors',
  CREATE_DETECTOR: '/create-ad/',
  EDIT_DETECTOR: '/detectors/:detectorId/edit',
  EDIT_FEATURES: '/detectors/:detectorId/features/',
  DETECTOR_DETAIL: '/detectors/:detectorId/',
  CREATE_DETECTOR_STEPS: '/create-detector-steps',
  OVERVIEW: '/overview',
};

export const OPENSEARCH_DASHBOARDS_PATH = {
  DISCOVER: '/discover',
};

export const PLUGIN_NAME = 'anomaly-detection-dashboards';

export const ALERTING_PLUGIN_NAME = 'alerting';

export const OPENSEARCH_DASHBOARDS_NAME = 'dashboards';

export const ANOMALY_DETECTORS_INDEX = '.opendistro-anomaly-detectors';

export const ANOMALY_RESULT_INDEX = '.opendistro-anomaly-results';

export const BASE_DOCS_LINK = 'https://opensearch.org/docs/monitoring-plugins';

export const MAX_DETECTORS = 1000;

export const MAX_ANOMALIES = 10000;

export const MAX_HISTORICAL_AGG_RESULTS = 10000;

// TODO: get this value from index settings since it is dynamic
export const MAX_FEATURE_NUM = 5;

export const MAX_FEATURE_NAME_SIZE = 64;

// OpenSearch max index name size is 255
export const MAX_INDEX_NAME_SIZE = 255;

export const MAX_CATEGORY_FIELD_NUM = 2;

export const NAME_REGEX = RegExp('^[a-zA-Z0-9._-]+$');
export const INDEX_NAME_REGEX = RegExp('^[a-z0-9._-]+$');

//https://github.com/opensearch-project/anomaly-detection/blob/main/src/main/java/com/amazon/opendistroforelasticsearch/ad/settings/AnomalyDetectorSettings.java
export const DEFAULT_SHINGLE_SIZE = 8;

export const FEATURE_DATA_POINTS_WINDOW = 3;

export enum MISSING_FEATURE_DATA_SEVERITY {
  // user attention not needed
  GREEN = '0',
  // needs user attention
  YELLOW = '1',
  // needs user attention and action
  RED = '2',
}

export const SPACE_STR = ' ';
