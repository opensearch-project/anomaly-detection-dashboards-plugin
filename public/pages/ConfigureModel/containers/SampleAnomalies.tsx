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
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { get, isEmpty } from 'lodash';
import moment from 'moment';
import {
  getAnomalyHistoryWording,
  getFeatureBreakdownWording,
  getFeatureDataWording,
  getAnomalySummary,
} from '../../AnomalyCharts/utils/anomalyChartUtils';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { DateRange, Detector } from '../../../models/interfaces';
import { AppState } from '../../../redux/reducers';
import { previewDetector } from '../../../redux/reducers/previewAnomalies';
import { AnomaliesChart } from '../../AnomalyCharts/containers/AnomaliesChart';
import { HeatmapCell } from '../../AnomalyCharts/containers/AnomalyHeatmapChart';
import { FeatureBreakDown } from '../../AnomalyCharts/containers/FeatureBreakDown';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import {
  generateAnomalyAnnotations,
  filterSampleData,
} from '../../utils/anomalyResultUtils';
import { focusOnFirstWrongFeature } from '../utils/helpers';
import { prepareDetector } from '../utils/helpers';
import { FeaturesFormikValues } from '../models/interfaces';
import { BASE_DOCS_LINK } from '../../../utils/constants';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { CoreStart } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';

interface SampleAnomaliesProps {
  detector: Detector;
  featureList: FeaturesFormikValues[];
  shingleSize: number;
  categoryFields: string[];
  errors: any;
  setFieldTouched: any;
}

