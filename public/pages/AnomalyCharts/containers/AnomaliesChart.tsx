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

import dateMath from '@elastic/datemath';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTitle,
} from '@elastic/eui';
import { get, orderBy } from 'lodash';
import moment, { DurationInputArg2 } from 'moment';
import React, { useState } from 'react';
import { EntityAnomalySummaries } from '../../../../server/models/interfaces';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { useDelayedLoader } from '../../../hooks/useDelayedLoader';
import {
  Anomalies,
  AnomalyData,
  DateRange,
  Detector,
  Monitor,
} from '../../../models/interfaces';
import { generateAnomalyAnnotations } from '../../utils/anomalyResultUtils';
import { AlertsButton } from '../components/AlertsButton/AlertsButton';
import { AnomalyDetailsChart } from '../containers/AnomalyDetailsChart';
import {
  AnomalyHeatmapChart,
  HeatmapCell,
  HeatmapDisplayOption,
} from '../containers/AnomalyHeatmapChart';
import {
  getAnomalyGradeWording,
  getConfidenceWording,
  getFeatureBreakdownWording,
  getFeatureDataWording,
  getHCTitle,
} from '../utils/anomalyChartUtils';
import {
  DATE_PICKER_QUICK_OPTIONS,
  INITIAL_ANOMALY_SUMMARY,
} from '../utils/constants';
import { AnomalyOccurrenceChart } from './AnomalyOccurrenceChart';
import { FeatureBreakDown } from './FeatureBreakDown';
import { convertTimestampToString } from '../../../utils/utils';

export interface AnomaliesChartProps {
  onDateRangeChange(
    startDate: number,
    endDate: number,
    dateRangeOption?: string
  ): void;
  onZoomRangeChange(startDate: number, endDate: number): void;
  title: string;
  bucketizedAnomalies: boolean;
  anomalySummary: any;
  dateRange: DateRange;
  isLoading: boolean;
  showAlerts?: boolean;
  isNotSample?: boolean;
  detector: Detector;
  monitor?: Monitor;
  children: React.ReactNode | React.ReactNode[];
  isHCDetector?: boolean;
  isHistorical?: boolean;
  detectorCategoryField?: string[];
  onHeatmapCellSelected?(heatmapCell: HeatmapCell): void;
  onDisplayOptionChanged?(heatmapDisplayOption: HeatmapDisplayOption): void;
  selectedHeatmapCell?: HeatmapCell;
  newDetector?: Detector;
  zoomRange?: DateRange;
  anomalyAndFeatureResults: Anomalies[] | undefined;
  heatmapDisplayOption?: HeatmapDisplayOption;
  entityAnomalySummaries?: EntityAnomalySummaries[];
  selectedCategoryFields?: any[];
  handleCategoryFieldsChange(selectedOptions: any[]): void;
}

