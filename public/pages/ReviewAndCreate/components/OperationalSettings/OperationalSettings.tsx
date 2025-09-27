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
import { get } from 'lodash';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';

import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { ConfigCell } from '../../../../components/ConfigCell';
import { toStringConfigCell } from '../../utils/helpers';
import { Detector } from '../../../../models/interfaces';

interface OperationalSettingsProps {
  detector: Detector;
}

export const OperationalSettings: React.FC<OperationalSettingsProps> = ({
  detector,
}) => {
  const detectionInterval = get(detector, 'detectionInterval', undefined);
  const windowDelay = get(detector, 'windowDelay', undefined);
  const frequency = get(detector, 'frequency', undefined);
  const history = get(detector, 'history', undefined);

  const formatMinutesOrDefault = (value: any): string => {
    const formatted = toStringConfigCell(value);
    return formatted === '-' ? '0 minutes' : formatted;
  };

  const detectionIntervalDescription = formatMinutesOrDefault(detectionInterval);
  const windowDelayDescription = formatMinutesOrDefault(windowDelay);
  const frequencyDescription = (() => {
    const formatted = toStringConfigCell(frequency);
    return formatted === '-' ? detectionIntervalDescription : formatted;
  })();
  const historyDescription =
    history !== undefined && history !== null ? `${history} intervals` : '-';

  return (
    <ContentPanel title="Operational setting" titleSize="s">
      <EuiFlexGrid columns={2} gutterSize="l" style={{ border: 'none' }}>
        <EuiFlexItem>
          <ConfigCell
            title="Detector interval"
            description={detectionIntervalDescription}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ConfigCell
            title="Window delay"
            description={windowDelayDescription}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ConfigCell
            title="Frequency"
            description={frequencyDescription}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ConfigCell title="History" description={historyDescription} />
        </EuiFlexItem>
      </EuiFlexGrid>
    </ContentPanel>
  );
};
