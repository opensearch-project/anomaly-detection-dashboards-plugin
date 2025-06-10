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

import { EuiFlexGroup, EuiFlexItem, EuiSmallButton } from '@elastic/eui';
import React from 'react';
import { APP_PATH, FORECASTING_FEATURE_NAME } from '../../utils/constants';
import { useLocation } from 'react-router-dom';
import { constructHrefWithDataSourceId, getDataSourceFromURL } from '../../pages/utils/helpers';

export const CreateForecasterButtons = () => {
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;

  const createForecasterUrl = `${FORECASTING_FEATURE_NAME}#` + constructHrefWithDataSourceId(`${APP_PATH.CREATE_FORECASTER}`, dataSourceId, false);

  return (
    <EuiFlexGroup direction="row" gutterSize="m" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiSmallButton
          style={{ width: '200px' }}
          fill
          href={createForecasterUrl}
          data-test-subj="createForecasterButton"
          iconType="plusInCircle"
        >
          Create forecaster
        </EuiSmallButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
