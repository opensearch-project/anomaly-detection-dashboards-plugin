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

import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React from 'react';
import { CreateDetectorButtons } from '../../../../components/CreateDetectorButtons/CreateDetectorButtons';

const FILTER_TEXT =
  'There are no detectors matching your applied filters. Reset your filters to view all detectors.';
const EMPTY_TEXT =
  'A detector is an individual anomaly detection task. You can create multiple detectors, ' +
  'and all the detectors can run simultaneously, with each analyzing data from different sources. ' +
  'Create an anomaly detector to get started.';

interface EmptyDetectorProps {
  isFilterApplied: boolean;
  onResetFilters: () => void;
}

export const EmptyDetectorMessage = (props: EmptyDetectorProps) => (
  <EuiEmptyPrompt
    data-test-subj="emptyDetectorListMessage"
    style={{ maxWidth: '45em' }}
    body={
      <EuiText>
        <p>{props.isFilterApplied ? FILTER_TEXT : EMPTY_TEXT}</p>
      </EuiText>
    }
    actions={
      props.isFilterApplied ? (
        <EuiButton
          fill
          onClick={props.onResetFilters}
          data-test-subj="resetListFilters"
        >
          Reset filters
        </EuiButton>
      ) : (
        <CreateDetectorButtons />
      )
    }
  />
);
