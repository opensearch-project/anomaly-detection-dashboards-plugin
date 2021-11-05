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

export enum DETECTOR_DETAIL_TABS {
  RESULTS = 'results',
  HISTORICAL = 'historical',
  CONFIGURATIONS = 'configurations',
}

const DEFAULT_ACTION_ITEM = 'Restart the detector and try again.';
// Known causes:
// https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L174-L185
export const DETECTOR_INIT_FAILURES = Object.freeze({
  NO_TRAINING_DATA: {
    //https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L801
    keyword: 'Cannot get training data',
    cause: 'no sufficient data is ingested',
    actionItem:
      'Make sure your data is ingested correctly. If your data source has infrequent ingestion, increase the detector time interval and try again.',
  },
  COLD_START_ERROR: {
    //https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L811
    keyword: 'Error while cold start',
    cause: 'of an error during model training',
    actionItem: DEFAULT_ACTION_ITEM,
  },
  AD_MODEL_MEMORY_REACH_LIMIT: {
    //https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/ml/ModelManager.java#L272
    keyword: 'AD models memory usage exceeds our limit',
    cause: 'of lack of memory for the detector models',
    actionItem: 'Reduce the number of features and try again.',
  },
  DETECTOR_MEMORY_REACH_LIMIT: {
    //https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/ml/ModelManager.java#L783
    keyword: 'Exceeded memory limit',
    cause: 'of lack of memory for the detector',
    actionItem:
      "Remove or stop other detectors that you don't actively use, increase your cluster size, reduce the number of features, or scale up with an instance type of more memory and try again.",
  },
  DATA_INDEX_NOT_FOUND: {
    //https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L366
    keyword: 'Having trouble querying data: ',
    cause: 'the data index is not found',
    actionItem: 'Make sure your index exists and try again.',
  },
  ALL_FEATURES_DISABLED: {
    //https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L368
    keyword:
      'Having trouble querying data because all of your features have been disabled',
    cause: 'all detector features are disabled',
    actionItem: 'Enable one or more features and try again.',
  },
  DETECTOR_UNDEFINED: {
    //https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L230
    keyword: 'AnomalyDetector is not available',
    cause: 'the detector is not defined',
    actionItem: 'Define your detector and try again.',
  },
  INVALID_FEATURE_QUERY: {
    // TODO: https://github.com/opensearch-project/anomaly-detection/issues/218
    //https://github.com/opensearch-project/anomaly-detection/blob/master/src/main/java/com/amazon/opendistroforelasticsearch/ad/constant/CommonErrorMessages.java#L28
    keyword: 'Invalid search query',
    cause: 'the custom query caused an invalid feature aggregation',
    actionItem:
      'Revise the custom query in your feature aggregations and try again.',
  },
  UNKNOWN_EXCEPTION: {
    //https://github.com/opensearch-project/anomaly-detection/blob/development/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L438
    keyword: 'We might have bugs',
    cause: 'of unknown error',
    actionItem: DEFAULT_ACTION_ITEM,
  },
});