export function SampleAnomalies(props: SampleAnomaliesProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  useHideSideNavBar(true, false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewDone, setPreviewDone] = useState<boolean>(false);
  const [firstPreview, setFirstPreview] = useState<boolean>(true);
  const [newDetector, setNewDetector] = useState<Detector>(props.detector);
  const initialStartDate = moment().subtract(7, 'days');
  const initialEndDate = moment();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate.valueOf(),
    endDate: initialEndDate.valueOf(),
  });

  const [zoomRange, setZoomRange] = useState<DateRange>({
    startDate: initialStartDate.valueOf(),
    endDate: initialEndDate.valueOf(),
  });

  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<HeatmapCell>();

  const isHCDetector = !isEmpty(get(newDetector, 'categoryField', []));

  const sampleAnomaliesResult = useSelector(
    (state: AppState) => state.anomalies.anomaliesResult
  );

  const filteredSampleResults = filterSampleData(
    sampleAnomaliesResult,
    zoomRange,
    'plotTime',
    selectedHeatmapCell
  );

  const anomalySummary = getAnomalySummary(
    get(filteredSampleResults, 'anomalies', [])
  );

  useEffect(() => {
    if (!firstPreview) {
      getSampleAnomalies();
    }
  }, [dateRange]);

  const handleDateRangeChange = useCallback(
    (startDate: number, endDate: number, dateRangeOption?: string) => {
      setDateRange({
        startDate: startDate,
        endDate: endDate,
      });
      setZoomRange({
        startDate: startDate,
        endDate: endDate,
      });
    },
    []
  );

  const handleZoomChange = useCallback((startDate: number, endDate: number) => {
    setZoomRange({
      startDate: startDate,
      endDate: endDate,
    });
  }, []);

  const handleHeatmapCellSelected = useCallback((heatmapCell: HeatmapCell) => {
    setSelectedHeatmapCell(heatmapCell);
    setZoomRange(heatmapCell.dateRange);
  }, []);

  const getPreviewErrorMessage = (err: any, defaultMessage: string) => {
    if (typeof err === 'string') return err;
    if (err) {
      if (err.msg === 'Bad Request') {
        return err.response || defaultMessage;
      }
      if (err.msg) return err.msg;
    }
    return defaultMessage;
  };

  async function getSampleAdResult(detector: Detector) {
    try {
      setIsLoading(true);
      await dispatch(
        previewDetector({
          periodStart: dateRange.startDate.valueOf(),
          periodEnd: dateRange.endDate.valueOf(),
          detector: detector,
        })
      );
      setIsLoading(false);
      setPreviewDone(true);
      setFirstPreview(false);
    } catch (err) {
      console.error(`Fail to preview detector ${detector.id}`, err);
      setIsLoading(false);
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(
          getPreviewErrorMessage(
            err,
            'There was a problem previewing the detector'
          )
        )
      );
    }
  }

  const getSampleAnomalies = () => {
    setSelectedHeatmapCell(undefined);
    try {
      const updatedDetector = prepareDetector(
        props.featureList,
        props.shingleSize,
        props.categoryFields,
        newDetector,
        true
      );
      setPreviewDone(false);
      setZoomRange({ ...dateRange });
      setNewDetector(updatedDetector);
      getSampleAdResult(updatedDetector);
    } catch (err) {
      console.error(
        `Fail to get sample anomalies for detector ${newDetector.id}`,
        err
      );
    }
  };

  return (
    <ContentPanel title="Sample anomalies">
      <EuiCallOut
        title={'You can preview anomalies based on sample feature input'}
        iconType="eye"
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText>
              {firstPreview
                ? 'You can preview how your anomalies may look like from sample feature output and adjust the feature settings as needed.'
                : 'Use the sample data as a reference to fine tune settings. To see the latest preview with your adjustments, click "Refresh preview". Once you are done with your edits, save your changes and run the detector to see real time anomalies for the new data set.'}{' '}
              <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
                Learn more <EuiIcon size="s" type="popout" />
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="button"
              data-test-subj="previewDetector"
              onClick={() => {
                if (
                  !focusOnFirstWrongFeature(props.errors, props.setFieldTouched)
                ) {
                  handleDateRangeChange(
                    initialStartDate.valueOf(),
                    initialEndDate.valueOf()
                  );
                  getSampleAnomalies();
                }
              }}
              fill={!firstPreview}
              isLoading={isLoading}
            >
              {firstPreview ? 'Preview anomalies' : 'Refresh preview'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer />
      {previewDone && !sampleAnomaliesResult.anomalies.length ? (
        <EuiCallOut
          title={`No sample anomaly result generated. Please check detector interval and make sure you have >400 data points${
            isHCDetector ? ' for some entities ' : ' '
          }during preview date range`}
          color="warning"
          iconType="alert"
        ></EuiCallOut>
      ) : null}
      {!firstPreview ? (
        <Fragment>
          <AnomaliesChart
            title={getAnomalyHistoryWording(false, false)}
            onDateRangeChange={handleDateRangeChange}
            onZoomRangeChange={handleZoomChange}
            isLoading={isLoading}
            dateRange={dateRange}
            detector={props.detector}
            isHCDetector={isHCDetector}
            detectorCategoryField={newDetector.categoryField}
            onHeatmapCellSelected={handleHeatmapCellSelected}
            selectedHeatmapCell={selectedHeatmapCell}
            newDetector={newDetector}
            zoomRange={zoomRange}
            anomalyAndFeatureResults={[filteredSampleResults]}
            anomalySummary={anomalySummary}
            showAlerts={false}
            isNotSample={false}
          />
          <EuiSpacer />
          {isLoading ? (
            <EuiFlexGroup
              justifyContent="spaceAround"
              style={{ height: '200px', paddingTop: '100px' }}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : isHCDetector ? null : (
            <FeatureBreakDown
              title={getFeatureBreakdownWording(false)}
              detector={newDetector}
              anomalyAndFeatureResults={[filteredSampleResults]}
              annotations={generateAnomalyAnnotations([
                get(filteredSampleResults, 'anomalies', []),
              ])}
              isLoading={isLoading}
              dateRange={zoomRange}
              featureDataSeriesName={getFeatureDataWording(false)}
              showFeatureMissingDataPointAnnotation={false}
            />
          )}
        </Fragment>
      ) : null}
    </ContentPanel>
  );
}
