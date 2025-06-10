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
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalBody,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { ForecasterListItem } from '../../../../models/interfaces';

interface ConfirmStartForecastersModalProps {
  forecasters: ForecasterListItem[];
  onHide(): void;
  onConfirm(): void;
  onStartForecaster(forecasterId: string, forecasterName: string): void;
  isListLoading: boolean;
}

export const ConfirmStartForecastersModal = (
  props: ConfirmStartForecastersModalProps
) => {
  const [isStarting, setIsStarting] = useState<boolean>(false);

  if (!props.forecasters || props.forecasters.length !== 1) {
    console.error('ConfirmStartForecastersModal requires exactly one forecaster.');
    return null;
  }
  const forecaster = props.forecasters[0];
  const isLoading = isStarting || props.isListLoading;

  return (
    <EuiOverlayMask>
      <EuiModal data-test-subj="startForecasterModal" onClose={props.onHide}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiText size="s">
              <h2>Start forecaster?</h2>
            </EuiText>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText size="s">
            Are you sure you want to start the forecaster "{forecaster.name}"?
            It will begin initializing.
          </EuiText>
        </EuiModalBody>
        <EuiModalFooter>
          {!isLoading ? (
            <EuiSmallButtonEmpty
              data-test-subj="cancelButton"
              onClick={props.onHide}
            >
              Cancel
            </EuiSmallButtonEmpty>
          ) : null }
          <EuiSmallButton
            fill
            data-test-subj="confirmButton"
            isLoading={isLoading}
            onClick={async () => {
              setIsStarting(true);
              try {
                await props.onStartForecaster(forecaster.id, forecaster.name);
                props.onConfirm();
              } catch (error) {
                console.error("Failed to start forecaster:", error);
                setIsStarting(false);
              }
            }}
          >
            Start forecaster
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
