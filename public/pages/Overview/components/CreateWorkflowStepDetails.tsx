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

import {
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import React from 'react';
import { BASE_DOCS_LINK } from '../../../utils/constants';

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
            <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
              Learn more <EuiIcon size="s" type="popout" />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
