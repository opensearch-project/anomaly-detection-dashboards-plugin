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
  TITLE_GET_STARTED: { text: 'Get started'},
  TITLE_REAL_TIME_DASHBOARD: { text: 'Real-time dashboard'},
  FORECASTING: { text: 'Forecasting', href: '#/forecasters' },
  CREATE_FORECASTER: { text: 'Create forecaster' },
});

export const MDS_BREADCRUMBS = Object.freeze({
  ANOMALY_DETECTOR: (dataSourceId?: string) => ({ text: 'Anomaly detection', href: `#/?dataSourceId=${dataSourceId}` }),
  DETECTORS: (dataSourceId?: string) => ({ text: 'Detectors', href: `#/detectors?dataSourceId=${dataSourceId}` }),
  CREATE_DETECTOR: { text: 'Create detector' },
  EDIT_DETECTOR: { text: 'Edit detector' },
  DASHBOARD: (dataSourceId?: string) => ({ text: 'Dashboard', href: `#/dashboard?dataSourceId=${dataSourceId}` }),
  EDIT_MODEL_CONFIGURATION: { text: 'Edit model configuration' },
  FORECASTING: (dataSourceId?: string) => ({ text: 'Forecasting', href: `#/forecasters?dataSourceId=${dataSourceId}` }),
  CREATE_FORECASTER: { text: 'Create forecaster' },
});

export const APP_PATH = {
  DASHBOARD: '/dashboard',
  LIST_DETECTORS: '/detectors',
  CREATE_DETECTOR: '/create-ad/',
  EDIT_DETECTOR: '/detectors/:detectorId/edit',
  EDIT_FEATURES: '/detectors/:detectorId/features/',
  DETECTOR_DETAIL: '/detectors/:detectorId/',
  OVERVIEW: '/overview',
  CREATE_FORECASTER: '/create-forecaster/',
  LIST_FORECASTERS: '/forecasters',
  FORECASTER_DETAIL: '/forecasters/:forecasterId/',
};

export const OPENSEARCH_DASHBOARDS_PATH = {
  DISCOVER: '/discover',
};

export const PLUGIN_NAME = 'anomaly-detection-dashboards';

export const ALERTING_PLUGIN_NAME = 'alerting';

export const OPENSEARCH_DASHBOARDS_NAME = 'dashboards';

export const FORECASTING_FEATURE_NAME = 'forecasting';

export const ANOMALY_DETECTORS_INDEX = '.opendistro-anomaly-detectors';

export const ANOMALY_RESULT_INDEX = '.opendistro-anomaly-results';

export const AD_DOCS_LINK =
  'https://opensearch.org/docs/latest/observing-your-data/ad/index/';

export const ALERTING_DOCS_LINK =
  'https://opensearch.org/docs/latest/observing-your-data/alerting/index/';

export const FORECASTER_DOCS_LINK =
  'https://opensearch.org/docs/latest/observing-your-data/forecast/index/';

export const AD_HIGH_CARDINALITY_LINK =
  'https://opensearch.org/docs/latest/observing-your-data/ad/index/#optional-set-category-fields-for-high-cardinality';

export const AD_FEATURE_ANYWHERE_LINK =
  'https://opensearch.org/docs/latest/observing-your-data/ad/dashboards-anomaly-detection/';

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

export const DEFAULT_OUTPUT_AFTER = 32;

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

export const ANOMALY_DETECTION_ICON = 'anomalyDetection';

export const DATA_SOURCE_ID = 'dataSourceId';

export const OVERVIEW_PAGE_NAV_ID = `anomaly_detection_dashboard-overview`;

export const DASHBOARD_PAGE_NAV_ID = `anomaly_detection_dashboard-dashboard`;

export const DETECTORS_PAGE_NAV_ID = `anomaly_detection_dashboard-detectors`;

export const FORECASTING_OVERVIEW_PAGE_NAV_ID = `forecasting_dashboard-overview`;

export const FORECASTING_DASHBOARD_PAGE_NAV_ID = `forecasting_dashboard-dashboard`;

export const FORECASTERS_PAGE_NAV_ID = `forecasting_dashboard-detectors`;

export const USE_NEW_HOME_PAGE = 'home:useNewHomePage';

export enum SUGGEST_ANOMALY_DETECTOR_METRIC_TYPE {
  THUMBUP = 'thumbup',
  THUMBDOWN = 'thumbdown',
  GENERATED = 'generated',
  CREATED = 'created',
}

export const FORECASTER_INSUFFICIENT_DATA_MESSAGE = 'This forecaster can be created, however it will not be able to initialize until there is at least 40 data points including the last interval.';
export const FORECASTER_VALIDATION_ERROR_MESSAGE = 'There was a problem validating the forecaster definition';
export const FORECASTER_EMPTY_DATA_IDENTIFIER = 'Empty data';

export const FIELD_MAX_WIDTH = 400;
// We define a narrower fixed width for the numeric field & slider.
export const INPUT_SLIDER_WIDTH = 300;