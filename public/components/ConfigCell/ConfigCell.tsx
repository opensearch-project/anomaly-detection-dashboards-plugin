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

import { EuiText, EuiFormRow, EuiFormRowProps } from '@elastic/eui';
import React from 'react';

export const FixedWidthRow = (props: EuiFormRowProps) => (
  <EuiFormRow {...props} style={{ width: '250px' }} />
);

interface ConfigCellProps {
  title: string;
  description: string | string[];
}

export const ConfigCell = (props: ConfigCellProps) => {
  return (
    <FixedWidthRow label={props.title}>
      <EuiText>
        <p className="enabled">{props.description}</p>
      </EuiText>
    </FixedWidthRow>
  );
};
