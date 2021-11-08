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
  Chart,
  Axis,
  LineSeries,
  RectAnnotation,
  niceTimeFormatter,
  Position,
  Settings,
  ScaleType,
  LineAnnotation,
  AnnotationDomainTypes,
} from '@elastic/charts';
import { EuiText, EuiLink, EuiButton, EuiIcon } from '@elastic/eui';
import React, { useState, Fragment } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { useDelayedLoader } from '../../../../hooks/useDelayedLoader';
import {
  FeatureAggregationData,
  FeatureAttributes,
  DateRange,
  FEATURE_TYPE,
  Schedule,
  EntityData,
} from '../../../../models/interfaces';
import { darkModeEnabled } from '../../../../utils/opensearchDashboardsUtils';
import {
  prepareDataForChart,
  getFeatureMissingDataAnnotations,
  filterWithDateRange,
  flattenData,
  convertToEntityString,
} from '../../../utils/anomalyResultUtils';
import { CodeModal } from '../../../DetectorConfig/components/CodeModal/CodeModal';
import {
  CHART_FIELDS,
  CHART_COLORS,
  FEATURE_CHART_THEME,
} from '../../utils/constants';
import { get, isEmpty } from 'lodash';
import { ENTITY_COLORS } from '../../../DetectorResults/utils/constants';

interface FeatureChartProps {
  feature: FeatureAttributes;
  featureData: FeatureAggregationData[][];
  annotations: any[];
  isLoading: boolean;
  dateRange: DateRange;
  featureType: FEATURE_TYPE;
  field?: string;
  aggregationMethod?: string;
  aggregationQuery?: string;
  featureDataSeriesName: string;
  edit?: boolean;
  onEdit?(): void;
  detectorInterval: Schedule;
  showFeatureMissingDataPointAnnotation?: boolean;
  detectorEnabledTime?: number;
  rawFeatureData: FeatureAggregationData[][];
  entityData: EntityData[][];
  isHCDetector?: boolean;
}

