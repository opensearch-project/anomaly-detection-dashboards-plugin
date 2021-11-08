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

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import {
  Monitor,
  Detector,
  DateRange,
  AnomalyData,
} from '../../../models/interfaces';
import { AnomalyDetailsChart } from './AnomalyDetailsChart';
import { HeatmapCell } from './AnomalyHeatmapChart';
import { getDateRangeWithSelectedHeatmapCell } from '../utils/anomalyChartUtils';

interface AnomalyOccurrenceChartProps {
  onDateRangeChange(
    startDate: number,
    endDate: number,
    dateRangeOption?: string
  ): void;
  onZoomRangeChange(startDate: number, endDate: number): void;
  title: string | React.ReactNode;
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
}

export const AnomalyOccurrenceChart = React.memo(
  (props: AnomalyOccurrenceChartProps) => {
    const getAnomaliesForChart = () => {
      return props.isHCDetector && !props.selectedHeatmapCell
        ? []
        : props.anomalies;
    };
    const getAnomalySummaryForChart = () => {
      return props.isHCDetector && !props.selectedHeatmapCell
        ? []
        : props.anomalySummary;
    };

    return (
      <ContentPanel title={props.title}>
        <AnomalyDetailsChart
          dateRange={getDateRangeWithSelectedHeatmapCell(
            props.dateRange,
            props.isHCDetector,
            props.selectedHeatmapCell
          )}
          onDateRangeChange={props.onDateRangeChange}
          onZoomRangeChange={props.onZoomRangeChange}
          anomalies={getAnomaliesForChart()}
          bucketizedAnomalies={props.bucketizedAnomalies}
          anomalySummary={getAnomalySummaryForChart()}
          isLoading={props.isLoading}
          anomalyGradeSeriesName={props.anomalyGradeSeriesName}
          confidenceSeriesName={props.confidenceSeriesName}
          showAlerts={props.showAlerts}
          isNotSample={props.isNotSample}
          detector={props.detector}
          monitor={props.monitor}
          isHCDetector={props.isHCDetector}
          isHistorical={props.isHistorical}
          selectedHeatmapCell={props.selectedHeatmapCell}
        />
        {props.isHCDetector && props.selectedHeatmapCell === undefined ? (
          <EuiBadge className={'anomaly-detail-chart-center'} color={'default'}>
            {'Click on an anomaly entity to view data'}
          </EuiBadge>
        ) : null}
      </ContentPanel>
    );
  }
);
