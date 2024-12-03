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

import React, { useRef, useEffect, useState } from 'react';
import {
  EuiOverlayMask,
  EuiCallOut,
  EuiText,
  EuiCompressedFieldText,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiFlexGroup,
  EuiModal,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { Listener } from '../../../../utils/utils';
import { EuiSpacer } from '@elastic/eui';
import { FORECASTER_STATE, isActiveState } from '../../../../../server/utils/constants';


interface ConfirmDeleteForecasterModalProps {
  forecasterId: string;
  forecasterName: string;
  forecasterState: FORECASTER_STATE;
  onHide(): void;
  onConfirm(): void;
  onStopForecasters(forecasterId: string, forecasterName: string, listener?: Listener): void;
  onDeleteForecasters(forecasterId: string, forecasterName: string): void;
  isListLoading: boolean;
}

export const ConfirmDeleteForecastersModal = (props: ConfirmDeleteForecasterModalProps) => {
  // Track if we are still mounted
  const isMountedRef = useRef(true);
  useEffect(() => {
    // Cleanup when unmounted
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [deleteTyped, setDeleteTyped] = useState<boolean>(false);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);

  const isLoading = isModalLoading || props.isListLoading;
  const isActive = isActiveState(props.forecasterState);

  return (
    <EuiOverlayMask>
      <EuiModal data-test-subj="deleteForecastersModal" onClose={props.onHide}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiText size="s">
              <h2>{`Are you sure you want to delete "${props.forecasterName}"?`}&nbsp;</h2>
            </EuiText>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {isActive && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                title={`The forecaster "${props.forecasterName}" is currently running.`}
                color="warning"
                iconType="alert"
              />
              <EuiSpacer size="s" />
            </>
          )}
          <EuiText size="s">
            The forecaster "{props.forecasterName}" will be permanently removed.
            This action is irreversible.
          </EuiText>
          <EuiSpacer size="s" />
        </EuiModalBody>
        <EuiFlexGroup
          direction="column"
          style={{
            marginTop: 16,
            marginBottom: 8,
            marginLeft: 24,
            marginRight: 24,
          }}
        >
          <EuiText size="s">
            <p>
              To confirm deletion, type <i>delete</i> in the field.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCompressedFieldText
            data-test-subj="typeDeleteField"
            fullWidth={true}
            placeholder="delete"
            onChange={(e) => {
              setDeleteTyped(e.target.value === 'delete');
            }}
          />
        </EuiFlexGroup>
        <EuiModalFooter>
          {isLoading ? null : (
            <EuiSmallButtonEmpty data-test-subj="cancelButton" onClick={props.onHide}>
              Cancel
            </EuiSmallButtonEmpty>
          )}
          <EuiSmallButton
            data-test-subj="confirmButton"
            color="danger"
            disabled={!deleteTyped}
            fill
            isLoading={isLoading}
            onClick={async () => {
              setIsModalLoading(true);
              try {
                // If active, stop first
                if (isActive) {
                  await props.onStopForecasters(props.forecasterId, props.forecasterName);
                }
                // Then delete
                await props.onDeleteForecasters(props.forecasterId, props.forecasterName);
                // Fire parent "onConfirm" (which likely unmounts us)
                props.onConfirm();
              } catch (error) {
                // If there's an error, also close or do something
                props.onConfirm();
              } finally {
                // Only update state if still mounted
                if (isMountedRef.current) {
                  setIsModalLoading(false);
                }
              }
            }}
          >
            Delete forecasters
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
