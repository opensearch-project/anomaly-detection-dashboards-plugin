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
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
  EuiEmptyPrompt,
  EuiLink,
  EuiIcon,
  EuiButton,
  EuiOverlayMask,
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
  const [historicalRangeModalOpen, setHistoricalRangeModalOpen] = useState<
    boolean
  >(false);
  return (
    <EuiEmptyPrompt
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
          <p>
            Historical analysis lets you apply anomaly detection models over
            long historical data windows (weeks or months). You can identify
            anomaly patterns, seasonality, and trends.{' '}
            <EuiLink
              href={`${BASE_DOCS_LINK}/ad/index/#step-6-analyze-historical-data`}
              target="_blank"
            >
              Learn more &nbsp;
              <EuiIcon size="s" type="popout" />
            </EuiLink>{' '}
          </p>
        </Fragment>
      }
      actions={
        <EuiButton
          fill={true}
          onClick={() => {
            setHistoricalRangeModalOpen(true);
          }}
        >
          Run historical analysis
        </EuiButton>
      }
    />
  );
};
