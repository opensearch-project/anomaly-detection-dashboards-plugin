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

/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import React, { Fragment } from 'react';
import { get } from 'lodash';
import { DETECTOR_INIT_FAILURES } from './constants';
import { DETECTOR_STATE_COLOR } from '../../utils/constants';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { Detector } from '../../../models/interfaces';
import { EuiHealth } from '@elastic/eui';
import moment from 'moment';

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
        <EuiHealth color={DETECTOR_STATE_COLOR.DISABLED}>
          {'Stopping...'}
        </EuiHealth>
      ) : isHistorical && detector && state === DETECTOR_STATE.RUNNING ? (
        <EuiHealth className={className} color={DETECTOR_STATE_COLOR.RUNNING}>
          Running
        </EuiHealth>
      ) : detector && detector.enabled && state === DETECTOR_STATE.RUNNING ? (
        <EuiHealth className={className} color={DETECTOR_STATE_COLOR.RUNNING}>
          Running since{' '}
          {detector.enabledTime
            ? moment(detector.enabledTime).format('MM/DD/YY h:mm A')
            : '?'}
        </EuiHealth>
      ) : detector.enabled && state === DETECTOR_STATE.INIT ? (
        <EuiHealth className={className} color={DETECTOR_STATE_COLOR.INIT}>
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
        >
          Initialization failure
        </EuiHealth>
      ) : state === DETECTOR_STATE.DISABLED ? (
        <EuiHealth className={className} color={DETECTOR_STATE_COLOR.DISABLED}>
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
        >
          Feature required to start the detector
        </EuiHealth>
      ) : state === DETECTOR_STATE.INIT ? (
        <EuiHealth className={className} color={DETECTOR_STATE_COLOR.INIT}>
          Initializing
        </EuiHealth>
      ) : state === DETECTOR_STATE.FINISHED ? (
        <EuiHealth className={className} color={DETECTOR_STATE_COLOR.FINISHED}>
          Finished
        </EuiHealth>
      ) : state === DETECTOR_STATE.FAILED ? (
        <EuiHealth className={className} color={DETECTOR_STATE_COLOR.FAILED}>
          Failed
        </EuiHealth>
      ) : (
        ''
      )}
    </Fragment>
  );
};
