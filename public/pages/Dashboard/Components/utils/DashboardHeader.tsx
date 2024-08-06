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

import React from 'react';
import {
  EuiSmallButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiTitle,
} from '@elastic/eui';
import {
  PLUGIN_NAME,
  APP_PATH,
} from '../../../../utils/constants';
import { useLocation } from 'react-router-dom';
import { constructHrefWithDataSourceId, getDataSourceFromURL } from '../../../../pages/utils/helpers';
export interface DashboardHeaderProps {
  hasDetectors: boolean;
}

export const DashboardHeader = (props: DashboardHeaderProps) => {
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;
  const createDetectorUrl = `${PLUGIN_NAME}#` + constructHrefWithDataSourceId(APP_PATH.CREATE_DETECTOR, dataSourceId, false);

  return (
    <EuiPageHeader>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>Real-time dashboard</h1>
          </EuiTitle>
        </EuiFlexItem>
        {props.hasDetectors ? (
          <EuiFlexItem grow={false}>
            <EuiSmallButton
              fill
              href={createDetectorUrl}
              data-test-subj="add_detector"
            >
              Create detector
            </EuiSmallButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPageHeader>
  );
};