export const FeatureChart = (props: FeatureChartProps) => {
  const getDisabledChartBackground = () =>
    darkModeEnabled() ? '#25262E' : '#F0F0F0';

  const [showCustomExpression, setShowCustomExpression] =
    useState<boolean>(false);
  const timeFormatter = niceTimeFormatter([
    props.dateRange.startDate,
    props.dateRange.endDate,
  ]);
  const showLoader = useDelayedLoader(props.isLoading);

  const featureDescription = () => (
    <EuiText size="s">
      {props.featureType === FEATURE_TYPE.SIMPLE ? (
        <Fragment>
          <span
            className="content-panel-subTitle"
            style={{ paddingRight: '20px' }}
          >
            Field: {props.field}
          </span>
          <span
            className="content-panel-subTitle"
            style={{ paddingRight: '20px' }}
          >
            Aggregation method: {props.aggregationMethod}
          </span>
          <span className="content-panel-subTitle">
            State: {props.feature.featureEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </Fragment>
      ) : (
        <Fragment>
          <span
            className="content-panel-subTitle"
            style={{ paddingRight: '20px' }}
          >
            Custom expression:{' '}
            <EuiLink onClick={() => setShowCustomExpression(true)}>
              View code
            </EuiLink>
          </span>
          <span className="content-panel-subTitle">
            State: {props.feature.featureEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </Fragment>
      )}
    </EuiText>
  );

  // return undefined if featureMissingDataPointAnnotationStartDate is missing
  // OR it is even behind the specified date range
  const getFeatureMissingAnnotationDateRange = (
    dateRange: DateRange,
    featureMissingDataPointAnnotationStartDate?: number
  ) => {
    if (
      featureMissingDataPointAnnotationStartDate &&
      dateRange.endDate > featureMissingDataPointAnnotationStartDate
    ) {
      return {
        startDate: Math.max(
          dateRange.startDate,
          featureMissingDataPointAnnotationStartDate
        ),
        endDate: dateRange.endDate,
      };
    }
    return undefined;
  };

  const getFeatureAnnotations = () => {
    if (isEmpty(props.annotations)) {
      return [];
    }
    return filterWithDateRange(
      props.annotations,
      props.dateRange,
      'coordinates.x0'
    );
  };

  const featureData = prepareDataForChart(
    props.featureData,
    props.dateRange
  ) as FeatureAggregationData[][];

  const multipleTimeSeries = get(featureData, 'length', 0) > 1;

  return (
    <ContentPanel
      title={
        props.feature.featureEnabled
          ? props.feature.featureName
          : `${props.feature.featureName} (disabled)`
      }
      bodyStyles={
        !props.feature.featureEnabled
          ? { backgroundColor: getDisabledChartBackground() }
          : {}
      }
      subTitle={featureDescription()}
      actions={
        props.edit ? (
          <EuiButton onClick={props.onEdit}>Edit feature</EuiButton>
        ) : null
      }
    >
      <div
        style={{
          height: '200px',
          width: '100%',
          opacity: showLoader ? 0.2 : 1,
        }}
      >
        {/**
         * Charts may show stale data even after feature data is changed.
         * By setting the key prop here, the chart will re-mount whenever the
         * feature data has changed.
         */}
        <Chart key={`${featureData}`}>
          <Settings
            showLegend
            showLegendExtra={false}
            //TODO: research more why only set this old property will work.
            showLegendDisplayValue={false}
            legendPosition={Position.Right}
            theme={FEATURE_CHART_THEME}
            xDomain={{
              min: props.dateRange.startDate,
              max: props.dateRange.endDate,
            }}
          />
          {props.feature.featureEnabled ? (
            <RectAnnotation
              dataValues={getFeatureAnnotations()}
              id="annotations"
              style={{
                stroke: darkModeEnabled() ? 'red' : '#D5DBDB',
                strokeWidth: 1,
                opacity: 0.8,
                fill: darkModeEnabled() ? 'red' : '#D5DBDB',
              }}
            />
          ) : null}
          {props.feature.featureEnabled &&
          props.showFeatureMissingDataPointAnnotation &&
          props.detectorEnabledTime
            ? [
                <LineAnnotation
                  id="featureMissingAnnotations"
                  domainType={AnnotationDomainTypes.XDomain}
                  dataValues={getFeatureMissingDataAnnotations(
                    props.showFeatureMissingDataPointAnnotation
                      ? flattenData(props.rawFeatureData)
                      : flattenData(props.featureData),
                    props.detectorInterval.interval,
                    getFeatureMissingAnnotationDateRange(
                      props.dateRange,
                      props.detectorEnabledTime
                    ),
                    props.dateRange
                  )}
                  marker={<EuiIcon type="alert" />}
                  style={{
                    line: { stroke: 'red', strokeWidth: 1, opacity: 0.8 },
                  }}
                />,
              ]
            : null}
          <Axis
            id="left"
            title={props.featureDataSeriesName}
            position="left"
            showGridLines
          />
          <Axis id="bottom" position="bottom" tickFormat={timeFormatter} />
          {
            // Add each set of feature data as a separate time series
          }
          {featureData.map(
            (featureTimeSeries: FeatureAggregationData[], index) => {
              const seriesKey = props.isHCDetector
                ? `${props.featureDataSeriesName} (${convertToEntityString(
                    props.entityData[index],
                    ', '
                  )})`
                : props.featureDataSeriesName;
              return (
                <LineSeries
                  id={seriesKey}
                  name={seriesKey}
                  color={
                    multipleTimeSeries
                      ? ENTITY_COLORS[index]
                      : CHART_COLORS.FEATURE_DATA_COLOR
                  }
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={CHART_FIELDS.PLOT_TIME}
                  yAccessors={[CHART_FIELDS.DATA]}
                  data={featureTimeSeries}
                />
              );
            }
          )}
        </Chart>
        {showCustomExpression ? (
          <CodeModal
            title={props.feature.featureName}
            subtitle="Custom expression"
            code={JSON.stringify(props.feature.aggregationQuery, null, 4)}
            getModalVisibilityChange={() => true}
            closeModal={() => setShowCustomExpression(false)}
          />
        ) : null}
      </div>
    </ContentPanel>
  );
};
