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
              {`The selected dates are not in the range from when the detector
                last started streaming data (${convertTimestampToString(
                  props.lastEnabledTime
                )}). To see historical data, go to
                historical analysis.`}
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
