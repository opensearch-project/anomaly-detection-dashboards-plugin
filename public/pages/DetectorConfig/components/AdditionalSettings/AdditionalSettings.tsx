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
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import React from 'react';
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
      categoryField: convertToCategoryFieldString(props.categoryField, ', '),
      windowSize: props.shingleSize,
    },
  ];
  const tableColumns = [
    { name: 'Category field', field: 'categoryField' },
    { name: 'Window size', field: 'windowSize' },
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
