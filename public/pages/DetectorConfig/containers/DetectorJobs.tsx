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

/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { EuiFlexGrid, EuiFlexItem, EuiFormRow, EuiText } from '@elastic/eui';
import React from 'react';
import { get, isEmpty } from 'lodash';
import { ConfigCell } from '../../../components/ConfigCell';
import { getHistoricalRangeString } from '../../../utils/utils';
import { Detector } from '../../../models/interfaces';
import { getDetectorStateDetails } from '../../DetectorDetail/utils/helpers';

interface DetectorJobsProps {
  detector: Detector;
}

export const DetectorJobs = (props: DetectorJobsProps) => {
  const isHCDetector = !isEmpty(get(props, 'detector.categoryField', []));
  const historicalEnabled = !isEmpty(get(props, 'detector.detectionDateRange'));

  return (
    <ContentPanel
      title="Detector jobs"
      titleSize="s"
      panelStyles={{ margin: '0px' }}
      actions={[]}
    >
      <EuiFlexGrid columns={2} gutterSize="s" style={{ border: 'none' }}>
        <EuiFlexItem>
          <ConfigCell
            title="Real-time detector"
            //@ts-ignore
            description={
              <p className="enabled">
                {getDetectorStateDetails(
                  props.detector,
                  isHCDetector,
                  false,
                  false,
                  'enabled'
                )}
              </p>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Historical analysis detector">
            <EuiText>
              <p className="enabledLongerWidth">
                {historicalEnabled
                  ? getHistoricalRangeString(props.detector)
                  : 'Disabled'}
              </p>
            </EuiText>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ContentPanel>
  );
};
