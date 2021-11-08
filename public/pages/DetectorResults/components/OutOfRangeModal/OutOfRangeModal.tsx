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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { convertTimestampToString } from '../../../../utils/utils';

interface OutOfRangeModalProps {
  onClose(): void;
  onConfirm(): void;
  lastEnabledTime: number;
}

export const OutOfRangeModal = (props: OutOfRangeModalProps) => {
  return (
    <EuiModal onClose={props.onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          Selected dates are out of the range
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiText>
              {`Your selected dates are not in the range from when the detector
                last started streaming data (${convertTimestampToString(
                  props.lastEnabledTime
                )}).`}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="cancelButton" onClick={props.onClose}>
          Cancel
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="confirmButton"
          fill
          onClick={() => {
            props.onConfirm();
          }}
        >
          Go to historical analysis
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
