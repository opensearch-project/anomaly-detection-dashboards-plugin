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

import { Monitor } from '../../../../models/interfaces';
import { getRandomMonitor } from '../../../../redux/reducers/__tests__/utils';

export const useFetchMonitorInfo = (
  detectorId: string
): { monitor: Monitor | undefined; fetchMonitorError: boolean } => {
  return {
    monitor: getRandomMonitor(detectorId),
    fetchMonitorError: undefined,
  };
};
