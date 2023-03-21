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

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React from 'react';

const FILTER_TEXT = 'There are no detectors matching your search';

interface EmptyDetectorProps {
  isFilterApplied: boolean;
  embeddableTitle: string;
}

export const EmptyAssociatedDetectorFlyoutMessage = (
  props: EmptyDetectorProps
) => (
  <EuiEmptyPrompt
    title={<h3>No anomaly detectors to display</h3>}
    titleSize="s"
    data-test-subj="emptyAssociatedDetectorFlyoutMessage"
    style={{ maxWidth: '45em' }}
    body={
      <EuiText>
        <p>{props.isFilterApplied ? FILTER_TEXT : `There are no anomaly detectors associated with ${props.embeddableTitle} visualization.`}</p>
      </EuiText>
    }
  />
);
