/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import {
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import React from 'react';

interface CreateWorkflowStepDetailsProps {
  title: string;
  content: string;
}

export const CreateWorkflowStepDetails = (
  props: CreateWorkflowStepDetailsProps
) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false} style={{ marginBottom: '5px' }}>
          <EuiText style={{ fontSize: '20px' }}>{props.title}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ marginTop: '0px' }}>
          <EuiText style={{ fontSize: '14px' }}>
            {props.content}{' '}
            <EuiLink
              href="https://opendistro.github.io/for-elasticsearch-docs/docs/ad/"
              target="_blank"
            >
              Learn more <EuiIcon size="s" type="popout" />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
