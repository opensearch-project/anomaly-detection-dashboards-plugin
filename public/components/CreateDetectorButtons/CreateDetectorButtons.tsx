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

import { EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import React from 'react';
import { APP_PATH, DATA_SOURCE_ID, PLUGIN_NAME } from '../../utils/constants';
import { useLocation } from 'react-router-dom';
import { getDataSourcePlugin } from '../../services';

export const CreateDetectorButtons = () => {
  const location = useLocation();
  const dataSourceId = new URLSearchParams(location.search).get(DATA_SOURCE_ID) || '';
  const dataSourceEnabled = getDataSourcePlugin().dataSourceEnabled;

  // Constructing the URL with dataSourceEnabled flag and conditional dataSourceId
  const createDetectorUrl = `${PLUGIN_NAME}#` + 
    (dataSourceEnabled ? 
      `${APP_PATH.CREATE_DETECTOR}${dataSourceId ? `?dataSourceId=${dataSourceId}` : ''}` :
      `${APP_PATH.CREATE_DETECTOR}`
    );

  const sampleDetectorUrl = `${PLUGIN_NAME}#` + 
    (dataSourceEnabled ? 
      `${APP_PATH.OVERVIEW}${dataSourceId ? `?dataSourceId=${dataSourceId}` : ''}` :
      `${APP_PATH.OVERVIEW}`
    );
  
  return (
    <EuiFlexGroup direction="row" gutterSize="m" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          style={{ width: '200px' }}
          href={sampleDetectorUrl}
          data-test-subj="sampleDetectorButton"
        >
          Try a sample detector
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          style={{ width: '200px' }}
          fill
          href={createDetectorUrl}
          data-test-subj="createDetectorButton"
        >
          Create detector
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
