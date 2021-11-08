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

import React from 'react';

import {
  EuiEmptyPrompt,
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
} from '@elastic/eui';

import ContentPanel from '../../../../components/ContentPanel/ContentPanel';

interface NoFeaturePromptProps {
  detectorId: string;
}

export const NoFeaturePrompt = (props: NoFeaturePromptProps) => {
  return (
    <React.Fragment>
      <ContentPanel title="" titleSize="xs" titleClassName="preview-title">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiEmptyPrompt
              body={
                <EuiText>
                  No features have been added to this anomaly detector. A
                  feature is a metric that used for anomaly detection. A
                  detector can discover anomalies across one or many features.
                  This system reports an anomaly score based on how strong a
                  signal might be.
                </EuiText>
              }
              actions={[
                <EuiButton
                  data-test-subj="createButton"
                  href={`#/detectors/${props.detectorId}/features`}
                >
                  Add feature
                </EuiButton>,
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ContentPanel>
    </React.Fragment>
  );
};
