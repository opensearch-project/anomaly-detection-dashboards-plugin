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

import React, { useState } from 'react';
import {
  EuiModal,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiSmallButtonEmpty,
  EuiSmallButton,
  EuiCompressedSuperDatePicker,
  EuiText,
} from '@elastic/eui';
import { get } from 'lodash';
import { Detector } from '../../../../models/interfaces';
import {
  convertTimestampToString,
  convertTimestampToNumber,
} from '../../../../utils/utils';
import { HISTORICAL_DATE_RANGE_COMMON_OPTIONS } from '../../../DetectorJobs/utils/constants';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';

interface HistoricalRangeModalProps {
  detector: Detector;
  onClose(): void;
  onConfirm(startTime: number, endTime: number): void;
  isEdit: boolean;
}

export const HistoricalRangeModal = (props: HistoricalRangeModalProps) => {
  const [startTime, setStartTime] = useState<string>(
    convertTimestampToString(
      get(props, 'detector.detectionDateRange.startTime', 'now-30d')
    )
  );
  const [endTime, setEndTime] = useState<string>(
    convertTimestampToString(
      get(props, 'detector.detectionDateRange.endTime', 'now')
    )
  );
  return (
    <EuiModal onClose={props.onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="historicalAnalysisModalHeader">
          <EuiText size="s">
            <h2>
              {props.isEdit
                ? 'Modify historical analysis'
                : 'Set up historical analysis'}
            </h2>
          </EuiText>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FormattedFormRow title="Select a date range">
          <EuiCompressedSuperDatePicker
            isPaused={true}
            showUpdateButton={false}
            commonlyUsedRanges={HISTORICAL_DATE_RANGE_COMMON_OPTIONS}
            start={startTime}
            end={endTime}
            onTimeChange={({ start, end }) => {
              setStartTime(start);
              setEndTime(end);
            }}
          />
        </FormattedFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiSmallButtonEmpty data-test-subj="cancelButton" onClick={props.onClose}>
          Cancel
        </EuiSmallButtonEmpty>

        <EuiSmallButton
          data-test-subj="confirmButton"
          fill
          onClick={() => {
            props.onConfirm(
              //@ts-ignore
              convertTimestampToNumber(startTime),
              convertTimestampToNumber(endTime)
            );
          }}
        >
          Run historical analysis
        </EuiSmallButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
