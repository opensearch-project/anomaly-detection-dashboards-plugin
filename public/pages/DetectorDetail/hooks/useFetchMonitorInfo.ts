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
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Monitor } from '../../../models/interfaces';
import { AppState } from '../../../redux/reducers';
import { searchMonitors } from '../../../redux/reducers/alerting';

//A hook which gets AD monitor.
export const useFetchMonitorInfo = (
  detectorId: string
):
{
  monitor: Monitor | undefined;
  fetchMonitorError: boolean;
  isLoadingMonitor: boolean
} => {
  const dispatch = useDispatch();
  useEffect(() => {
    const fetchAdMonitors = async () => {
      await dispatch(searchMonitors());
    };
    fetchAdMonitors();
  }, []);

  const isMonitorRequesting = useSelector((state: AppState) => state.alerting.requesting);
  const monitors = useSelector((state: AppState) => state.alerting.monitors);
  const monitor = get(monitors, `${detectorId}.0`);
  const hasError = useSelector(
    (state: AppState) => state.alerting.errorMessage
  );
  return {
    monitor: monitor,
    fetchMonitorError: !isEmpty(hasError) && isEmpty(monitor),
    isLoadingMonitor: isMonitorRequesting,
  };
};
