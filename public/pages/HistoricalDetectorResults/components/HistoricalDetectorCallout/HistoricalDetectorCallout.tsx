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

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexItem,
  EuiProgress,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { Detector } from '../../../../models/interfaces';
import { DETECTOR_STATE } from '../../../../../server/utils/constants';

interface HistoricalDetectorCalloutProps {
  detector: Detector;
  onStopDetector(): void;
  isStoppingDetector: boolean;
}

export const HistoricalDetectorCallout = (
  props: HistoricalDetectorCalloutProps
) => {
  if (!props.detector || !props.detector.taskState) {
    return null;
  }
  const runningProgress = props.detector.taskProgress
    ? Math.round(props.detector.taskProgress * 100)
    : undefined;
  const runningProgressPctStr = runningProgress
    ? runningProgress.toString() + '%'
    : '';

  if (props.isStoppingDetector) {
    return (
      <EuiCallOut
        title={
          <div>
            <EuiFlexGroup direction="row" gutterSize="xs">
              <EuiLoadingSpinner size="l" style={{ marginRight: '8px' }} />
              <EuiText>
                <p>Stopping the historical analysis</p>
              </EuiText>
            </EuiFlexGroup>
          </div>
        }
        color="primary"
      />
    );
  }
  switch (props.detector.taskState) {
    case DETECTOR_STATE.DISABLED:
      return (
        <EuiCallOut
          title="The historical analysis is stopped"
          color="primary"
          iconType="alert"
        />
      );
    case DETECTOR_STATE.INIT:
      return (
        <EuiCallOut
          title={
            <div>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiLoadingSpinner size="l" style={{ marginRight: '8px' }} />
                <EuiText>
                  <p>Initializing the historical analysis.</p>
                </EuiText>
              </EuiFlexGroup>
            </div>
          }
          color="primary"
        />
      );
    case DETECTOR_STATE.RUNNING:
      return (
        <EuiCallOut
          title={
            <div>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiLoadingSpinner
                  size="m"
                  style={{ marginRight: '8px', marginTop: '4px' }}
                />
                <EuiText>
                  <p>Running the historical analysis</p>
                </EuiText>
              </EuiFlexGroup>
              {runningProgress ? (
                <EuiFlexGroup
                  direction="row"
                  gutterSize="xs"
                  alignItems="center"
                  style={{ marginTop: '6px', marginLeft: '20px' }}
                >
                  <EuiFlexItem>
                    <EuiText>{runningProgressPctStr}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem style={{ marginLeft: '-150px' }}>
                    <EuiProgress
                      //@ts-ignore
                      value={runningProgress}
                      max={100}
                      color="primary"
                      size="s"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : null}
              <EuiSpacer size="s" />
              <EuiFlexItem grow={false} style={{ marginLeft: '22px' }}>
                <EuiButton fill={false} onClick={() => props.onStopDetector()}>
                  Stop historical analysis
                </EuiButton>
              </EuiFlexItem>
            </div>
          }
          color="primary"
        />
      );
    case DETECTOR_STATE.FAILED:
      return (
        <EuiCallOut
          title={<EuiText>{props.detector.taskError}</EuiText>}
          iconType="alert"
          color="danger"
        ></EuiCallOut>
      );
    case DETECTOR_STATE.UNEXPECTED_FAILURE:
      return (
        <EuiCallOut
          title={
            <EuiText>
              The historical analysis has failed unexpectedly. Try restarting
              the detector.
            </EuiText>
          }
          iconType="alert"
          color="danger"
        ></EuiCallOut>
      );
    default:
      return null;
  }
};
