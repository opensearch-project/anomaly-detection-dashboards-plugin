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
  EuiSmallButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { Detector } from '../../../../models/interfaces';

interface DetectorControls {
  onEditDetector(): void;
  onEditFeatures(): void;
  onDelete(): void;
  onStartDetector(): void;
  onStopDetector(): void;
  detector: Detector;
}
export const DetectorControls = (props: DetectorControls) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="actionsPopover"
          button={
            <EuiSmallButton
              iconType="arrowDown"
              iconSide="right"
              data-test-subj="actionsButton"
              onClick={() => setIsOpen(!isOpen)}
            >
              Actions
            </EuiSmallButton>
          }
          panelPaddingSize="none"
          anchorPosition="downLeft"
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
        >
          <EuiContextMenuPanel>
            <EuiContextMenuItem
              key="editDetector"
              data-test-subj="editDetectorSettingsItem"
              onClick={props.onEditDetector}
            >
              Edit detector settings
            </EuiContextMenuItem>

            <EuiContextMenuItem
              key="editFeatures"
              data-test-subj="editModelConfigurationItem"
              onClick={props.onEditFeatures}
            >
              Edit model configuration
            </EuiContextMenuItem>

            <EuiContextMenuItem
              key="deleteDetector"
              data-test-subj="deleteDetectorItem"
              onClick={props.onDelete}
              style={{ color: '#FF6666' }}
            >
              Delete detector
            </EuiContextMenuItem>
          </EuiContextMenuPanel>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
