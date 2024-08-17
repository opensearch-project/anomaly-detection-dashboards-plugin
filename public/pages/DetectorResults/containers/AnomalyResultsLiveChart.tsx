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

import React, { useEffect, useState, Dispatch } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiBadge,
  EuiSmallButton,
  EuiTitle,
  EuiCallOut,
  EuiStat,
  EuiLoadingChart,
} from '@elastic/eui';
import moment from 'moment';
import {
  Chart,
  Axis,
  BarSeries,
  niceTimeFormatter,
  Settings,
  LineAnnotation,
  RectAnnotation,
  AnnotationDomainType,
  LineAnnotationDatum,
  ScaleType,
} from '@elastic/charts';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { useDelayedLoader } from '../../../hooks/useDelayedLoader';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../../redux/reducers';
import { Detector, AnomalyData } from '../../../models/interfaces';
import {
  getLiveAnomalyResults,
  prepareDataForLiveChart,
  getQueryParamsForLiveAnomalyResults,
} from '../../utils/anomalyResultUtils';
import { get } from 'lodash';
import {
  CHART_FIELDS,
  LIVE_CHART_CONFIG,
  CHART_COLORS,
} from '../../AnomalyCharts/utils/constants';
import { LIVE_ANOMALY_CHART_THEME } from '../utils/constants';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { dateFormatter, getDataSourceFromURL } from '../../utils/helpers';
import { darkModeEnabled } from '../../../utils/opensearchDashboardsUtils';
import { EuiIcon } from '@elastic/eui';
import { formatAnomalyNumber } from '../../../../server/utils/helpers';
import { getDetectorLiveResults } from '../../../redux/reducers/liveAnomalyResults';
import { useLocation } from 'react-router-dom';

interface AnomalyResultsLiveChartProps {
  detector: Detector;
}

