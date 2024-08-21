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
import { EuiSmallButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { Fragment } from 'react';
import { Detector } from '../../../../models/interfaces';

export interface DetectorFeatureRequiredProps {
  detector: Detector;
  onSwitchToConfiguration(): void;
}

export const DetectorFeatureRequired = (
  props: DetectorFeatureRequiredProps
) => {
  return (
    <EuiEmptyPrompt
      style={{ maxWidth: '75%' }}
      title={<h2>Features are required to run a detector</h2>}
      body={
        <Fragment>
          <EuiText size="s">
            <p>
              Specify index fields that you want to find anomalies for by defining
              features. Once you define the features, you can preview your
              anomalies from a sample feature output.
            </p>
          </EuiText>
        </Fragment>
      }
      actions={[
        <EuiSmallButton
          color="primary"
          fill
          onClick={props.onSwitchToConfiguration}
          style={{ width: '250px' }}
        >
          View detector configuration
        </EuiSmallButton>,
      ]}
    />
  );
};
