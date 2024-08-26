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
import { get } from 'lodash';
import { EuiBasicTable } from '@elastic/eui';

interface AdditionalSettingsProps {
  shingleSize: number;
  categoryField: string[];
  imputationMethod: string;
  customValues: string[];
}

export function AdditionalSettings(props: AdditionalSettingsProps) {
  const renderCustomValues = (customValues: string[]) => (
    <div>
      {customValues.map((value, index) => (
        <p key={index}>{value}</p>
      ))}
    </div>
  );
  const tableItems = [
    {
      categoryField: get(props, 'categoryField.0', '-'),
      shingleSize: props.shingleSize,
      imputationMethod: props.imputationMethod,
      customValues: props.customValues,
    },
  ];
  const tableColumns = [
    { name: 'Category field', field: 'categoryField' },
    { name: 'Shingle size', field: 'shingleSize' },
    { name: 'Imputation method', field: 'imputationMethod' },
    { name: 'Custom values',
      field: 'customValues',
      render: (customValues: string[]) => renderCustomValues(customValues), // Use a custom render function
     },
  ];
  return (
    <EuiBasicTable
      className="header-single-value-euiBasicTable"
      items={tableItems}
      columns={tableColumns}
    />
  );
}
