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
  EuiEmptyPrompt,
  EuiLink,
  EuiIcon,
  EuiSmallButton,
  EuiOverlayMask,
  EuiText,
} from '@elastic/eui';
import React, { Fragment, useState } from 'react';
import { Detector } from '../../../../models/interfaces';
import { BASE_DOCS_LINK } from '../../../../utils/constants';
import { HistoricalRangeModal } from '../HistoricalRangeModal';

interface EmptyHistoricalDetectorResultsProps {
  detector: Detector;
  onConfirm(startTime: number, endTime: number): void;
}

export const EmptyHistoricalDetectorResults = (
  props: EmptyHistoricalDetectorResultsProps
) => {
  const [historicalRangeModalOpen, setHistoricalRangeModalOpen] =
    useState<boolean>(false);
  return (
    <EuiEmptyPrompt
      data-test-subj="emptyHistoricalAnalysisMessage"
      title={<h2>You haven't yet set up historical analysis</h2>}
      body={
        <Fragment>
          {historicalRangeModalOpen ? (
            <EuiOverlayMask>
              <HistoricalRangeModal
                detector={props.detector}
                onClose={() => setHistoricalRangeModalOpen(false)}
                onConfirm={props.onConfirm}
                isEdit={false}
              />
            </EuiOverlayMask>
          ) : null}
          <EuiText size="s">
            <p>
              Historical analysis lets you apply anomaly detection models over
              long historical data windows (weeks or months). You can identify
              anomaly patterns, seasonality, and trends.{' '}
              <EuiLink
                href={`${BASE_DOCS_LINK}/ad/index/#step-6-analyze-historical-data`}
                target="_blank"
              >
                Learn more
              </EuiLink>{' '}
            </p>
          </EuiText>
        </Fragment>
      }
      actions={
        <EuiSmallButton
          data-test-subj="runHistoricalAnalysisButton"
          fill={true}
          onClick={() => {
            setHistoricalRangeModalOpen(true);
          }}
        >
          Run historical analysis
        </EuiSmallButton>
      }
    />
  );
};
