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
import { EuiCallOut, EuiLink, EuiIcon } from '@elastic/eui';
import { getAlertingMonitorListLink } from '../../../../utils/utils';

interface MonitorCalloutProps {
  monitorId: string;
  monitorName: string;
}

export const MonitorCallout = (props: MonitorCalloutProps) => {
  return (
    <EuiCallOut
      title="The monitor associated with this detector will not receive any anomaly results"
      color="warning"
      iconType="alert"
    >
      <p>
        Once a detector is stopped, monitor{' '}
        <EuiLink
          href={`${getAlertingMonitorListLink()}/${props.monitorId}`}
          target="_blank"
        >
          {props.monitorName} <EuiIcon type="popout" size="s" />
        </EuiLink>{' '}
        associated with this detector will not receive any anomaly results to
        generate alerts.
      </p>
    </EuiCallOut>
  );
};
