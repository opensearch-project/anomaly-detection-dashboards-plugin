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
