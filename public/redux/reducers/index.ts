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

import { combineReducers } from 'redux';
import opensearchReducer from './opensearch';
import adReducer from './ad';
import previewAnomalies from './previewAnomalies';
import anomalyResults from './anomalyResults';
import liveAnomalyResults from './liveAnomalyResults';
import adAppReducer from './adAppReducer';
import alertingReducer from './alerting';

const rootReducer = combineReducers({
  opensearch: opensearchReducer,
  anomalies: previewAnomalies,
  anomalyResults: anomalyResults,
  liveAnomalyResults: liveAnomalyResults,
  ad: adReducer,
  adApp: adAppReducer,
  alerting: alertingReducer,
});

export default rootReducer;

export type AppState = ReturnType<typeof rootReducer>;
