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

import { get, isEmpty } from 'lodash';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Forecaster } from '../../../models/interfaces';
import { AppState } from '../../../redux/reducers';
import { GET_FORECASTER_LIST, GET_FORECASTER, getForecaster } from '../../../redux/reducers/forecast';
import { getMappings } from '../../../redux/reducers/opensearch';

// A hook which gets required info in order to display a forecaster on OpenSearch Dashboards.
// 1. Get forecaster
// 2. Gets index mapping
export const useFetchForecasterInfo = (
  forecasterId: string,
  dataSourceId: string
): {
  forecaster: Forecaster;
  hasError: boolean;
  isLoadingForecaster: boolean;
  errorMessage: string;
} => {
  const dispatch = useDispatch();
  const forecaster = useSelector(
    (state: AppState) => state.forecast.forecasters[forecasterId]
  );
  const hasError = useSelector((state: AppState) => state.forecast.errorMessage);
  const errorCall = useSelector((state: AppState) => state.forecast.errorCall);
  const isForecasterRequesting = useSelector(
    (state: AppState) => state.forecast.requesting
  );
  const isIndicesRequesting = useSelector(
    (state: AppState) => state.opensearch.requesting
  );
  const selectedIndices = useMemo(() => get(forecaster, 'indices', []), [forecaster]);

  useEffect(() => {
    const fetchForecaster = async () => {
      if (!forecaster) {
        await dispatch(getForecaster(forecasterId, dataSourceId));
      }
      if (selectedIndices && selectedIndices.length > 0) {
        await dispatch(getMappings(selectedIndices, dataSourceId));
      }
    };
    if (forecasterId) {
      fetchForecaster();
    }
  }, [forecasterId, selectedIndices]);
  return {
    forecaster: forecaster || {},
    hasError: !isEmpty(hasError) && isEmpty(forecaster) && (errorCall === GET_FORECASTER || errorCall === GET_FORECASTER_LIST),
    isLoadingForecaster: isForecasterRequesting || isIndicesRequesting,
    errorMessage: hasError,
  };
};
