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

import { EuiButton, EuiButtonProps } from '@elastic/eui';
import React, { Fragment } from 'react';
import {
  getAlertingCreateMonitorLink,
  getAlertingMonitorListLink,
} from '../../../../utils/utils';
import { Monitor } from '../../../../models/interfaces';

export interface AlertsButtonProps extends EuiButtonProps {
  monitor?: Monitor;
  detectorId: string;
  detectorName: string;
  detectorInterval: number;
  unit: string;
  resultIndex?: string;
}

export const AlertsButton = (props: AlertsButtonProps) => {
  return (
    <Fragment>
      {props.monitor ? (
        <EuiButton
          href={`${getAlertingMonitorListLink()}/${props.monitor.id}`}
          {...props}
        >
          Edit alert settings
        </EuiButton>
      ) : (
        <EuiButton
          href={`${getAlertingCreateMonitorLink(
            props.detectorId,
            props.detectorName,
            props.detectorInterval,
            props.unit.toUpperCase(),
            props.resultIndex
          )}`}
          {...props}
        >
          Set up alerts
        </EuiButton>
      )}
    </Fragment>
  );
};
