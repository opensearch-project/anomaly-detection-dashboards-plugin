/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React from 'react';

const FILTER_TEXT = 'There are no detectors matching your search';

interface EmptyDetectorProps {
  isFilterApplied: boolean;
  embeddableTitle: string;
}

export const EmptyAssociatedDetectorMessage = (props: EmptyDetectorProps) => (
  <EuiEmptyPrompt
    title={<h3>No anomaly detectors to display</h3>}
    titleSize="s"
    data-test-subj="emptyAssociatedDetectorFlyoutMessage"
    style={{ maxWidth: '45em' }}
    body={
      <EuiText>
        <p>
          {props.isFilterApplied
            ? FILTER_TEXT
            : `There are no anomaly detectors associated with ${props.embeddableTitle} visualization.`}
        </p>
      </EuiText>
    }
  />
);
