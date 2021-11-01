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

import React from 'react';
import { get } from 'lodash';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { FeatureChart } from '../components/FeatureChart/FeatureChart';
import {
  Detector,
  FeatureAttributes,
  Anomalies,
  DateRange,
  FEATURE_TYPE,
  FeatureAggregationData,
  EntityData,
} from '../../../models/interfaces';
import { NoFeaturePrompt } from '../components/FeatureChart/NoFeaturePrompt';
import { focusOnFeatureAccordion } from '../../ConfigureModel/utils/helpers';
import moment from 'moment';
import { HeatmapCell } from './AnomalyHeatmapChart';

interface FeatureBreakDownProps {
  title?: string;
  detector: Detector;
  anomalyAndFeatureResults: Anomalies[];
  annotations: any[];
  isLoading: boolean;
  dateRange: DateRange;
  featureDataSeriesName: string;
  showFeatureMissingDataPointAnnotation?: boolean;
  rawAnomalyResults?: Anomalies[];
  isFeatureDataMissing?: boolean;
  isHCDetector?: boolean;
  selectedHeatmapCell?: HeatmapCell;
}

export const FeatureBreakDown = React.memo((props: FeatureBreakDownProps) => {
  const getFeatureDataForChart = (
    anomalyAndFeatureResults: Anomalies[],
    featureId: string
  ) => {
    if (props.isHCDetector && !props.selectedHeatmapCell) {
      return [];
    } else {
      let featureResults = [] as FeatureAggregationData[][];
      if (anomalyAndFeatureResults !== undefined) {
        anomalyAndFeatureResults.forEach((timeSeries: Anomalies) => {
          const curFeatureData = get(
            timeSeries,
            `featureData.${featureId}`,
            []
          ) as FeatureAggregationData[];
          featureResults.push(curFeatureData);
        });
      }
      return featureResults;
    }
  };

  // Returns an array of entity combinations - one for each time series.
  // Need to propagate this data to the chart in order to label the different possible time series
  const getEntityDataForChart = (anomalyAndFeatureResults: Anomalies[]) => {
    if (props.isHCDetector && !props.selectedHeatmapCell) {
      return [];
    } else {
      let entityData = [] as EntityData[][];
      if (anomalyAndFeatureResults !== undefined) {
        anomalyAndFeatureResults.forEach((timeSeries: Anomalies) => {
          // extracting the entity data from the first anomaly point in the time series
          entityData.push(get(timeSeries, 'anomalies.0.entity', []));
        });
      }
      return entityData;
    }
  };
  const getAnnotationData = () => {
    return props.isHCDetector && !props.selectedHeatmapCell
      ? []
      : props.annotations;
  };

  return (
    <React.Fragment>
      {props.title ? (
        <EuiFlexGroup alignItems="flexEnd">
          <EuiFlexItem>
            <EuiTitle size="s" className="preview-title">
              <h4>{props.title}</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      {props.showFeatureMissingDataPointAnnotation &&
      props.detector.enabledTime &&
      props.isFeatureDataMissing ? (
        <EuiCallOut
          title={`Missing data is only shown since last enabled time: ${moment(
            props.detector.enabledTime
          ).format('MM/DD/YY h:mm A')}`}
          color={'warning'}
          iconType={'alert'}
          style={{ marginBottom: '20px' }}
        />
      ) : null}
      {get(props, 'detector.featureAttributes', []).map(
        (feature: FeatureAttributes, index: number) => (
          <React.Fragment key={`${feature.featureName}-${feature.featureId}`}>
            <FeatureChart
              feature={feature}
              featureData={getFeatureDataForChart(
                props.anomalyAndFeatureResults,
                //@ts-ignore
                feature.featureId
              )}
              rawFeatureData={getFeatureDataForChart(
                //@ts-ignore
                props.rawAnomalyResults,
                feature.featureId
              )}
              annotations={getAnnotationData()}
              isLoading={props.isLoading}
              dateRange={props.dateRange}
              featureType={
                get(
                  props,
                  `detector.uiMetadata.features.${feature.featureName}.featureType`
                ) as FEATURE_TYPE
              }
              field={
                get(
                  props,
                  `detector.uiMetadata.features.${feature.featureName}.featureType`
                ) === FEATURE_TYPE.SIMPLE
                  ? get(
                      props,
                      `detector.uiMetadata.features.${feature.featureName}.aggregationOf`
                    )
                  : undefined
              }
              aggregationMethod={
                get(
                  props,
                  `detector.uiMetadata.features.${feature.featureName}.featureType`
                ) === FEATURE_TYPE.SIMPLE
                  ? get(
                      props,
                      `detector.uiMetadata.features.${feature.featureName}.aggregationBy`
                    )
                  : undefined
              }
              featureDataSeriesName={props.featureDataSeriesName}
              edit={props.title === 'Sample feature breakdown'}
              onEdit={() => {
                focusOnFeatureAccordion(index);
              }}
              detectorInterval={props.detector.detectionInterval.period}
              showFeatureMissingDataPointAnnotation={
                props.showFeatureMissingDataPointAnnotation
              }
              detectorEnabledTime={props.detector.enabledTime}
              entityData={getEntityDataForChart(props.anomalyAndFeatureResults)}
              isHCDetector={props.isHCDetector}
            />
            {index + 1 ===
            get(props, 'detector.featureAttributes', []).length ? null : (
              <EuiSpacer size="l" />
            )}
          </React.Fragment>
        )
      )}
      {!props.isLoading &&
      get(props, 'detector.featureAttributes.length', 0) === 0 ? (
        <NoFeaturePrompt detectorId={props.detector?.id} />
      ) : null}
    </React.Fragment>
  );
});
