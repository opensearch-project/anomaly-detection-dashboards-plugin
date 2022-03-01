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

import React, { Fragment } from 'react';
import { get, isEmpty } from 'lodash';
import { DETECTOR_INIT_FAILURES } from './constants';
import { DETECTOR_STATE_COLOR } from '../../utils/constants';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { Detector } from '../../../models/interfaces';
import { EuiHealth } from '@elastic/eui';
import moment from 'moment';
import { CatIndex } from '../../../../server/models/types';

export const getInitFailureMessageAndActionItem = (error: string): object => {
  const failureDetails = Object.values(DETECTOR_INIT_FAILURES);
  const failureDetail = failureDetails.find((failure) =>
    error.includes(failure.keyword)
  );
  if (!failureDetail) {
    return DETECTOR_INIT_FAILURES.UNKNOWN_EXCEPTION;
  }
  return failureDetail;
};

export const getDetectorStateDetails = (
  detector: Detector,
  isHCDetector: boolean,
  isHistorical: boolean,
  isStoppingHistorical: boolean = false,
  className?: string
) => {
  const state = isHistorical
    ? get(detector, 'taskState', DETECTOR_STATE.DISABLED)
    : get(detector, 'curState', DETECTOR_STATE.DISABLED);

  return (
    <Fragment>
      {isStoppingHistorical ? (
        <EuiHealth
          color={DETECTOR_STATE_COLOR.DISABLED}
          data-test-subj="detectorStateStopping"
        >
          {'Stopping...'}
        </EuiHealth>
      ) : isHistorical && detector && state === DETECTOR_STATE.RUNNING ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.RUNNING}
          data-test-subj="detectorStateRunning"
        >
          Running
        </EuiHealth>
      ) : detector && detector.enabled && state === DETECTOR_STATE.RUNNING ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.RUNNING}
          data-test-subj="detectorStateRunning"
        >
          Running since{' '}
          {detector.enabledTime
            ? moment(detector.enabledTime).format('MM/DD/YY h:mm A')
            : '?'}
        </EuiHealth>
      ) : detector.enabled && state === DETECTOR_STATE.INIT ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.INIT}
          data-test-subj="detectorStateInitializing"
        >
          {detector.initProgress?.estimatedMinutesLeft &&
          !isHCDetector &&
          !isHistorical
            ? //@ts-ignore
              `Initializing (${detector.initProgress.percentageStr} complete)`
            : 'Initializing'}
        </EuiHealth>
      ) : state === DETECTOR_STATE.INIT_FAILURE ||
        state === DETECTOR_STATE.UNEXPECTED_FAILURE ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.INIT_FAILURE}
          data-test-subj="detectorStateInitializingFailure"
        >
          Initialization failure
        </EuiHealth>
      ) : state === DETECTOR_STATE.DISABLED ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.DISABLED}
          data-test-subj="detectorStateStopped"
        >
          {detector.disabledTime
            ? `Stopped at ${moment(detector.disabledTime).format(
                'MM/DD/YY h:mm A'
              )}`
            : 'Detector is stopped'}
        </EuiHealth>
      ) : state === DETECTOR_STATE.FEATURE_REQUIRED ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.FEATURE_REQUIRED}
          data-test-subj="detectorStateFeatureRequired"
        >
          Feature required to start the detector
        </EuiHealth>
      ) : state === DETECTOR_STATE.INIT ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.INIT}
          data-test-subj="detectorStateInitializing"
        >
          Initializing
        </EuiHealth>
      ) : state === DETECTOR_STATE.FINISHED ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.FINISHED}
          data-test-subj="detectorStateFinished"
        >
          Finished
        </EuiHealth>
      ) : state === DETECTOR_STATE.FAILED ? (
        <EuiHealth
          className={className}
          color={DETECTOR_STATE_COLOR.FAILED}
          data-test-subj="detectorStateFailed"
        >
          Failed
        </EuiHealth>
      ) : (
        ''
      )}
    </Fragment>
  );
};

export const containsIndex = (index: string, indices: CatIndex[]) => {
  let containsIndex = false;
  if (!isEmpty(indices)) {
    indices.forEach((catIndex: CatIndex) => {
      if (get(catIndex, 'index', '') == index) {
        containsIndex = true;
      }
    });
  }
  return containsIndex;
};
