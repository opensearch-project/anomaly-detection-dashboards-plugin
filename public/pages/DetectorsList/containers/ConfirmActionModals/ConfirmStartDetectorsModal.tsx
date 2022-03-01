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
  EuiText,
  EuiOverlayMask,
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { DetectorListItem } from '../../../../models/interfaces';
import { EuiSpacer } from '@elastic/eui';
import { getNamesGrid } from './utils/helpers';

interface ConfirmStartDetectorsModalProps {
  detectors: DetectorListItem[];
  onHide(): void;
  onConfirm(): void;
  onStartDetectors(): void;
  isListLoading: boolean;
}

export const ConfirmStartDetectorsModal = (
  props: ConfirmStartDetectorsModalProps
) => {
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const isLoading = isModalLoading || props.isListLoading;
  return (
    <EuiOverlayMask>
      <EuiModal data-test-subj="startDetectorsModal" onClose={props.onHide}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {'Are you sure you want to start the selected detectors?'}&nbsp;
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText>The following detectors will begin initializing.</EuiText>
          <EuiSpacer size="s" />
          <div>
            {isLoading ? (
              <EuiLoadingSpinner size="xl" />
            ) : (
              getNamesGrid(props.detectors)
            )}
          </div>
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
              props.onStartDetectors();
              props.onConfirm();
            }}
          >
            {'Start detectors'}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
