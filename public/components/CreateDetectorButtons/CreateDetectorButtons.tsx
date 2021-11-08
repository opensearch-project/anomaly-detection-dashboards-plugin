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
import { APP_PATH, PLUGIN_NAME } from '../../utils/constants';

export const CreateDetectorButtons = () => {
  return (
    <EuiFlexGroup direction="row" gutterSize="m" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          style={{ width: '200px' }}
          href={`${PLUGIN_NAME}#${APP_PATH.OVERVIEW}`}
          data-test-subj="sampleDetectorButton"
        >
          Try a sample detector
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          style={{ width: '200px' }}
          fill
          href={`${PLUGIN_NAME}#${APP_PATH.CREATE_DETECTOR}`}
          data-test-subj="createDetectorButton"
        >
          Create detector
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
