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
  AnnotationDomainTypes,
  Axis,
  Chart,
  LineAnnotation,
  LineSeries,
  niceTimeFormatter,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  XYBrushArea,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingChart,
  EuiStat,
  EuiButtonGroup,
} from '@elastic/eui';
import { get } from 'lodash';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDelayedLoader } from '../../../hooks/useDelayedLoader';
import {
  DateRange,
  Detector,
  Monitor,
  MonitorAlert,
  AnomalyData,
} from '../../../models/interfaces';
import { AppState } from '../../../redux/reducers';
import { searchAlerts } from '../../../redux/reducers/alerting';
import { darkModeEnabled } from '../../../utils/opensearchDashboardsUtils';
import {
  filterWithDateRange,
  prepareDataForChart,
  getAnomalyDataRangeQuery,
  getHistoricalAggQuery,
  parseHistoricalAggregatedAnomalies,
  convertToEntityString,
} from '../../utils/anomalyResultUtils';
import { AlertsFlyout } from '../components/AlertsFlyout/AlertsFlyout';
import {
  AlertsStat,
  AnomalyStatWithTooltip,
} from '../components/AnomaliesStat/AnomalyStat';
import {
  convertAlerts,
  disabledHistoryAnnotations,
  generateAlertAnnotations,
  getAnomalyGradeWording,
  getAnomalyOccurrenceWording,
  getConfidenceWording,
  getLastAnomalyOccurrenceWording,
} from '../utils/anomalyChartUtils';
import {
  ANOMALY_CHART_THEME,
  CHART_FIELDS,
  CHART_COLORS,
  INITIAL_ANOMALY_SUMMARY,
} from '../utils/constants';
import { HeatmapCell } from './AnomalyHeatmapChart';
import { ANOMALY_AGG, MIN_END_TIME, MAX_END_TIME } from '../../utils/constants';
import { MAX_HISTORICAL_AGG_RESULTS } from '../../../utils/constants';
import { searchResults } from '../../../redux/reducers/anomalyResults';
import {
  DAY_IN_MILLI_SECS,
  WEEK_IN_MILLI_SECS,
  DETECTOR_STATE,
} from '../../../../server/utils/constants';
import { ENTITY_COLORS } from '../../DetectorResults/utils/constants';

interface AnomalyDetailsChartProps {
  onDateRangeChange(
    startDate: number,
    endDate: number,
    dateRangeOption?: string
  ): void;
  onZoomRangeChange(startDate: number, endDate: number): void;
  anomalies: AnomalyData[][];
  bucketizedAnomalies: boolean;
  anomalySummary: any;
  dateRange: DateRange;
  isLoading: boolean;
  showAlerts?: boolean;
  isNotSample?: boolean;
  anomalyGradeSeriesName: string;
  confidenceSeriesName: string;
  detector: Detector;
  monitor?: Monitor;
  isHCDetector?: boolean;
  isHistorical?: boolean;
  selectedHeatmapCell?: HeatmapCell;
  onDatePickerRangeChange?(startDate: number, endDate: number): void;
}

