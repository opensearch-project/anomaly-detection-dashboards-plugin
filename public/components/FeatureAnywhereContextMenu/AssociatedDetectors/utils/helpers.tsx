/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiBasicTableColumn, EuiHealth, EuiLink } from '@elastic/eui';
import { DETECTOR_STATE } from 'server/utils/constants';
import { stateToColorMap } from '../../../../pages/utils/constants';
import { PLUGIN_NAME } from '../../../../utils/constants';
import { Detector } from '../../../../models/interfaces';

export const renderState = (state: DETECTOR_STATE) => {
  return (
    //@ts-ignore
    <EuiHealth color={stateToColorMap.get(state)}>{state}</EuiHealth>
  );
};

export const getColumns = ({ handleUnlinkDetectorAction }) =>
  [
    {
      field: 'name',
      name: 'Detector',
      sortable: true,
      truncateText: true,
      width: '30%',
      align: 'left',
      render: (name: string, detector: Detector) => (
        <EuiLink href={`${PLUGIN_NAME}#/detectors/${detector.id}`}>
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'curState',
      name: 'Real-time state',
      sortable: true,
      align: 'left',
      width: '30%',
      truncateText: true,
      render: renderState,
    },
    {
      field: 'totalAnomalies',
      name: 'Anomalies/24hr',
      sortable: true,
      dataType: 'number',
      align: 'left',
      truncateText: true,
      width: '30%',
    },
    {
      name: 'Actions',
      align: 'left',
      truncateText: true,
      width: '10%',
      actions: [
        {
          type: 'icon',
          name: 'Remove association',
          description: 'Remove association',
          icon: 'unlink',
          onClick: handleUnlinkDetectorAction,
          "data-test-subj":"unlinkButton",
        },
      ],
    },
  ] as EuiBasicTableColumn<any>[];

export const search = {
  box: {
    incremental: true,
    schema: true,
  },
};