export const AnomaliesChart = React.memo((props: AnomaliesChartProps) => {
  const [datePickerRange, setDatePickerRange] = useState({
    start: props.isHistorical
      ? convertTimestampToString(props.dateRange.startDate)
      : 'now-7d',
    end: props.isHistorical
      ? convertTimestampToString(props.dateRange.endDate)
      : 'now',
  });

  // for each time series of results, get the anomalies, ignoring feature data
  let anomalyResults = [] as AnomalyData[][];
  get(props, 'anomalyAndFeatureResults', []).forEach(
    (anomalyAndFeatureResult: Anomalies) => {
      anomalyResults.push(anomalyAndFeatureResult.anomalies);
    }
  );

  const handleDateRangeChange = (startDate: number, endDate: number) => {
    props.onDateRangeChange(startDate, endDate);
    props.onZoomRangeChange(startDate, endDate);
  };

  const showLoader = useDelayedLoader(props.isLoading);

  const handleDatePickerDateRangeChange = (
    start: string,
    end: string,
    refresh?: boolean
  ) => {
    if (start && end) {
      const startTime: moment.Moment | undefined = dateMath.parse(start);
      if (startTime) {
        const endTime: moment.Moment | undefined =
          start === end && start.startsWith('now/')
            ? moment(startTime)
                .add(1, start.slice(start.length - 1) as DurationInputArg2)
                .subtract(1, 'milliseconds')
            : dateMath.parse(end);
        if (endTime) {
          if (
            !refresh &&
            !props.bucketizedAnomalies &&
            startTime.valueOf() >= props.dateRange.startDate &&
            endTime.valueOf() <= props.dateRange.endDate
          ) {
            props.onZoomRangeChange(startTime.valueOf(), endTime.valueOf());
          } else {
            handleDateRangeChange(startTime.valueOf(), endTime.valueOf());
          }
        }
      }
    }
  };

  const handleDatePickerRangeChange = (start: number, end: number) => {
    setDatePickerRange({
      start: moment(start).format(),
      end: moment(end).format(),
    });
  };

  const datePicker = () => (
    <EuiSuperDatePicker
      isLoading={props.isLoading}
      start={datePickerRange.start}
      end={datePickerRange.end}
      showUpdateButton={props.isNotSample}
      onTimeChange={({ start, end, isInvalid, isQuickSelection }) => {
        setDatePickerRange({ start: start, end: end });
        handleDatePickerDateRangeChange(start, end);
      }}
      onRefresh={({ start, end, refreshInterval }) => {
        handleDatePickerDateRangeChange(start, end, true);
      }}
      isPaused={true}
      commonlyUsedRanges={DATE_PICKER_QUICK_OPTIONS}
    />
  );

  const setUpAlertsButton = () => (
    <AlertsButton
      monitor={props.monitor}
      detectorId={get(props.detector, 'id', '')}
      detectorName={get(props.detector, 'name', '')}
      detectorInterval={get(
        props.detector,
        'detectionInterval.period.interval',
        1
      )}
      unit={get(props.detector, 'detectionInterval.period.unit', 'Minutes')}
    />
  );

  const alertsActionsWithDatePicker = () => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem style={{ marginRight: '8px' }}>{datePicker()}</EuiFlexItem>

        <EuiFlexItem style={{ marginLeft: '0px' }}>
          {setUpAlertsButton()}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const hasValidHCProps = () => {
    return (
      props.isHCDetector &&
      props.onHeatmapCellSelected &&
      props.detectorCategoryField &&
      // For Non-Sample HC detector case, aka realtime HC detector(showAlert == true),
      // we use anomaly summaries data to render heatmap
      // we must have function onDisplayOptionChanged and entityAnomalySummaries defined
      // so that heatmap can work as expected.
      (props.showAlerts !== true ||
        (props.showAlerts &&
          props.onDisplayOptionChanged &&
          props.entityAnomalySummaries))
    );
  };

  return (
    <React.Fragment>
      <ContentPanel
        title={props.title}
        actions={
          props.showAlerts ? alertsActionsWithDatePicker() : datePicker()
        }
      >
        <EuiFlexGroup direction="column">
          {hasValidHCProps() ? (
            <EuiFlexGroup style={{ padding: '20px' }}>
              <EuiFlexItem style={{ margin: '0px' }}>
                <div
                  style={{
                    width: '100%',
                    opacity: showLoader ? 0.2 : 1,
                  }}
                >
                  {props.isLoading ? (
                    <EuiFlexGroup
                      justifyContent="spaceAround"
                      style={{ paddingTop: '150px' }}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiLoadingChart size="xl" mono />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : (
                    [
                      <AnomalyHeatmapChart
                        detectorId={get(props.detector, 'id', '')}
                        detectorName={get(props.detector, 'name', '')}
                        detectorTaskProgress={get(
                          props.detector,
                          'taskProgress',
                          0
                        )}
                        isHistorical={props.isHistorical}
                        dateRange={props.dateRange}
                        // Raw anomalies only passed here for building the plot data for sample
                        // results, so we will only pass a single time series here,
                        // since we don't currently support sub-aggregation and multi-time-series
                        // for sample data charts. See comments in AnomalyHeatmapChart for details
                        anomalies={get(anomalyResults, 0, [])}
                        isLoading={props.isLoading}
                        showAlerts={props.showAlerts}
                        monitor={props.monitor}
                        detectorInterval={get(
                          props.detector,
                          'detectionInterval.period.interval'
                        )}
                        unit={get(
                          props.detector,
                          'detectionInterval.period.unit'
                        )}
                        //@ts-ignore
                        onHeatmapCellSelected={props.onHeatmapCellSelected}
                        entityAnomalySummaries={props.entityAnomalySummaries}
                        onDisplayOptionChanged={props.onDisplayOptionChanged}
                        heatmapDisplayOption={props.heatmapDisplayOption}
                        isNotSample={props.isNotSample}
                        // Category fields in HC results are always sorted alphabetically. To make all chart
                        // wording consistent with the returned results, we sort the given category
                        // fields in alphabetical order as well.
                        categoryField={orderBy(props.detectorCategoryField, [
                          (categoryField) => categoryField.toLowerCase(),
                        ])}
                        selectedCategoryFields={props.selectedCategoryFields}
                        handleCategoryFieldsChange={
                          props.handleCategoryFieldsChange
                        }
                      />,
                      props.isNotSample !== true
                        ? [
                            <EuiSpacer size="m" />,
                            <AnomalyOccurrenceChart
                              title={
                                props.selectedHeatmapCell &&
                                props.isHCDetector ? (
                                  <div>
                                    <EuiTitle
                                      size="s"
                                      className="preview-title"
                                    >
                                      <h4>Sample anomaly occurrences</h4>
                                    </EuiTitle>
                                    <EuiSpacer size="s" />
                                    <EuiTitle size="s">
                                      <h3>
                                        <b>
                                          {props.selectedHeatmapCell
                                            ? getHCTitle(
                                                props.selectedHeatmapCell
                                                  .entityList
                                              )
                                            : '-'}
                                        </b>
                                      </h3>
                                    </EuiTitle>
                                    <EuiSpacer size="s" />
                                  </div>
                                ) : (
                                  '-'
                                )
                              }
                              dateRange={props.dateRange}
                              onDateRangeChange={props.onDateRangeChange}
                              onZoomRangeChange={props.onZoomRangeChange}
                              anomalies={anomalyResults}
                              bucketizedAnomalies={false}
                              anomalySummary={props.anomalySummary}
                              isLoading={props.isLoading}
                              anomalyGradeSeriesName={getAnomalyGradeWording(
                                props.isNotSample
                              )}
                              confidenceSeriesName={getConfidenceWording(
                                props.isNotSample
                              )}
                              showAlerts={props.showAlerts}
                              isNotSample={props.isNotSample}
                              detector={props.detector}
                              isHCDetector={props.isHCDetector}
                              isHistorical={props.isHistorical}
                              selectedHeatmapCell={props.selectedHeatmapCell}
                            />,
                            <EuiSpacer size="m" />,
                            <FeatureBreakDown
                              title={getFeatureBreakdownWording(
                                props.isNotSample
                              )}
                              //@ts-ignore
                              detector={props.newDetector}
                              //@ts-ignore
                              anomalyAndFeatureResults={
                                props.anomalyAndFeatureResults
                              }
                              annotations={generateAnomalyAnnotations(
                                anomalyResults
                              )}
                              isLoading={props.isLoading}
                              //@ts-ignore
                              dateRange={props.zoomRange}
                              featureDataSeriesName={getFeatureDataWording(
                                props.isNotSample
                              )}
                              isHCDetector={props.isHCDetector}
                              selectedHeatmapCell={props.selectedHeatmapCell}
                              // Disable missing feature data annotations if viewing historical results
                              showFeatureMissingDataPointAnnotation={
                                !props.isHistorical
                              }
                            />,
                          ]
                        : null,
                    ]
                  )}
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <AnomalyDetailsChart
              dateRange={props.dateRange}
              onDateRangeChange={handleDateRangeChange}
              onZoomRangeChange={props.onZoomRangeChange}
              anomalies={anomalyResults}
              bucketizedAnomalies={props.bucketizedAnomalies}
              anomalySummary={props.anomalySummary}
              isLoading={props.isLoading}
              anomalyGradeSeriesName={getAnomalyGradeWording(props.isNotSample)}
              confidenceSeriesName={getConfidenceWording(props.isNotSample)}
              showAlerts={props.showAlerts}
              isNotSample={props.isNotSample}
              detector={props.detector}
              monitor={props.monitor}
              isHCDetector={props.isHCDetector}
              isHistorical={props.isHistorical}
              onDatePickerRangeChange={handleDatePickerRangeChange}
            />
          )}
        </EuiFlexGroup>
        <div style={{ paddingTop: '10px', margin: '0px -20px -30px -20px' }}>
          {props.children}
        </div>
      </ContentPanel>
    </React.Fragment>
  );
});