export const AnomalyResultsLiveChart = (
  props: AnomalyResultsLiveChartProps
) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;

  const [firstLoading, setFirstLoading] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const isLoading = useSelector(
    (state: AppState) => state.liveAnomalyResults.requesting
  );
  const liveAnomalyResults = useSelector(
    (state: AppState) => state.liveAnomalyResults
  );
  const detectionInterval = get(
    props.detector,
    'detectionInterval.period.interval',
    1
  );
  const startDateTime = moment().subtract(
    detectionInterval * LIVE_CHART_CONFIG.MONITORING_INTERVALS,
    'minutes'
  );
  const endDateTime = moment();
  const anomalies = !firstLoading
    ? prepareDataForLiveChart(
        liveAnomalyResults.liveAnomalies,
        {
          startDate: startDateTime.valueOf(),
          endDate: endDateTime.valueOf(),
        },
        get(props.detector, 'detectionInterval.period.interval', 1)
      )
    : [];

  const annotations = liveAnomalyResults
    ? get(liveAnomalyResults, 'liveAnomalies', [])
        //@ts-ignore
        .filter((anomaly: AnomalyData) => anomaly.anomalyGrade > 0)
        .map((anomaly: AnomalyData) => ({
          coordinates: {
            x0: anomaly.startTime + (anomaly.endTime - anomaly.startTime) * 0.5,
            x1: anomaly.endTime - (anomaly.endTime - anomaly.startTime) * 0.5,
            y0: 0,
            y1: anomaly.anomalyGrade,
          },
          details: `${JSON.stringify(anomaly)}`,
        }))
    : [];

  const timeFormatter = niceTimeFormatter([
    startDateTime.valueOf(),
    endDateTime.valueOf(),
  ]);

  useEffect(() => {
    const resultIndex = get(props, 'detector.resultIndex', '');
    async function loadLiveAnomalyResults(
      dispatch: Dispatch<any>,
      detectorId: string,
      detectionInterval: number,
      intervals: number,
      resultIndex: string
    ) {
      try {
        const queryParams = getQueryParamsForLiveAnomalyResults(
          detectionInterval,
          intervals
        );
        await dispatch(
          getDetectorLiveResults(
            detectorId,
            dataSourceId,
            queryParams,
            false,
            resultIndex,
            true
          )
        );
      } catch (err) {
        console.error(
          `Failed to get live anomaly result for detector ${detectorId}`,
          err
        );
      } finally {
        setFirstLoading(false);
      }
    }

    if (props.detector.curState === DETECTOR_STATE.RUNNING) {
      loadLiveAnomalyResults(
        dispatch,
        props.detector.id,
        detectionInterval,
        LIVE_CHART_CONFIG.MONITORING_INTERVALS,
        resultIndex
      );
      const intervalId = setInterval(() => {
        getLiveAnomalyResults(
          dispatch,
          props.detector.id,
          dataSourceId,
          detectionInterval,
          LIVE_CHART_CONFIG.MONITORING_INTERVALS,
          resultIndex,
          true
        );
      }, LIVE_CHART_CONFIG.REFRESH_INTERVAL_IN_SECONDS);
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [props.detector]);

  const showLoader = useDelayedLoader(isLoading);

  const liveAnomaliesDescription = () => (
    <EuiText className={'anomaly-distribution-subtitle'}>
      View anomaly results during the last{' '}
      {LIVE_CHART_CONFIG.MONITORING_INTERVALS} intervals (
      {LIVE_CHART_CONFIG.MONITORING_INTERVALS *
        props.detector.detectionInterval.period.interval}{' '}
      minutes).
    </EuiText>
  );

  const nowLineStyle = {
    line: {
      strokeWidth: 1,
      stroke: '#3F3F3F',
      dash: [1, 2],
      opacity: 0.8,
    },
  };

  const nowAnnotation = (values: any[]): LineAnnotationDatum[] => {
    return values.map((value, index) => ({
      dataValue: value,
      header: 'Now',
      details: moment(value).format('MM/DD/YY h:mm A'),
    }));
  };

  const latestAnomalyGrade = get(liveAnomalyResults, 'liveAnomalies', []).find(
    (anomaly) => anomaly.anomalyGrade > 0
  );

  const fullScreenButton = () => (
    <EuiSmallButton
      onClick={() => setIsFullScreen((isFullScreen) => !isFullScreen)}
      iconType={isFullScreen ? 'exit' : 'fullScreen'}
      aria-label="View full screen"
      data-test-subj="anomalyResultsFullScreenButton"
    >
      {isFullScreen ? 'Exit full screen' : 'View full screen'}
    </EuiSmallButton>
  );

  const customAnomalyTooltip = (details?: string) => {
    const anomaly = details ? JSON.parse(details) : undefined;
    return (
      <div>
        <EuiText size="xs">
          <EuiIcon type="alert" /> <b>Anomaly</b>
          {anomaly ? (
            <p>
              Anomaly grade: {get(anomaly, 'anomalyGrade', '')} <br />
              Confidence: {get(anomaly, 'confidence', '')} <br />
              Start time: {dateFormatter(get(anomaly, 'startTime'))}
              <br />
              End time: {dateFormatter(get(anomaly, 'endTime'))}
            </p>
          ) : null}
        </EuiText>
      </div>
    );
  };

  return (
    <React.Fragment>
      <ContentPanel
        title={
          <EuiTitle size="s">
            <h3>
              Live anomalies{' '}
              <EuiBadge
                color={
                  props.detector.curState === DETECTOR_STATE.RUNNING
                    ? '#DB1374'
                    : '#DDD'
                }
              >
                Live
              </EuiBadge>
            </h3>
          </EuiTitle>
        }
        subTitle={
          props.detector.curState === DETECTOR_STATE.RUNNING
            ? liveAnomaliesDescription()
            : null
        }
        actions={[fullScreenButton()]}
        contentPanelClassName={isFullScreen ? 'full-screen' : undefined}
      >
        {props.detector.curState === DETECTOR_STATE.RUNNING ? (
          <EuiFlexGroup
            justifyContent="spaceBetween"
            style={{
              height: isFullScreen ? '400px' : '200px',
              opacity: showLoader ? 0.2 : 1,
            }}
          >
            {firstLoading ? (
              <EuiFlexGroup
                justifyContent="spaceAround"
                style={{ paddingTop: '150px' }}
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingChart size="xl" mono />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexItem grow={true} style={{ marginRight: '0px' }}>
                {get(liveAnomalyResults, 'liveAnomalies', []).length === 0 ||
                !latestAnomalyGrade ? (
                  <EuiCallOut
                    color="success"
                    size="s"
                    title={`No anomalies found during the last ${
                      LIVE_CHART_CONFIG.MONITORING_INTERVALS
                    } intervals (${
                      LIVE_CHART_CONFIG.MONITORING_INTERVALS *
                      props.detector.detectionInterval.period.interval
                    } minutes).`}
                    style={{
                      width: '97%', // ensure width reaches NOW line
                    }}
                  />
                ) : null}
                <Chart>
                  <Settings theme={LIVE_ANOMALY_CHART_THEME} />
                  <LineAnnotation
                    id="annotationNow"
                    domainType={AnnotationDomainType.XDomain}
                    dataValues={nowAnnotation([endDateTime.valueOf(), 1])}
                    style={nowLineStyle}
                    // @ts-ignore
                    marker={'now'}
                  />
                  <RectAnnotation
                    dataValues={annotations || []}
                    id="annotations"
                    style={{
                      stroke: darkModeEnabled()
                        ? CHART_COLORS.DARK_BACKGROUND
                        : CHART_COLORS.LIGHT_BACKGROUND,
                      opacity: 1.0,
                      fill: darkModeEnabled()
                        ? 'red'
                        : CHART_COLORS.ANOMALY_GRADE_COLOR,
                      strokeWidth: 3,
                    }}
                    renderTooltip={customAnomalyTooltip}
                  />
                  <Axis
                    id="bottom"
                    position="bottom"
                    tickFormat={timeFormatter}
                  />
                  <Axis
                    id="left"
                    title={'Anomaly grade'}
                    position="left"
                    domain={{ min: 0, max: 1 }}
                  />
                  <BarSeries
                    id="Anomaly grade"
                    name="Anomaly grade"
                    data={anomalies}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor={CHART_FIELDS.PLOT_TIME}
                    yAccessors={[CHART_FIELDS.ANOMALY_GRADE]}
                  />
                </Chart>
              </EuiFlexItem>
            )}

            <EuiFlexItem grow={false} style={{ marginLeft: '0px' }}>
              <EuiStat
                title={`${get(
                  props.detector,
                  'detectionInterval.period.interval',
                  ''
                )} ${
                  get(props.detector, 'detectionInterval.period.interval', 0) >
                  1
                    ? get(
                        props.detector,
                        'detectionInterval.period.unit',
                        ''
                      ).toLowerCase()
                    : get(props.detector, 'detectionInterval.period.unit', '')
                        .toLowerCase()
                        .slice(0, -1)
                }`}
                description="Detector interval"
                titleSize="s"
              />
              <EuiStat
                title={
                  latestAnomalyGrade
                    ? formatAnomalyNumber(latestAnomalyGrade.anomalyGrade)
                    : '-'
                }
                description="Latest anomaly grade"
                titleSize="s"
              />
              <EuiStat
                title={
                  latestAnomalyGrade
                    ? formatAnomalyNumber(latestAnomalyGrade.confidence)
                    : '-'
                }
                description="Latest confidence"
                titleSize="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiText>
            {'Not available when the detector ' +
              `${
                props.detector.curState === DETECTOR_STATE.INIT_FAILURE ||
                props.detector.curState === DETECTOR_STATE.UNEXPECTED_FAILURE
                  ? 'initialization has failed.'
                  : `is ${props.detector.curState.toLowerCase()}.`
              }`}
          </EuiText>
        )}
      </ContentPanel>
    </React.Fragment>
  );
};
