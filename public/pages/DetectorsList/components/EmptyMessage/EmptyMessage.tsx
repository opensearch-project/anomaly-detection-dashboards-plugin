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

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
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
