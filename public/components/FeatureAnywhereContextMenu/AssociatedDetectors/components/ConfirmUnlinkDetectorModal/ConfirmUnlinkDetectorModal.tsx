/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiText,
  EuiOverlayMask,
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalBody,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { DetectorListItem } from '../../../../../models/interfaces';
import { EuiSpacer } from '@elastic/eui';

interface ConfirmUnlinkDetectorModalProps {
  detector: DetectorListItem;
  onUnlinkDetector(): void;
  onHide(): void;
  onConfirm(): void;
  isListLoading: boolean;
}

export const ConfirmUnlinkDetectorModal = (
  props: ConfirmUnlinkDetectorModalProps
) => {
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const isLoading = isModalLoading || props.isListLoading;
  return (
    <EuiOverlayMask>
      <EuiModal
        data-test-subj="startDetectorsModal"
        onClose={props.onHide}
        maxWidth={450}
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>{'Remove association?'}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText>
            Removing association unlinks {props.detector.name} detector from the
            visualization but does not delete it. The detector association can
            be restored.
          </EuiText>
          <EuiSpacer size="s" />
        </EuiModalBody>
        <EuiModalFooter>
          {isLoading ? null : (
            <EuiButtonEmpty
              data-test-subj="cancelButton"
              onClick={props.onHide}
            >
              Cancel
            </EuiButtonEmpty>
          )}
          <EuiButton
            data-test-subj="confirmButton"
            color="primary"
            fill
            isLoading={isLoading}
            onClick={async () => {
              setIsModalLoading(true);
              props.onUnlinkDetector();
              props.onConfirm();
            }}
          >
            {'Remove association'}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
