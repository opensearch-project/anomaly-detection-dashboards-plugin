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
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiTitle,
} from '@elastic/eui';
import { PLUGIN_NAME, APP_PATH, DATA_SOURCE_ID } from '../../../../utils/constants';
import { useLocation } from 'react-router-dom';
export interface DashboardHeaderProps {
  hasDetectors: boolean;
}

export const DashboardHeader = (props: DashboardHeaderProps) => {
  const location = useLocation();
  const dataSourceId = new URLSearchParams(location.search).get(DATA_SOURCE_ID) || '';

  // Constructing the URL with conditional dataSourceId
  const createDetectorUrl = `${PLUGIN_NAME}#${APP_PATH.CREATE_DETECTOR}${dataSourceId ? `?dataSourceId=${dataSourceId}` : ''}`;

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
            <EuiButton
              fill
              href={createDetectorUrl}
              data-test-subj="add_detector"
            >
              Create detector
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPageHeader>
  );
};
