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

import React, { useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { Detector } from '../../../../models/interfaces';
import { Listener } from '../../../../utils/utils';
import { DETECTOR_STATE } from '../../../../../server/utils/constants';
import { HISTORICAL_DETECTOR_ACTION } from '../../utils/constants';

interface HistoricalDetectorControlsProps {
  detector: Detector;
  isStoppingDetector: boolean;
  onEditDetector(): void;
  onStartDetector(): void;
  onStopDetector: (
    action: HISTORICAL_DETECTOR_ACTION,
    listener?: Listener
  ) => void;
  onDeleteDetector(): void;
}
export const HistoricalDetectorControls = (
  props: HistoricalDetectorControlsProps
) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false} style={{ marginRight: '16px' }}>
        <EuiPopover
          id="actionsPopover"
          button={
            <EuiButton
              iconType="arrowDown"
              iconSide="right"
              data-test-subj="actionsButton"
              onClick={() => setIsOpen(!isOpen)}
              isDisabled={props.isStoppingDetector}
            >
              Actions
            </EuiButton>
          }
          panelPaddingSize="none"
          anchorPosition="downLeft"
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
        >
          <EuiContextMenuPanel>
            <EuiContextMenuItem
              key="editDetector"
              data-test-subj="editDetectorItem"
              onClick={props.onEditDetector}
            >
              Edit historical detector
            </EuiContextMenuItem>
            <EuiContextMenuItem
              key="deleteDetector"
              data-test-subj="deleteDetectorItem"
              onClick={props.onDeleteDetector}
            >
              Delete historical detector
            </EuiContextMenuItem>
          </EuiContextMenuPanel>
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ marginLeft: '0px' }}>
        {props.isStoppingDetector ||
        props.detector?.curState === DETECTOR_STATE.INIT ||
        props.detector?.curState === DETECTOR_STATE.RUNNING ? (
          <EuiButton
            data-test-subj="stopDetectorButton"
            onClick={() =>
              props.onStopDetector(HISTORICAL_DETECTOR_ACTION.STOP, undefined)
            }
            isLoading={props.isStoppingDetector}
            iconType={'stop'}
          >
            {props.isStoppingDetector ? 'Stopping' : 'Stop historical detector'}
          </EuiButton>
        ) : (
          <EuiButton
            data-test-subj="startDetectorButton"
            onClick={props.onStartDetector}
            iconType={'play'}
          >
            Start historical detector
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
