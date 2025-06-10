/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { FORECASTER_STATE } from '../../../../../server/utils/constants';
import { Forecaster } from '../../../../models/interfaces';

type InitializingTextProps = {
  curState: FORECASTER_STATE.INIT_TEST | FORECASTER_STATE.INITIALIZING_FORECAST;
  forecaster: Forecaster;
};

export const InitializingText: React.FC<InitializingTextProps> = ({ curState, forecaster }) => {
  const isTest = curState === FORECASTER_STATE.INIT_TEST;
  const text = isTest ? 'test' : 'forecast';

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      // Remove or adjust height if you'd like vertical centering:
      // style={{ minHeight: 200, justifyContent: 'center' }}
    >
      {/* Bar-style spinner with default multi-colors */}
      <EuiFlexItem grow={false}>
        <EuiLoadingChart size="l" mono={false} />
      </EuiFlexItem>

      {/* Slightly smaller gap between spinner and heading */}
      <EuiSpacer size="s" />

      {/* "Initializing test" heading */}
      <EuiFlexItem grow={false}>
        <EuiText textAlign="center">
          {/* Remove default margins for closer spacing */}
          <h2 style={{ margin: 0 }}>Initializing {text}</h2>
        </EuiText>
      </EuiFlexItem>

      {/* Extra-small gap before the description */}
      <EuiSpacer size="xs" />

      {/* Smaller, subdued text for "The test is initializing..." */}
      <EuiFlexItem grow={false}>
        <EuiText textAlign="center" color="subdued" size="s">
          <p style={{ margin: 0 }}>
            The {text} is initializing. This may take 1–2 minutes.
            {forecaster?.history && forecaster?.history > 40 && forecaster?.categoryField && forecaster?.categoryField?.length > 0 
              ? ' Initialization time increases with the number of entities in your data.' 
              : ''}
            {forecaster?.horizon && forecaster?.horizon > 3
              ? ' Longer forecast horizons also require more initialization time.' 
              : ''}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
