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
import { get, isEmpty } from 'lodash';
import { Monitor } from '../../../../models/interfaces';
import { DetectorListItem } from '../../../../models/interfaces';
import { Listener } from '../../../../utils/utils';
import { EuiSpacer } from '@elastic/eui';
import { DETECTOR_STATE } from '../../../../../server/utils/constants';
import {
  getNamesAndMonitorsAndStatesGrid,
  containsEnabledDetectors,
} from './utils/helpers';

interface ConfirmDeleteDetectorsModalProps {
  detectors: DetectorListItem[];
  monitors: { [key: string]: Monitor };
  onHide(): void;
  onConfirm(): void;
  onStopDetectors(listener?: Listener): void;
  onDeleteDetectors(): void;
  isListLoading: boolean;
}

export const ConfirmDeleteDetectorsModal = (
  props: ConfirmDeleteDetectorsModalProps
) => {
  const containsMonitors = !isEmpty(props.monitors);
  const containsEnabled = containsEnabledDetectors(props.detectors);
  const detectorsToDisplay = containsEnabled
    ? props.detectors
        .sort((detector) =>
          detector.curState === DETECTOR_STATE.INIT ||
          detector.curState === DETECTOR_STATE.RUNNING
            ? -1
            : 1
        )
        .sort((detector) => (get(props.monitors, `${detector.id}`) ? -1 : 1))
    : containsMonitors
    ? props.detectors.sort((detector) =>
        get(props.monitors, `${detector.id}`) ? -1 : 1
      )
    : props.detectors;

  const [deleteTyped, setDeleteTyped] = useState<boolean>(false);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const isLoading = isModalLoading || props.isListLoading;

  return (
    <EuiOverlayMask>
      <EuiModal data-test-subj="deleteDetectorsModal" onClose={props.onHide}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiText size="s">
              <h2>
                {'Are you sure you want to delete the selected detectors?'}&nbsp;
              </h2>
            </EuiText>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {containsMonitors ? (
            <EuiCallOut
              title="The monitors associated with these detectors will not receive any anomaly results."
              color="warning"
              iconType="alert"
            ></EuiCallOut>
          ) : null}
          {containsMonitors && containsEnabled ? <EuiSpacer size="s" /> : null}
          {containsEnabled ? (
            <EuiCallOut
              title="Some of the selected detectors are currently running."
              color="warning"
              iconType="alert"
            ></EuiCallOut>
          ) : null}
          {containsMonitors || containsEnabled ? <EuiSpacer size="s" /> : null}
          <EuiText size="s">
            The following detectors and feature configurations will be
            permanently removed. This action is irreversible.
          </EuiText>
          <EuiSpacer size="s" />
          <div>
            {isLoading ? (
              <EuiLoadingSpinner size="xl" />
            ) : (
              getNamesAndMonitorsAndStatesGrid(
                detectorsToDisplay,
                props.monitors
              )
            )}
          </div>
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
              if (e.target.value === 'delete') {
                setDeleteTyped(true);
              } else {
                setDeleteTyped(false);
              }
            }}
          />
        </EuiFlexGroup>
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
            color="danger"
            disabled={!deleteTyped}
            fill
            isLoading={isLoading}
            onClick={async () => {
              setIsModalLoading(true);
              if (containsEnabled) {
                const listener: Listener = {
                  onSuccess: () => {
                    props.onDeleteDetectors();
                    props.onConfirm();
                  },
                  onException: props.onConfirm,
                };
                props.onStopDetectors(listener);
              } else {
                props.onDeleteDetectors();
                props.onConfirm();
              }
            }}
          >
            {'Delete detectors'}
          </EuiSmallButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
