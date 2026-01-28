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
    align: 'center',
    // add width on each column to leave more room for the entity value column
    // as it tends to be longer than the other columns
    width: '130px',
  },
  {
    field: 'endTime',
    name: 'End time',
    sortable: true,
    truncateText: false,
    render: renderTime,
    dataType: 'date',
    align: 'center',
    width: '130px',
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
    align: 'center',
    width: '100px',
    render: (confidence: number) => (
      <span style={{ textAlign: 'center', display: 'block' }}>
        {confidence ? confidence.toFixed(2) : DEFAULT_EMPTY_DATA}
      </span>
    ),
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
    align: 'center',
    width: '140px',
    render: (anomalyGrade: number) => (
      <span style={{ textAlign: 'center', display: 'block' }}>
        {anomalyGrade ? anomalyGrade.toFixed(2) : DEFAULT_EMPTY_DATA}
      </span>
    ),
  },
  {
    field: 'actions',
    name: (
      <EuiText size="xs" style={columnStyle}>
        <b>Actions</b>{' '}
        <EuiIconTip
          content="This will create an index pattern with the indices used to create this detector (if it doesn't exist) and open the anomaly logs in Discover."
          position="top"
          type="iInCircle"
        />
      </EuiText>
    ),
    align: 'center',
    truncateText: false,
    width: '80px',
    actions: [
      {
        type: 'icon',
        name: 'View in Discover',
        description: 'View in Discover',
        icon: 'editorLink',
        onClick: () => {},
        'data-test-subj': 'discoverIcon',
      },
    ],
  } 
] as EuiBasicTableColumn<any>[];

export const entityValueColumn = {
  field: ENTITY_VALUE_FIELD,
  name: 'Entities',
  sortable: true,
  truncateText: false,
  dataType: 'string',
  align: 'center',
  width: '260px',
  render: (entityValue: string) => (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {entityValue || DEFAULT_EMPTY_DATA}
    </div>
  ),
} as EuiBasicTableColumn<any>;
