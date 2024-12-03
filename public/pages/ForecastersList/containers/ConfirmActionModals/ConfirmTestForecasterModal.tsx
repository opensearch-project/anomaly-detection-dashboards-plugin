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

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSmallButton,
  EuiText,
  EuiSmallButtonEmpty,
  EuiLoadingSpinner,
  EuiOverlayMask,
} from '@elastic/eui';
import React, { useState } from 'react';

interface ConfirmTestForecasterModalProps {
  forecasterId: string;
  forecasterName: string;
  onClose: () => void;
  onConfirm: () => void;
  onTestForecaster(forecasterId: string, forecasterName: string): void;
  isListLoading?: boolean;
}

export const ConfirmTestForecasterModal = ({
  onClose,
  forecasterId,
  forecasterName,
  onConfirm,
  onTestForecaster,
  isListLoading = false,
}: ConfirmTestForecasterModalProps) => {
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const isLoading = isModalLoading || isListLoading;

  return (
    <EuiOverlayMask>
      <EuiModal
        onClose={onClose}
        style={{ width: 500 }}
        data-test-subj="confirmTestForecasterModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiText size="s">
              <h2>{`Are you sure you want to test ${forecasterName}?`}</h2>
            </EuiText>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {isLoading ? (
            <EuiLoadingSpinner size="xl" />
          ) : (
            <EuiText size="s">
              <p>
                Starting a test will create sample forecasts based on the
                forecaster configuration and historical data. This does not
                affect live anomaly detection.
              </p>
            </EuiText>
          )}
        </EuiModalBody>
        <EuiModalFooter>
          {isLoading ? null : (
            <EuiSmallButtonEmpty data-test-subj="cancelButton" onClick={onClose}>
              Cancel
            </EuiSmallButtonEmpty>
          )}
          <EuiSmallButton
            data-test-subj="confirmButton"
            onClick={async () => {
              setIsModalLoading(true);
              await onTestForecaster(forecasterId, forecasterName);
              onConfirm();
            }}
            fill
            isLoading={isLoading}
            color="primary"
          >
            Start test
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};