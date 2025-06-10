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
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { ForecasterListItem } from '../../../../models/interfaces';
import { Listener } from '../../../../utils/utils';

interface ConfirmStopForecastersModalProps {
  forecasters: ForecasterListItem[];
  onHide(): void;
  onConfirm(): void;
  onStopForecaster(forecasterId: string, forecasterName: string, listener?: Listener): void;
  isListLoading: boolean;
  actionText?: string;
}

export const ConfirmStopForecastersModal = (
  props: ConfirmStopForecastersModalProps
) => {
  const actionText = props.actionText || 'stop';

  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const isLoading = isModalLoading || props.isListLoading;

  return (
    <EuiOverlayMask>
      <EuiModal data-test-subj="stopForecastersModal" onClose={props.onHide}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiText size="s">
              <h2>
                {`Are you sure you want to ${actionText} the selected forecaster?`}&nbsp;
              </h2>
            </EuiText>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalFooter>
          {isLoading ? null : (
            <EuiSmallButtonEmpty
              data-test-subj="cancelButton"
              onClick={props.onHide}
            >
              Cancel
            </EuiSmallButtonEmpty>
          )}
          <EuiSmallButton
            data-test-subj="confirmButton"
            color="primary"
            fill
            isLoading={isLoading}
            onClick={async () => {
              setIsModalLoading(true);
              props.onStopForecaster(props.forecasters[0].id, props.forecasters[0].name);
              props.onConfirm();
            }}
          >
            {`${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`}
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
