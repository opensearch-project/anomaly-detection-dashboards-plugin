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
//@ts-ignore
import moment from 'moment';
import { EuiBasicTableColumn, EuiText, EuiIconTip } from '@elastic/eui';
import { columnStyle } from '../../DetectorsList/utils/tableUtils';

export const DEFAULT_EMPTY_DATA = '-';

const renderTime = (time: number) => {
  const momentTime = moment(time);
  if (time && momentTime.isValid()) return momentTime.format('MM/DD/YY h:mm A');
  return DEFAULT_EMPTY_DATA;
};

export const ENTITY_VALUE_FIELD = 'entityValue';

export const staticColumn = [
  {
    field: 'startTime',
    name: 'Start time',
    sortable: true,
    truncateText: false,
    render: renderTime,
    dataType: 'date',
  },
  {
    field: 'endTime',
    name: 'End time',
    sortable: true,
    truncateText: false,
    render: renderTime,
    dataType: 'date',
  },
  {
    field: 'confidence',
    name: (
      <EuiText size="xs" style={columnStyle}>
        <b>Confidence</b>{' '}
        <EuiIconTip
          content="Indicates the level of confidence in the anomaly result."
          position="top"
          type="iInCircle"
        />
      </EuiText>
    ),
    sortable: true,
    truncateText: false,
    dataType: 'number',
  },
  {
    field: 'anomalyGrade',
    name: (
      <EuiText size="xs" style={columnStyle}>
        <b>Anomaly grade</b>{' '}
        <EuiIconTip
          content="Indicates to what extent this data point is anomalous. The scale ranges from 0 to 1."
          position="top"
          type="iInCircle"
        />
      </EuiText>
    ),
    sortable: true,
    truncateText: false,
    dataType: 'number',
  },
] as EuiBasicTableColumn<any>[];

export const entityValueColumn = {
  field: ENTITY_VALUE_FIELD,
  name: 'Entity',
  sortable: true,
  truncateText: false,
  dataType: 'number',
} as EuiBasicTableColumn<any>;
