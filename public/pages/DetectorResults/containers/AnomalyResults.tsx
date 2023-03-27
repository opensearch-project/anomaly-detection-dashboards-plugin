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
  //@ts-ignore
  EuiBasicTable,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiCallOut,
  EuiButton,
  EuiProgress,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLoadingSpinner,
  EuiTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import { get, isEmpty } from 'lodash';
import React, { useEffect, Fragment, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { AppState } from '../../../redux/reducers';
import {
  BREADCRUMBS,
  FEATURE_DATA_POINTS_WINDOW,
  MISSING_FEATURE_DATA_SEVERITY,
} from '../../../utils/constants';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { AnomalyResultsLiveChart } from './AnomalyResultsLiveChart';
import { AnomalyHistory } from './AnomalyHistory';
import { DetectorStateDetails } from './DetectorStateDetails';
import {
  getDetectorInitializationInfo,
  IS_INIT_OVERTIME_FIELD,
  INIT_DETAILS_FIELD,
  INIT_ERROR_MESSAGE_FIELD,
  INIT_ACTION_ITEM_FIELD,
} from '../utils/utils';
import { getDetector } from '../../../redux/reducers/ad';
import { MIN_IN_MILLI_SECS } from '../../../../server/utils/constants';
import {
  getInitFailureMessageAndActionItem,
  getDetectorStateDetails,
} from '../../DetectorDetail/utils/helpers';
import moment from 'moment';
import { DateRange, UNITS, toDuration } from '../../../models/interfaces';
import {
  getFeatureDataPointsForDetector,
  buildParamsForGetAnomalyResultsWithDateRange,
  getFeatureMissingSeverities,
  getFeatureDataMissingMessageAndActionItem,
  FEATURE_DATA_CHECK_WINDOW_OFFSET,
} from '../../utils/anomalyResultUtils';
import { getDetectorResults } from '../../../redux/reducers/anomalyResults';
import { detectorIsSample } from '../../Overview/utils/helpers';
import { SampleIndexDetailsCallout } from '../../Overview/components/SampleIndexDetailsCallout/SampleIndexDetailsCallout';
import { CoreStart } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { DEFAULT_SHINGLE_SIZE } from '../../../utils/constants';

interface AnomalyResultsProps extends RouteComponentProps {
  detectorId: string;
  onStartDetector(): void;
  onStopDetector(): void;
  onSwitchToConfiguration(): void;
  onSwitchToHistorical(): void;
}

export function AnomalyResults(props: AnomalyResultsProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const detectorId = props.detectorId;
  const detector = useSelector(
    (state: AppState) => state.ad.detectors[detectorId]
  );

  useEffect(() => {
    core.chrome.setBreadcrumbs([
      BREADCRUMBS.ANOMALY_DETECTOR,
      BREADCRUMBS.DETECTORS,
      { text: detector ? detector.name : '' },
    ]);
    dispatch(getDetector(detectorId));
  }, []);

  const fetchDetector = async () => {
    dispatch(getDetector(detectorId));
  };

  useEffect(() => {
    if (detector && detector.curState === DETECTOR_STATE.INIT) {
      const id = setInterval(fetchDetector, MIN_IN_MILLI_SECS);
      return () => {
        clearInterval(id);
      };
    }
  }, [detector]);

  useEffect(() => {
    if (
      detector &&
      (detector.curState === DETECTOR_STATE.INIT ||
        detector.curState === DETECTOR_STATE.RUNNING)
    ) {
      checkLatestFeatureDataPoints();
      const id = setInterval(checkLatestFeatureDataPoints, MIN_IN_MILLI_SECS);
      return () => {
        clearInterval(id);
      };
    }
  }, [detector]);

  useEffect(() => {
    if (detector && detectorIsSample(detector)) {
      setIsSampleDetector(true);
      setSampleIndexName(detector.indices[0]);
    } else {
      setIsSampleDetector(false);
    }
  }, [detector]);

  const monitors = useSelector((state: AppState) => state.alerting.monitors);
  const monitor = get(monitors, `${detectorId}.0`);

  const [featureMissingSeverity, setFeatureMissingSeverity] =
    useState<MISSING_FEATURE_DATA_SEVERITY>();

  const [isSampleDetector, setIsSampleDetector] = useState<boolean>(false);

  const [sampleIndexName, setSampleIndexName] = useState<string>('');

  const [featureNamesAtHighSev, setFeatureNamesAtHighSev] = useState(
    [] as string[]
  );

  // If the detector is returning undefined estimated minutes left, then it
  // is still performing the cold start.
  const isPerformingColdStart =
    detector &&
    detector.curState === DETECTOR_STATE.INIT &&
    detector.initProgress &&
    detector.initProgress.estimatedMinutesLeft === undefined;

  const isDetectorRunning =
    detector && detector.curState === DETECTOR_STATE.RUNNING;

  const isDetectorPaused =
    detector &&
    detector.curState === DETECTOR_STATE.DISABLED &&
    !detector.enabled &&
    detector.enabledTime &&
    detector.disabledTime;

  const isDetectorUpdated =
    // @ts-ignore
    isDetectorPaused && detector.lastUpdateTime > detector.disabledTime;

  const isDetectorInitializing =
    detector && detector.curState === DETECTOR_STATE.INIT;

  const isDetectorMissingData = featureMissingSeverity
    ? (isDetectorInitializing || isDetectorRunning) &&
      featureMissingSeverity > MISSING_FEATURE_DATA_SEVERITY.GREEN
    : undefined;

  const initializationInfo = featureMissingSeverity
    ? getDetectorInitializationInfo(detector)
    : undefined;

  const isInitOvertime = get(initializationInfo, IS_INIT_OVERTIME_FIELD);
  const initDetails = get(initializationInfo, INIT_DETAILS_FIELD, {});
  const initErrorMessage = get(initDetails, INIT_ERROR_MESSAGE_FIELD, '');
  const initActionItem = get(initDetails, INIT_ACTION_ITEM_FIELD, '');

  const isDetectorFailed =
    detector &&
    (detector.curState === DETECTOR_STATE.INIT_FAILURE ||
      detector.curState === DETECTOR_STATE.UNEXPECTED_FAILURE);

  const detectorIntervalInMin = get(
    detector,
    'detectionInterval.period.interval',
    1
  );

  const isInitializingNormally =
    isDetectorInitializing &&
    isInitOvertime != undefined &&
    !isInitOvertime &&
    isDetectorMissingData != undefined &&
    !isDetectorMissingData;

  const isHCDetector = !isEmpty(get(detector, 'categoryField', []));

  // ran during componentDidMount and componentDidUpdate
  const checkLatestFeatureDataPoints = async () => {
    let windowDelayInMinutes = 0;
    if (detector.windowDelay !== undefined) {
      const windowDelay = detector.windowDelay.period;
      const windowDelayUnit = get(windowDelay, 'unit', UNITS.MINUTES);

      // current time minus window delay
      const windowDelayInterval = get(windowDelay, 'interval', 0);
      windowDelayInMinutes =
        windowDelayInterval * toDuration(windowDelayUnit).asMinutes();
    }

    // The query in this function uses data start/end time. So we should consider window delay
    let adjustedCurrentTime = moment().subtract(
      windowDelayInMinutes,
      'minutes'
    );

    // check from FEATURE_DATA_POINTS_WINDOW + FEATURE_DATA_CHECK_WINDOW_OFFSET (currently 5) intervals to now
    const featureDataPointsRange = {
      startDate: Math.max(
        // clone since subtract mutates the original moment that we need to use as endData later
        adjustedCurrentTime
          .clone()
          .subtract(
            (FEATURE_DATA_POINTS_WINDOW + FEATURE_DATA_CHECK_WINDOW_OFFSET) *
              detectorIntervalInMin,
            'minutes'
          )
          .valueOf(),
        //@ts-ignore
        detector.enabledTime
      ),
      endDate: adjustedCurrentTime.valueOf(),
    } as DateRange;

    const params = buildParamsForGetAnomalyResultsWithDateRange(
      featureDataPointsRange.startDate,
      featureDataPointsRange.endDate
    );

    try {
      const resultIndex = get(detector, 'resultIndex', '');
      const detectorResultResponse = await dispatch(
        getDetectorResults(detectorId, params, false, resultIndex, true)
      );
      const featuresData = get(
        detectorResultResponse,
        'response.featureResults',
        []
      );
      const featureDataPoints = getFeatureDataPointsForDetector(
        detector,
        featuresData,
        detectorIntervalInMin,
        featureDataPointsRange,
        true
      );

      const featureMissingSeveritiesMap =
        getFeatureMissingSeverities(featureDataPoints);
      let highestSeverity = MISSING_FEATURE_DATA_SEVERITY.GREEN;
      let featuresAtHighestSev = [] as string[];
      featureMissingSeveritiesMap.forEach((featureNames, severity, map) => {
        if (severity > highestSeverity) {
          highestSeverity = severity;
          featuresAtHighestSev = featureNames;
        }
      });

      setFeatureMissingSeverity(highestSeverity);
      setFeatureNamesAtHighSev(featuresAtHighestSev);
    } catch (err) {
      console.error(
        `Failed to get anomaly results for ${detectorId} during getting latest feature data points`,
        err
      );
    }
  };

  const getCalloutTitle = () => {
    if (isDetectorUpdated) {
      return 'The detector configuration has changed since it was last stopped.';
    }
    if (isDetectorMissingData) {
      return get(
        getFeatureDataMissingMessageAndActionItem(
          featureMissingSeverity,
          featureNamesAtHighSev,
          isHCDetector
        ),
        'message',
        ''
      );
    }
    if (isPerformingColdStart) {
      return (
        <div>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiLoadingSpinner
              size="l"
              style={{
                marginLeft: '4px',
                marginRight: '8px',
                marginBottom: '8px',
              }}
            />
            <EuiText>
              <p>
                Attempting to initialize the detector with historical data.
                This initializing process takes approximately 1 minute if
                you have data in each of the last{' '}
                {32+get(detector, 'shingleSize', DEFAULT_SHINGLE_SIZE)}{' '} consecutive intervals.
              </p>
            </EuiText>
          </EuiFlexGroup>
        </div>
      );
    }
    if (isInitializingNormally) {
      return 'The detector is being initialized based on the latest configuration changes.';
    }
    if (isInitOvertime) {
      return `Detector initialization is not complete because ${initErrorMessage}.`;
    }
    if (isDetectorFailed) {
      return `The detector is not initialized because ${get(
        getInitFailureMessageAndActionItem(
          //@ts-ignore
          detector.stateError
        ),
        'cause',
        ''
      )}.`;
    }
  };
  const getCalloutColor = () => {
    if (
      isDetectorFailed ||
      featureMissingSeverity === MISSING_FEATURE_DATA_SEVERITY.RED
    ) {
      return 'danger';
    }
    if (
      isInitOvertime ||
      isDetectorUpdated ||
      featureMissingSeverity === MISSING_FEATURE_DATA_SEVERITY.YELLOW
    ) {
      return 'warning';
    }
    if (isInitializingNormally) {
      return 'primary';
    }
  };

  const getInitProgressMessage = () => {
    return detector &&
      isDetectorInitializing &&
      !isHCDetector &&
      get(detector, 'initProgress.estimatedMinutesLeft')
      ? `The detector needs ${get(
          detector,
          'initProgress.estimatedMinutesLeft'
        )} minutes for initializing. If your data stream is not continuous, it may take even longer. `
      : '';
  };

  const getCalloutContent = () => {
    return isDetectorUpdated ? (
      <p>
        Restart the detector to see accurate anomalies based on configuration
        changes.
      </p>
    ) : isDetectorMissingData ? (
      <p>
        {getInitProgressMessage()}
        {get(
          getFeatureDataMissingMessageAndActionItem(
            featureMissingSeverity,
            featureNamesAtHighSev,
            isHCDetector
          ),
          'actionItem',
          ''
        )}
      </p>
    ) : isPerformingColdStart ? null : isInitializingNormally ? (
      <p>
        {getInitProgressMessage()}After the initialization is complete, you will
        see the anomaly results based on your latest configuration changes.
      </p>
    ) : isInitOvertime ? (
      <p>{`${getInitProgressMessage()}${initActionItem}`}</p>
    ) : (
      // detector has failure
      <p>{`${get(
        getInitFailureMessageAndActionItem(
          //@ts-ignore
          detector.stateError
        ),
        'actionItem',
        ''
      )}`}</p>
    );
  };
  return (
    <Fragment>
      <EuiPage style={{ marginTop: '16px', paddingTop: '0px' }}>
        <EuiPageBody>
          <EuiSpacer size="l" />
          {
            <Fragment>
              {isDetectorRunning ||
              isDetectorPaused ||
              isDetectorInitializing ||
              isDetectorFailed ? (
                <Fragment>
                  {isSampleDetector ? (
                    <Fragment>
                      {' '}
                      <SampleIndexDetailsCallout
                        indexName={sampleIndexName}
                      />{' '}
                      <EuiSpacer size="l" />{' '}
                    </Fragment>
                  ) : null}
                  {isDetectorUpdated ||
                  // don't show miss feature callout for HC detector
                  (isDetectorMissingData && !isHCDetector) ||
                  isInitializingNormally ||
                  (isInitOvertime && !isHCDetector) ||
                  isDetectorFailed ? (
                    <EuiCallOut
                      title={getCalloutTitle()}
                      color={getCalloutColor()}
                      iconType={
                        isPerformingColdStart
                          ? ''
                          : isInitializingNormally
                          ? 'iInCircle'
                          : 'alert'
                      }
                      style={{ marginBottom: '20px' }}
                    >
                      {getCalloutContent()}
                      {isPerformingColdStart ? null : isDetectorInitializing &&
                        detector.initProgress &&
                        !isHCDetector ? (
                        <div>
                          <EuiFlexGroup alignItems="center">
                            <EuiFlexItem
                              style={{ maxWidth: '20px', marginRight: '5px' }}
                            >
                              <EuiText>
                                {
                                  //@ts-ignore
                                  detector.initProgress.percentageStr
                                }
                              </EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiProgress
                                //@ts-ignore
                                value={detector.initProgress.percentageStr.replace(
                                  '%',
                                  ''
                                )}
                                max={100}
                                color="primary"
                                size="xs"
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer size="l" />
                        </div>
                      ) : null}
                      <EuiButton
                        onClick={props.onSwitchToConfiguration}
                        color={
                          featureMissingSeverity ===
                            MISSING_FEATURE_DATA_SEVERITY.RED ||
                          isDetectorFailed
                            ? 'danger'
                            : isInitOvertime ||
                              isDetectorUpdated ||
                              featureMissingSeverity ===
                                MISSING_FEATURE_DATA_SEVERITY.YELLOW
                            ? 'warning'
                            : 'primary'
                        }
                        style={{ marginRight: '8px' }}
                      >
                        View detector configuration
                      </EuiButton>
                      {isDetectorUpdated || isDetectorFailed ? (
                        <EuiButton
                          color={isDetectorFailed ? 'danger' : 'warning'}
                          onClick={props.onStartDetector}
                          style={{ marginLeft: '8px' }}
                        >
                          Restart detector
                        </EuiButton>
                      ) : null}
                    </EuiCallOut>
                  ) : null}
                  {detector ? (
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      style={{ marginBottom: '18px' }}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiTitle
                          size="m"
                          data-test-subj="realTimeResultsHeader"
                        >
                          {
                            <h1>
                              {'Real-time results'}{' '}
                              {getDetectorStateDetails(
                                detector,
                                isHCDetector,
                                false,
                                false
                              )}
                            </h1>
                          }
                        </EuiTitle>
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="stopAndStartDetectorButton"
                          onClick={
                            detector?.enabled
                              ? props.onStopDetector
                              : props.onStartDetector
                          }
                          disabled={false}
                        >
                          {detector?.enabled
                            ? 'Stop detector'
                            : 'Start detector'}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : null}
                  <AnomalyResultsLiveChart detector={detector} />
                  <EuiSpacer size="l" />
                  <AnomalyHistory
                    detector={detector}
                    monitor={monitor}
                    isFeatureDataMissing={isDetectorMissingData}
                    isNotSample={true}
                    isHistorical={false}
                  />
                </Fragment>
              ) : detector ? (
                <Fragment>
                  <DetectorStateDetails
                    detectorId={detectorId}
                    onStartDetector={props.onStartDetector}
                    onSwitchToConfiguration={props.onSwitchToConfiguration}
                  />
                </Fragment>
              ) : null}
            </Fragment>
          }
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
}
