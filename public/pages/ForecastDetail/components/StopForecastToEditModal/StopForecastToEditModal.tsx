/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. 
 * See GitHub history for details.
 */

import React from 'react';
import {
  EuiText,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSmallButtonEmpty,
  EuiCallOut,
  EuiSmallButton,
} from '@elastic/eui';
import { FORECASTER_STATE } from '../../../../../server/utils/constants';

interface StopForecastToEditModalProps {
  onCancel: () => void;
  onStopAndEdit: () => void;
  curState: FORECASTER_STATE;
}

export const StopForecastToEditModal: React.FC<StopForecastToEditModalProps> = ({
  onCancel,
  onStopAndEdit,
  curState,
}) => {
  const getModalContent = () => {
    switch (curState) {
      case FORECASTER_STATE.INIT_TEST:
        return {
          // FIXME: Since we cannot cancel a test in progress, users must wait for completion
          title: 'Please wait for test initialization',
          callout: {
            title: 'Test in progress',
            color: 'primary' as const,
            iconType: 'clock',
            message: 'The initial test of your forecast configuration is currently running. Please wait for the test to complete before making any changes to the configuration.'
          },
          buttons: (
            <EuiSmallButton
              fill
              color="primary"
              onClick={onCancel}
              data-test-subj="acknowledgeButton"
            >
              I understand
            </EuiSmallButton>
          )
        };

      case FORECASTER_STATE.INITIALIZING_FORECAST:
        return {
          title: 'Cancel initializing the forecast to edit?',
          additionalMessage: 'You must cancel initializing the forecast before editing its configuration. After making change to the forecast, restart the forecast.',
          buttons: (
            <>
              <EuiSmallButtonEmpty 
                onClick={onCancel}
                data-test-subj="cancelButton"
              >
                Cancel
              </EuiSmallButtonEmpty>
              <EuiSmallButton
                fill
                color="primary"
                onClick={onStopAndEdit}
                data-test-subj="cancelAndEditButton"
              >
                Cancel and edit
              </EuiSmallButton>
            </>
          )
        };

      case FORECASTER_STATE.AWAITING_DATA_TO_INIT:
        return {
          title: 'Cancel forecast to edit?',
          additionalMessage: 'You must cancel the forecast before editing its configuration. After making change to the forecast, restart the forecast.',
          buttons: (
            <>
              <EuiSmallButtonEmpty 
                onClick={onCancel}
                data-test-subj="cancelButton"
              >
                Cancel
              </EuiSmallButtonEmpty>
              <EuiSmallButton
                fill
                color="primary"
                onClick={onStopAndEdit}
                data-test-subj="cancelAndEditButton"
              >
                Cancel and edit
              </EuiSmallButton>
            </>
          )
        };

      case FORECASTER_STATE.AWAITING_DATA_TO_RESTART:
        return {
          title: 'Cancel forecast to edit?',
          callout: {
              title: 'Editing forecast will wipe historical visualizations',
              color: 'warning' as const,
              iconType: 'alert',
              message: 'Changing categorical variables or the custom index name affects the forecast results and wipes out any historical forecast visualizations.'
          },
          additionalMessage: 'You must cancel the forecast before editing its configuration. After making change to the forecast, restart the forecast.',
          buttons: (
            <>
              <EuiSmallButtonEmpty 
                onClick={onCancel}
                data-test-subj="cancelButton"
              >
                Cancel
              </EuiSmallButtonEmpty>
              <EuiSmallButton
                fill
                color="primary"
                onClick={onStopAndEdit}
                data-test-subj="cancelAndEditButton"
              >
                Cancel and edit
              </EuiSmallButton>
            </>
          )
        };

      default:
        {/* FORECASTER_STATE.RUNNING */}
        return {
            title: 'Stop forecast to edit?',
            callout: {
              title: 'Editing forecast will wipe historical visualizations',
              color: 'warning' as const,
              iconType: 'alert',
              message: 'Changing categorical variables or the custom index name affects the forecast results and wipes out any historical forecast visualizations.'
            },
            additionalMessage: 'You must stop the forecast before editing its configuration. After making any changes, you can restart the forecast.',
            buttons: (
              <>
                <EuiSmallButtonEmpty 
                  onClick={onCancel}
                  data-test-subj="cancelButton"
                >
                  Cancel
                </EuiSmallButtonEmpty>
                <EuiSmallButton
                  fill
                  color="primary"
                  onClick={onStopAndEdit}
                  data-test-subj="stopAndEditButton"
                >
                  Stop and edit
                </EuiSmallButton>
              </>
            )
          };
    }
  };

  const modalContent = getModalContent();

  return (
    <EuiOverlayMask>    
      <EuiModal onClose={onCancel}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiText size="s">
              <h2>{modalContent.title}</h2>
            </EuiText>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>
            {modalContent.callout && (
              <EuiCallOut
                title={modalContent.callout.title}
                color={modalContent.callout.color}
                iconType={modalContent.callout.iconType}
              >
              <p>{modalContent.callout.message}</p>
              </EuiCallOut>
            )}
            {modalContent.additionalMessage && (
              <p>{modalContent.additionalMessage}</p>
            )}
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          {modalContent.buttons}
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
