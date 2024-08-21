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
  EuiSmallButtonEmpty,
  EuiSmallButton,
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
        <EuiModalHeaderTitle>
          <EuiText size="s">
            <h2>{props.title}&nbsp;</h2>
          </EuiText>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column">
          {props.callout ? (
            <EuiFlexItem grow={false}>{props.callout}</EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            {typeof props.description === 'string' ? (
              <EuiText size="s">
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
        <EuiSmallButtonEmpty data-test-subj="cancelButton" onClick={props.onCancel}>
          Cancel
        </EuiSmallButtonEmpty>

        <EuiSmallButton
          data-test-subj="confirmButton"
          color={props.confirmButtonColor}
          fill
          onClick={props.onConfirm}
          disabled={!!props.confirmButtonDisabled}
          isLoading={!!props.confirmButtonIsLoading}
        >
          {props.confirmButtonText}
        </EuiSmallButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
