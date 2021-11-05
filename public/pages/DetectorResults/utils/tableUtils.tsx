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
  name: 'Entities',
  sortable: true,
  truncateText: false,
  dataType: 'string',
  // To render newline character correctly
  style: { whiteSpace: 'pre-wrap' },
} as EuiBasicTableColumn<any>;
