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
import { EuiButton, EuiEmptyPrompt, EuiIcon } from '@elastic/eui';
import { Fragment } from 'react';
import { DETECTOR_INIT_FAILURES } from '../../../DetectorDetail/utils/constants';

export interface DetectorUnknownStateProps {
  onSwitchToConfiguration(): void;
  onStartDetector(): void;
}

export const DetectorUnknownState = (props: DetectorUnknownStateProps) => {
  return (
    <EuiEmptyPrompt
      style={{ maxWidth: '75%' }}
      title={
        <div>
          <EuiIcon type="alert" size="l" color="danger" />

          <h2>The detector is in unknown state</h2>
        </div>
      }
      body={
        <Fragment>
          <p>{`${DETECTOR_INIT_FAILURES.UNKNOWN_EXCEPTION.actionItem}`}</p>
        </Fragment>
      }
      actions={[
        <EuiButton
          color="primary"
          fill
          onClick={props.onSwitchToConfiguration}
          style={{ width: '250px' }}
        >
          View detector configuration
        </EuiButton>,
        <EuiButton onClick={props.onStartDetector} style={{ width: '200px' }}>
          Restart detector
        </EuiButton>,
      ]}
    />
  );
};
