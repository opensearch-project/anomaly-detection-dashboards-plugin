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

import {
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLoadingSpinner,
  EuiButtonEmpty,
  EuiOverlayMask,
  EuiBadge,
} from '@elastic/eui';
import { get, isEmpty } from 'lodash';
import React, { useEffect, Fragment, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { useSelector, useDispatch } from 'react-redux';
import { darkModeEnabled } from '../../../utils/opensearchDashboardsUtils';
import { AppState } from '../../../redux/reducers';
import {
  getDetector,
  startHistoricalDetector,
  stopHistoricalDetector,
} from '../../../redux/reducers/ad';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { getDetectorStateDetails } from '../../DetectorDetail/utils/helpers';
import { HistoricalRangeModal } from '../components/HistoricalRangeModal';
import {
  HISTORICAL_DETECTOR_RESULT_REFRESH_RATE,
  HISTORICAL_HC_DETECTOR_RESULT_REFRESH_RATE,
  HISTORICAL_DETECTOR_STOP_THRESHOLD,
} from '../utils/constants';
import { CoreStart } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { AnomalyHistory } from '../../DetectorResults/containers/AnomalyHistory';
import {
  getHistoricalRangeString,
  getErrorMessage,
} from '../../../utils/utils';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { EmptyHistoricalDetectorResults } from '../components/EmptyHistoricalDetectorResults';
import { HistoricalDetectorCallout } from '../components/HistoricalDetectorCallout';

interface HistoricalDetectorResultsProps extends RouteComponentProps {
  detectorId: string;
}

export function HistoricalDetectorResults(
  props: HistoricalDetectorResultsProps
) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const isDark = darkModeEnabled();
  const dispatch = useDispatch();
  const detectorId: string = get(props, 'match.params.detectorId', '');

  const adState = useSelector((state: AppState) => state.ad);
  const allDetectors = adState.detectors;
  const errorGettingDetectors = adState.errorMessage;
  const detector = allDetectors[detectorId];
  const [taskId, setTaskId] = useState<string>(get(detector, 'taskId', ''));

  const [isStoppingDetector, setIsStoppingDetector] = useState<boolean>(false);

  const [historicalRangeModalOpen, setHistoricalRangeModalOpen] = useState<
    boolean
  >(false);

  const isHCDetector = !isEmpty(get(detector, 'categoryField', []));
  const historicalEnabled = !isEmpty(get(detector, 'detectionDateRange'));

  const waitForMs = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const fetchDetector = async () => {
    try {
      await dispatch(getDetector(detectorId));
    } catch {}
  };

  // Try to get the detector initially
  useEffect(() => {
    if (detectorId) {
      fetchDetector();
    }
  }, []);

  // If detector is initializing or running: keep fetching every 10 seconds to quickly update state/results/percentage bar, etc.
  useEffect(() => {
    if (
      detector?.taskState === DETECTOR_STATE.RUNNING ||
      detector?.taskState === DETECTOR_STATE.INIT
    ) {
      const intervalId = setInterval(
        fetchDetector,
        isHCDetector
          ? HISTORICAL_HC_DETECTOR_RESULT_REFRESH_RATE
          : HISTORICAL_DETECTOR_RESULT_REFRESH_RATE
      );
      return () => {
        clearInterval(intervalId);
      };
    }
    setTaskId(get(detector, 'taskId', ''));
  }, [detector]);

  const startHistoricalTask = async (startTime: number, endTime: number) => {
    try {
      dispatch(startHistoricalDetector(props.detectorId, startTime, endTime))
        .then((response: any) => {
          setTaskId(get(response, 'response._id'));
          core.notifications.toasts.addSuccess(
            `Successfully started the historical analysis`
          );
        })
        .catch((err: any) => {
          core.notifications.toasts.addDanger(
            prettifyErrorMessage(
              getErrorMessage(
                err,
                'There was a problem starting the historical analysis'
              )
            )
          );
        });
    } finally {
      setHistoricalRangeModalOpen(false);
    }
  };

  // We query the task state 5s after making the stop detector call. If the task is still running,
  // then it is assumed there was an error stopping this task / historical analysis.
  // TODO: change this from await dispatch() to using .then(), .catch(), etc.
  const onStopDetector = async () => {
    try {
      setIsStoppingDetector(true);
      await dispatch(stopHistoricalDetector(detectorId));
      await waitForMs(HISTORICAL_DETECTOR_STOP_THRESHOLD);
      dispatch(getDetector(detectorId)).then((response: any) => {
        if (get(response, 'response.curState') !== DETECTOR_STATE.DISABLED) {
          throw 'please try again.';
        } else {
          core.notifications.toasts.addSuccess(
            'Successfully stopped the historical analysis'
          );
        }
      });
    } catch (err) {
      core.notifications.toasts.addDanger(
        `There was a problem stopping the historical analysis: ` +
          prettifyErrorMessage(getErrorMessage(err, ''))
      );
      fetchDetector();
    } finally {
      setIsStoppingDetector(false);
    }
  };

  const callout = (
    <HistoricalDetectorCallout
      detector={detector}
      onStopDetector={onStopDetector}
      isStoppingDetector={isStoppingDetector}
    />
  );

  return (
    <Fragment>
      <EuiPage style={{ marginTop: '16px', paddingTop: '0px' }}>
        <EuiPageBody>
          <EuiSpacer size="l" />
          {!isEmpty(detector) && !historicalEnabled ? (
            <EmptyHistoricalDetectorResults
              detector={detector}
              onConfirm={startHistoricalTask}
            />
          ) : !isEmpty(detector) ? (
            <Fragment>
              {historicalRangeModalOpen ? (
                <EuiOverlayMask>
                  <HistoricalRangeModal
                    detector={detector}
                    onClose={() => setHistoricalRangeModalOpen(false)}
                    onConfirm={startHistoricalTask}
                    isEdit={true}
                  />
                </EuiOverlayMask>
              ) : null}
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiTitle size="m">
                    <div>
                      {'Historical analysis'}&nbsp;
                      {getDetectorStateDetails(
                        detector,
                        isHCDetector,
                        true,
                        isStoppingDetector
                      )}
                    </div>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexGroup direction="row" gutterSize="xs">
                  <EuiFlexItem grow={false} style={{ marginLeft: '16px' }}>
                    <EuiBadge
                      iconType="calendar"
                      iconSide="left"
                      color="#D4DAE5"
                    >
                      {getHistoricalRangeString(detector)}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ marginTop: '0px' }}>
                    <EuiButtonEmpty
                      iconType="gear"
                      iconSide="left"
                      size="xs"
                      onClick={() => {
                        setHistoricalRangeModalOpen(true);
                      }}
                    >
                      Modify historical analysis range
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
                {!isEmpty(callout) ? (
                  <div>
                    <EuiSpacer size="m" />
                    <EuiFlexItem
                      grow={false}
                      style={{
                        marginLeft: '12px',
                        marginRight: '12px',
                      }}
                    >
                      {callout}
                    </EuiFlexItem>
                    <EuiSpacer size="xs" />
                  </div>
                ) : null}
                <EuiFlexItem>
                  {
                    // Setting the key as the current task ID. If the key changes (new task created),
                    // React will remount the component, clearing any locally saved state.
                  }
                  <AnomalyHistory
                    key={taskId}
                    detector={detector}
                    monitor={undefined}
                    isFeatureDataMissing={false}
                    isHistorical={true}
                    taskId={taskId}
                    isNotSample={true}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          ) : (
            <EuiLoadingSpinner size="xl" />
          )}
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
}
