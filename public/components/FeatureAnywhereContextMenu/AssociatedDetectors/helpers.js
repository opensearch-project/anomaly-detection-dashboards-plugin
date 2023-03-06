import React from 'react';
import { EuiHealth } from '@elastic/eui';


export const stateToLabel = {
  running: { label: 'Running', color: 'success' },
  initializing: { label: 'Initializing', color: 'active' },
};

export const getColumns = ({ onUnlink, onView }) => [
  {
    field: 'name',
    name: 'Detector',
    sortable: true,
    truncateText: true,
    width: '50%',
  },
  {
    field: 'state',
    name: 'Real-time state',
    sortable: true,
    width: '105px',
    render: (state) => (
      <EuiHealth color={stateToLabel[state].color}>{stateToLabel[state].label}</EuiHealth>
    ),
  },
  {
    field: 'occurance',
    name: 'Anomalies/24hr',
    sortable: true,
    truncateText: true,
    width: '50%',
  },
  {
    name: 'Actions',
    actions: [
      {
        type: 'icon',
        name: 'Unlink Detector',
        description: 'Unlink Detector',
        icon: 'unlink',
        onClick: onUnlink,
      }
    ],
  },
];

export const search = {
  box: {
    incremental: true,
    schema: true,
  },
};
