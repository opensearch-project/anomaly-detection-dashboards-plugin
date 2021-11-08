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
import { get, isEmpty } from 'lodash';
import { EuiBasicTable } from '@elastic/eui';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { convertToCategoryFieldString } from '../../../utils/anomalyResultUtils';

interface AdditionalSettingsProps {
  shingleSize: number;
  categoryField: string[];
}

export function AdditionalSettings(props: AdditionalSettingsProps) {
  const tableItems = [
    {
      categoryField: isEmpty(get(props, 'categoryField', []))
        ? '-'
        : convertToCategoryFieldString(props.categoryField, ', '),
      shingleSize: props.shingleSize,
    },
  ];
  const tableColumns = [
    { name: 'Categorical fields', field: 'categoryField' },
    { name: 'Shingle size', field: 'shingleSize' },
  ];
  return (
    <ContentPanel title="Additional settings" titleSize="s">
      <EuiBasicTable
        className="header-single-value-euiBasicTable"
        items={tableItems}
        columns={tableColumns}
      />
    </ContentPanel>
  );
}
