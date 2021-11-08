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
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { Fragment } from 'react';

export interface DetectorStoppedProps {
  onStartDetector(): void;
}

export const DetectorStopped = (props: DetectorStoppedProps) => {
  return (
    <EuiEmptyPrompt
      style={{ maxWidth: '75%' }}
      title={<h2>The detector is stopped</h2>}
      body={
        <Fragment>
          <p>Start the detector to see anomalies.</p>
        </Fragment>
      }
      actions={[
        <EuiButton
          fill
          onClick={props.onStartDetector}
          style={{ width: '200px' }}
        >
          Start detector
        </EuiButton>,
      ]}
    />
  );
};