export const AnomalyDetailsChart = React.memo(
  (props: AnomalyDetailsChartProps) => {
    const dispatch = useDispatch();
    const [showAlertsFlyout, setShowAlertsFlyout] = useState<boolean>(false);
    const [alertAnnotations, setAlertAnnotations] = useState<any[]>([]);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(false);
    const [totalAlerts, setTotalAlerts] = useState<number | undefined>(
      undefined
    );
    const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
    const [zoomRange, setZoomRange] = useState<DateRange>({
      ...props.dateRange,
    });
    const [zoomedAnomalies, setZoomedAnomalies] = useState<AnomalyData[][]>(
      props.anomalies
    );

    // Aggregated anomalies will always be a single time series (AnomalyData[]).
    // We don't support multiple time series of aggregated anomalies.
    const [aggregatedAnomalies, setAggregatedAnomalies] = useState<
      AnomalyData[]
    >([]);
    const [selectedAggId, setSelectedAggId] = useState<ANOMALY_AGG>(
      ANOMALY_AGG.RAW
    );
    const [disabledAggsMap, setDisabledAggsMap] = useState<{
      [key in ANOMALY_AGG]: boolean;
    }>({
      raw: false,
      day: true,
      week: true,
      month: true,
    });

    const anomalySummary = get(
      props,
      'anomalySummary',
      INITIAL_ANOMALY_SUMMARY
    );

    const DEFAULT_DATE_PICKER_RANGE = {
      start: moment().subtract(7, 'days').valueOf(),
      end: moment().valueOf(),
    };

    const taskId = get(props, 'detector.taskId');
    const taskState = get(props, 'detector.taskState');

    const isRequestingAnomalyResults = useSelector(
      (state: AppState) => state.anomalyResults.requesting
    );

    const resultIndex = get(props, 'detector.resultIndex', '');

    const getAggregatedAnomalies = async () => {
      const anomalyDataRangeQuery = getAnomalyDataRangeQuery(
        zoomRange.startDate,
        zoomRange.endDate,
        taskId
      );
      dispatch(searchResults(anomalyDataRangeQuery, resultIndex, true))
        .then((response: any) => {
          // Only retrieve buckets that are in the anomaly results range. This is so
          // we don't show aggregate results for where there is no data at all
          const dataStartDate = get(
            response,
            `response.aggregations.${MIN_END_TIME}.value`
          );
          const dataEndDate = get(
            response,
            `response.aggregations.${MAX_END_TIME}.value`
          );

          const historicalAggQuery = getHistoricalAggQuery(
            dataStartDate,
            dataEndDate,
            taskId,
            selectedAggId
          );
          dispatch(searchResults(historicalAggQuery, resultIndex, true))
            .then((response: any) => {
              const aggregatedAnomalies = parseHistoricalAggregatedAnomalies(
                response,
                selectedAggId
              );
              setAggregatedAnomalies(aggregatedAnomalies);
            })
            .catch((e: any) => {
              console.error(
                `Error getting aggregated anomaly results for detector ${props.detector?.id}: `,
                e
              );
            });
        })
        .catch((e: any) => {
          console.error(
            `Error getting aggregated anomaly results for detector ${props.detector?.id}: `,
            e
          );
        });
    };

    useEffect(() => {
      setZoomRange(props.dateRange);
    }, [props.dateRange]);

    // Hook to check if any of the aggregation tabs should be disabled or not.
    // Currently support up to 10k results, which = 10k day/week/month aggregate results
    useEffect(() => {
      if (props.isHistorical) {
        const anomalyDataRangeQuery = getAnomalyDataRangeQuery(
          zoomRange.startDate,
          zoomRange.endDate,
          taskId
        );
        dispatch(searchResults(anomalyDataRangeQuery, resultIndex, true))
          .then((response: any) => {
            const dataStartDate = get(
              response,
              `response.aggregations.${MIN_END_TIME}.value`
            );
            const dataEndDate = get(
              response,
              `response.aggregations.${MAX_END_TIME}.value`
            );

            // Note that the monthly interval is approximate. 365 / 12 = 30.41 days, rounded up to 31 means
            // there will be <= 10k monthly-aggregate buckets
            const numDailyBuckets =
              (dataEndDate - dataStartDate) / DAY_IN_MILLI_SECS;
            const numWeeklyBuckets =
              (dataEndDate - dataStartDate) / WEEK_IN_MILLI_SECS;
            const numMonthlyBuckets =
              (dataEndDate - dataStartDate) / (31 * DAY_IN_MILLI_SECS);
            const newAggId =
              (numDailyBuckets > MAX_HISTORICAL_AGG_RESULTS &&
                selectedAggId === ANOMALY_AGG.DAILY) ||
              (numWeeklyBuckets > MAX_HISTORICAL_AGG_RESULTS &&
                selectedAggId === ANOMALY_AGG.WEEKLY) ||
              (numMonthlyBuckets > MAX_HISTORICAL_AGG_RESULTS &&
                selectedAggId === ANOMALY_AGG.MONTHLY)
                ? ANOMALY_AGG.RAW
                : (selectedAggId as ANOMALY_AGG);
            setSelectedAggId(newAggId);
            setDisabledAggsMap({
              raw: false,
              day: numDailyBuckets > MAX_HISTORICAL_AGG_RESULTS,
              week: numWeeklyBuckets > MAX_HISTORICAL_AGG_RESULTS,
              month: numMonthlyBuckets > MAX_HISTORICAL_AGG_RESULTS,
            });
          })
          .catch((e: any) => {
            console.error(
              `Error getting aggregated anomaly results for detector ${props.detector?.id}: `,
              e
            );
          });
      }
    }, [zoomRange]);

    useEffect(() => {
      if (selectedAggId !== ANOMALY_AGG.RAW) {
        getAggregatedAnomalies();
      }
    }, [selectedAggId, zoomRange, props.anomalies]);

    useEffect(() => {
      // Aggregated anomalies are already formatted differently
      // in parseHistoricalAggregatedAnomalies(). Only raw anomalies
      // need to be formatted with prepareDataForChart().
      const anomalies =
        selectedAggId === ANOMALY_AGG.RAW
          ? (prepareDataForChart(props.anomalies, zoomRange) as AnomalyData[][])
          : [aggregatedAnomalies];
      setZoomedAnomalies(anomalies);
      setTotalAlerts(
        filterWithDateRange(alerts, zoomRange, 'startTime').length
      );
    }, [props.anomalies, zoomRange, aggregatedAnomalies, selectedAggId]);

    const handleZoomRangeChange = (start: number, end: number) => {
      // In the HC scenario, we only want to change the local zoom range.
      // We don't want to change the overall date range, since that would auto-de-select
      // any selected heatmap cell, and re-fetch results based on the new date range
      if (props.isHCDetector) {
        setZoomRange({
          startDate: start,
          endDate: end,
        });
        props.onZoomRangeChange(start, end);
      } else {
        props.onDateRangeChange(start, end);
      }
    };

    useEffect(() => {
      async function getMonitorAlerts(
        monitorId: string,
        startDateTime: number,
        endDateTime: number
      ) {
        try {
          setIsLoadingAlerts(true);
          const result = await dispatch(
            searchAlerts(monitorId, startDateTime, endDateTime)
          );
          setIsLoadingAlerts(false);
          setTotalAlerts(get(result, 'response.totalAlerts'));
          const monitorAlerts = convertAlerts(result);
          setAlerts(monitorAlerts);
          const annotations = generateAlertAnnotations(monitorAlerts);
          setAlertAnnotations(annotations);
        } catch (err) {
          console.error(`Failed to get alerts for monitor ${monitorId}`, err);
          setIsLoadingAlerts(false);
        }
      }
      if (
        props.monitor &&
        props.dateRange &&
        // only load alert stats for non HC detector
        props.isHCDetector !== true
      ) {
        getMonitorAlerts(
          props.monitor.id,
          props.dateRange.startDate,
          props.dateRange.endDate
        );
      }
    }, [props.monitor, props.dateRange.startDate, props.dateRange.endDate]);

    const anomalyChartTimeFormatter = niceTimeFormatter([
      zoomRange.startDate,
      zoomRange.endDate,
    ]);

    const isLoading =
      props.isLoading || isLoadingAlerts || isRequestingAnomalyResults;
    const isInitializingHistorical = taskState === DETECTOR_STATE.INIT;
    const showLoader = useDelayedLoader(isLoading);
    const showAggregateResults =
      props.isHistorical && selectedAggId !== ANOMALY_AGG.RAW;
    const multipleTimeSeries = zoomedAnomalies.length > 1;

    return (
      <React.Fragment>
        <EuiFlexGroup style={{ padding: '20px' }}>
          <EuiFlexItem>
            <EuiStat
              data-test-subj="anomalyOccurrenceStat"
              title={isLoading ? '-' : anomalySummary.anomalyOccurrence}
              description={getAnomalyOccurrenceWording(props.isNotSample)}
              titleSize="s"
            />
          </EuiFlexItem>
          {props.isHistorical ? null : (
            <EuiFlexItem>
              <AnomalyStatWithTooltip
                isLoading={isLoading}
                minValue={anomalySummary.minAnomalyGrade}
                maxValue={anomalySummary.maxAnomalyGrade}
                description={getAnomalyGradeWording(props.isNotSample)}
                tooltip="Indicates the extent to which a data point is anomalous. Higher grades indicate more unusual data."
              />
            </EuiFlexItem>
          )}
          {props.isHistorical ? (
            <EuiFlexItem>
              <EuiStat
                title={isLoading ? '-' : anomalySummary.avgAnomalyGrade}
                description={'Average anomaly grade'}
                titleSize="s"
              />
            </EuiFlexItem>
          ) : null}
          {props.isHistorical ? null : (
            <EuiFlexItem>
              <AnomalyStatWithTooltip
                isLoading={isLoading}
                minValue={anomalySummary.minConfidence}
                maxValue={anomalySummary.maxConfidence}
                description={getConfidenceWording(props.isNotSample)}
                tooltip="Indicates the level of confidence in the anomaly result."
              />
            </EuiFlexItem>
          )}
          {props.isHistorical ? null : (
            <EuiFlexItem>
              <EuiStat
                title={isLoading ? '' : anomalySummary.lastAnomalyOccurrence}
                description={getLastAnomalyOccurrenceWording(props.isNotSample)}
                titleSize="s"
              />
            </EuiFlexItem>
          )}
          {props.showAlerts && !props.isHCDetector ? (
            <EuiFlexItem>
              <AlertsStat
                monitor={props.monitor}
                showAlertsFlyout={() => setShowAlertsFlyout(true)}
                totalAlerts={totalAlerts}
                isLoading={isLoading}
              />
            </EuiFlexItem>
          ) : null}
          {props.isHistorical && !props.isHCDetector ? (
            <EuiFlexItem
              grow={false}
              style={{ width: '450px', marginRight: '4px' }}
            >
              <EuiButtonGroup
                type="single"
                legend="Aggregation button group"
                buttonSize="compressed"
                isFullWidth
                options={[
                  {
                    id: ANOMALY_AGG.RAW,
                    label: 'Raw',
                    isDisabled: disabledAggsMap['raw'] || isLoading,
                  },
                  {
                    id: ANOMALY_AGG.DAILY,
                    label: 'Daily max',
                    isDisabled:
                      disabledAggsMap['day'] ||
                      isLoading ||
                      isInitializingHistorical,
                  },
                  {
                    id: ANOMALY_AGG.WEEKLY,
                    label: 'Weekly max',
                    isDisabled:
                      disabledAggsMap['week'] ||
                      isLoading ||
                      isInitializingHistorical,
                  },
                  {
                    id: ANOMALY_AGG.MONTHLY,
                    label: 'Monthly max',
                    isDisabled:
                      disabledAggsMap['month'] ||
                      isLoading ||
                      isInitializingHistorical,
                  },
                ]}
                idSelected={selectedAggId}
                onChange={(aggId) => {
                  setSelectedAggId(aggId as ANOMALY_AGG);
                }}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <div
              style={{
                height: '200px',
                width: '100%',
                opacity: showLoader ? 0.2 : 1,
              }}
            >
              {isLoading ? (
                <EuiFlexGroup
                  justifyContent="spaceAround"
                  style={{ paddingTop: '150px' }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiLoadingChart size="xl" mono />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <Chart key={`${zoomedAnomalies}`}>
                  <Settings
                    showLegend
                    showLegendExtra={false}
                    //TODO: research more why only set this old property will work.
                    showLegendDisplayValue={false}
                    legendPosition={Position.Right}
                    onBrushEnd={(brushArea: XYBrushArea) => {
                      const start = get(
                        brushArea,
                        'x.0',
                        DEFAULT_DATE_PICKER_RANGE.start
                      );
                      const end = get(
                        brushArea,
                        'x.1',
                        DEFAULT_DATE_PICKER_RANGE.end
                      );
                      handleZoomRangeChange(start, end);
                      if (props.onDatePickerRangeChange) {
                        props.onDatePickerRangeChange(start, end);
                      }
                    }}
                    theme={ANOMALY_CHART_THEME}
                    xDomain={
                      showAggregateResults
                        ? undefined
                        : {
                            min: zoomRange.startDate,
                            max: zoomRange.endDate,
                          }
                    }
                  />
                  {(props.isHCDetector && !props.selectedHeatmapCell) ||
                  props.isHistorical ? null : (
                    <RectAnnotation
                      dataValues={disabledHistoryAnnotations(
                        zoomRange,
                        props.detector
                      )}
                      id="anomalyAnnotations"
                      style={{
                        stroke: darkModeEnabled() ? 'red' : '#D5DBDB',
                        strokeWidth: 1,
                        opacity: 0.8,
                        fill: darkModeEnabled() ? 'red' : '#D5DBDB',
                      }}
                    />
                  )}

                  {alertAnnotations ? (
                    <LineAnnotation
                      id="alertAnnotation"
                      domainType={AnnotationDomainTypes.XDomain}
                      dataValues={alertAnnotations}
                      marker={<EuiIcon type="bell" />}
                    />
                  ) : null}
                  {showAggregateResults ? (
                    <Axis id="bottom" position="bottom" />
                  ) : (
                    <Axis
                      id="bottom"
                      position="bottom"
                      tickFormat={anomalyChartTimeFormatter}
                    />
                  )}

                  <Axis
                    id="left"
                    title={
                      props.isHistorical
                        ? 'Anomaly grade'
                        : 'Anomaly grade / Confidence'
                    }
                    position="left"
                    domain={{ min: 0, max: 1 }}
                    showGridLines
                  />
                  {
                    // If historical or multiple selected time series: don't show the confidence line chart
                  }
                  {zoomedAnomalies.map(
                    (anomalySeries: AnomalyData[], index) => {
                      if (props.isHistorical || multipleTimeSeries) {
                        return null;
                      } else {
                        const seriesKey = props.isHCDetector
                          ? `${
                              props.confidenceSeriesName
                              // Extracting entity list from anomaly data
                            } (${convertToEntityString(
                              get(anomalySeries, '0.entity', []),
                              ', '
                            )}`
                          : props.confidenceSeriesName;
                        return (
                          <LineSeries
                            id={seriesKey}
                            name={seriesKey}
                            color={CHART_COLORS.CONFIDENCE_COLOR}
                            xScaleType={ScaleType.Time}
                            yScaleType={ScaleType.Linear}
                            xAccessor={CHART_FIELDS.PLOT_TIME}
                            yAccessors={[CHART_FIELDS.CONFIDENCE]}
                            data={anomalySeries}
                          />
                        );
                      }
                    }
                  )}
                  {zoomedAnomalies.map(
                    (anomalySeries: AnomalyData[], index) => {
                      const seriesKey = props.isHCDetector
                        ? `${
                            props.anomalyGradeSeriesName
                            // Extracting entity list from anomaly data
                          } (${convertToEntityString(
                            get(anomalySeries, '0.entity', []),
                            ', '
                          )})`
                        : props.anomalyGradeSeriesName;

                      return (
                        <LineSeries
                          id={seriesKey}
                          name={seriesKey}
                          color={
                            multipleTimeSeries
                              ? ENTITY_COLORS[index]
                              : CHART_COLORS.ANOMALY_GRADE_COLOR
                          }
                          data={anomalySeries}
                          xScaleType={
                            showAggregateResults
                              ? ScaleType.Ordinal
                              : ScaleType.Time
                          }
                          yScaleType={ScaleType.Linear}
                          xAccessor={
                            showAggregateResults
                              ? CHART_FIELDS.AGG_INTERVAL
                              : CHART_FIELDS.PLOT_TIME
                          }
                          yAccessors={[CHART_FIELDS.ANOMALY_GRADE]}
                        />
                      );
                    }
                  )}
                </Chart>
              )}
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>

        {showAlertsFlyout ? (
          <AlertsFlyout
            detectorId={get(props.detector, 'id', '')}
            detectorName={get(props.detector, 'name', '')}
            detectorInterval={get(
              props.detector,
              'detectionInterval.period.interval',
              1
            )}
            unit={get(
              props.detector,
              'detectionInterval.period.unit',
              'Minutes'
            )}
            monitor={props.monitor}
            onClose={() => setShowAlertsFlyout(false)}
            resultIndex={get(props.detector, 'resultIndex')}
          />
        ) : null}
      </React.Fragment>
    );
  }
);
