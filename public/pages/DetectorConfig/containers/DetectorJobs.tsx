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
