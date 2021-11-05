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
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';

interface ListActionsProps {
  onStartDetectors(): void;
  onStopDetectors(): void;
  onDeleteDetectors(): void;
  isActionsDisabled: boolean;
  isStartDisabled: boolean;
  isStopDisabled: boolean;
}

export const ListActions = (props: ListActionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false} style={{ marginRight: '16px' }}>
        <EuiPopover
          id="actionsPopover"
          button={
            <EuiButton
              data-test-subj="listActionsButton"
              disabled={props.isActionsDisabled}
              iconType="arrowDown"
              iconSide="right"
              onClick={() => setIsOpen(!isOpen)}
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
              key="startDetectors"
              data-test-subj="startDetectors"
              disabled={props.isStartDisabled}
              onClick={props.onStartDetectors}
            >
              Start real-time detectors
            </EuiContextMenuItem>

            <EuiContextMenuItem
              key="stopDetectors"
              data-test-subj="stopDetectors"
              disabled={props.isStopDisabled}
              onClick={props.onStopDetectors}
            >
              Stop real-time detectors
            </EuiContextMenuItem>

            <EuiContextMenuItem
              key="deleteDetectors"
              data-test-subj="deleteDetectors"
              onClick={props.onDeleteDetectors}
              style={{ color: '#FF6666' }}
            >
              Delete detectors
            </EuiContextMenuItem>
          </EuiContextMenuPanel>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
