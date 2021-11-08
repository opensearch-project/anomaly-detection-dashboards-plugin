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

import React, { useEffect } from 'react';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { DetectorStopped } from '../components/DetectorState/DetectorStopped';
import { DetectorFeatureRequired } from '../components/DetectorState/DetectorFeatureRequired';
import { DetectorUnknownState } from '../components/DetectorState/DetectorUnknownState';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../../redux/reducers';
import { getDetector } from '../../../redux/reducers/ad';

export interface DetectorStateDetailsProp {
  detectorId: string;
  onStartDetector(): void;
  onSwitchToConfiguration(): void;
}

export const DetectorStateDetails = (props: DetectorStateDetailsProp) => {
  const dispatch = useDispatch();
  const detector = useSelector(
    (state: AppState) => state.ad.detectors[props.detectorId]
  );
  const currentState = detector.curState;

  useEffect(() => {
    dispatch(getDetector(props.detectorId));
  }, []);

  switch (currentState) {
    case DETECTOR_STATE.DISABLED:
      return <DetectorStopped onStartDetector={props.onStartDetector} />;
    case DETECTOR_STATE.FEATURE_REQUIRED:
      return (
        <DetectorFeatureRequired
          detector={detector}
          onSwitchToConfiguration={props.onSwitchToConfiguration}
        />
      );
    default:
      // ideally we shoul not reach here
      console.log('Unknown detector state', currentState);
      return (
        <DetectorUnknownState
          onStartDetector={props.onStartDetector}
          onSwitchToConfiguration={props.onSwitchToConfiguration}
        />
      );
  }
};
