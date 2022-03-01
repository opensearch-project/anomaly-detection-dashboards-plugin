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
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { Monitor } from '../../../../models/interfaces';
import { DetectorListItem } from '../../../../models/interfaces';
import { Listener } from '../../../../utils/utils';
import { EuiSpacer } from '@elastic/eui';
import { getNamesAndMonitorsGrid } from './utils/helpers';
import { get, isEmpty } from 'lodash';

interface ConfirmStopDetectorsModalProps {
  detectors: DetectorListItem[];
  monitors: { [key: string]: Monitor };
  onHide(): void;
  onConfirm(): void;
  onStopDetectors(listener?: Listener): void;
  isListLoading: boolean;
}

export const ConfirmStopDetectorsModal = (
  props: ConfirmStopDetectorsModalProps
) => {
  const containsMonitors = !isEmpty(props.monitors);
  const detectorsToDisplay = containsMonitors
    ? props.detectors.sort((detector) =>
        get(props.monitors, `${detector.id}`) ? -1 : 1
      )
    : props.detectors;

  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
  const isLoading = isModalLoading || props.isListLoading;

  return (
    <EuiOverlayMask>
      <EuiModal data-test-subj="stopDetectorsModal" onClose={props.onHide}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {'Are you sure you want to stop the selected detectors?'}&nbsp;
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          {containsMonitors ? (
            <div>
              <EuiCallOut
                title="The monitors associated with these detectors will not receive any anomaly results."
                color="warning"
                iconType="alert"
              ></EuiCallOut>
              <EuiSpacer size="s" />
            </div>
          ) : null}
          <EuiText>The following detectors will be stopped.</EuiText>
          <EuiSpacer size="s" />
          <div>
            {isLoading ? (
              <EuiLoadingSpinner size="xl" />
            ) : (
              getNamesAndMonitorsGrid(detectorsToDisplay, props.monitors)
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
              props.onStopDetectors();
              props.onConfirm();
            }}
          >
            {'Stop detectors'}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
