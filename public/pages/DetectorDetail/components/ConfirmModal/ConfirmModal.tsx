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
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
  EuiButton,
  ButtonColor,
} from '@elastic/eui';

interface ConfirmModalProps {
  title: string;
  description: string | React.ReactNode;
  callout?: any;
  confirmButtonText: string;
  confirmButtonColor: ButtonColor;
  confirmButtonDisabled?: boolean;
  confirmButtonIsLoading?: boolean;
  onClose(): void;
  onCancel(): void;
  onConfirm(): void;
}

export const ConfirmModal = (props: ConfirmModalProps) => {
  return (
    <EuiModal onClose={props.onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{props.title}&nbsp;</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column">
          {props.callout ? (
            <EuiFlexItem grow={false}>{props.callout}</EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            {typeof props.description === 'string' ? (
              <EuiText>
                <p>{props.description}</p>
              </EuiText>
            ) : (
              <React.Fragment>{props.description}</React.Fragment>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="cancelButton" onClick={props.onCancel}>
          Cancel
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="confirmButton"
          color={props.confirmButtonColor}
          fill
          onClick={props.onConfirm}
          disabled={!!props.confirmButtonDisabled}
          isLoading={!!props.confirmButtonIsLoading}
        >
          {props.confirmButtonText}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
