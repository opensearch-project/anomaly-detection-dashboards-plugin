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
  SORT_DIRECTION,
  AD_DOC_FIELDS,
} from '../../../../server/utils/constants';
import { CHART_COLORS } from '../../AnomalyCharts/utils/constants';

export const DEFAULT_QUERY_PARAMS = {
  from: 0,
  search: '',
  size: 20,
  sortDirection: SORT_DIRECTION.ASC,
  sortField: AD_DOC_FIELDS.DATA_START_TIME,
};

export enum ANOMALY_HISTORY_TABS {
  FEATURE_BREAKDOWN = 'featureBreakdown',
  ANOMALY_OCCURRENCE = 'anomalyOccurrence',
}

export const LIVE_ANOMALY_CHART_THEME = [
  {
    colors: {
      vizColors: [CHART_COLORS.ANOMALY_GRADE_COLOR],
    },
  },
];

//https://github.com/opensearch-project/anomaly-detection/blob/master/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L307
export const NO_FULL_SHINGLE_ERROR_MESSAGE =
  'No full shingle in current detection window';
//https://github.com/opensearch-project/anomaly-detection/blob/master/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L295
export const NO_DATA_IN_WINDOW_ERROR_MESSAGE =
  'No data in current detection window';
//https://github.com/opensearch-project/anomaly-detection/blob/master/src/main/java/com/amazon/opendistroforelasticsearch/ad/transport/AnomalyResultTransportAction.java#L81
export const NO_RCF_MODEL_ERROR_MESSAGE =
  'No RCF models are available either because RCF models are not ready or all nodes are unresponsive or the system might have bugs';

export const TOP_CHILD_ENTITIES_TO_FETCH = 20;

export const MAX_TIME_SERIES_TO_DISPLAY = 5;

export const ENTITY_COLORS = ['red', 'blue', 'black', 'green', 'orange'];
