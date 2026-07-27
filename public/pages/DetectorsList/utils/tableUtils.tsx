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

import {
  EuiLink,
  EuiText,
  EuiToolTip,
  EuiHealth,
  EuiBasicTableColumn,
} from '@elastic/eui';
//@ts-ignore
import moment from 'moment';
import { get, isEmpty } from 'lodash';
import React from 'react';
import { Detector } from '../../../models/interfaces';
import { PLUGIN_NAME } from '../../../utils/constants';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { stateToColorMap } from '../../utils/constants';
import { getApplication } from '../../../services';

export const DEFAULT_EMPTY_DATA = '-';

export const columnStyle = {
  overflow: 'visible',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
} as React.CSSProperties;

export const renderTime = (time: number) => {
  const momentTime = moment(time);
  if (time && momentTime.isValid())
    return momentTime.format('MM/DD/YYYY h:mm A');
  return DEFAULT_EMPTY_DATA;
};

export const renderIndices = (indices: string[]) => {
  return get(indices, '0', DEFAULT_EMPTY_DATA);
};

export const renderState = (state: DETECTOR_STATE) => {
  return (
    //@ts-ignore
    <EuiHealth color={stateToColorMap.get(state)}>{state}</EuiHealth>
  );
};

export function getColumns(dataSourceId) {
  return [
    {
      field: 'name',
      name: (
        <EuiToolTip content="The name of the detector">
          <span style={columnStyle}>Detector{''}</span>
        </EuiToolTip>
      ),
      sortable: true,
      truncateText: true,
      textOnly: true,
      align: 'left',
      width: '15%',
      render: (name: string, detector: Detector) => {
        let href = `${PLUGIN_NAME}#/detectors/${detector.id}/results`;
        if (dataSourceId) {
          href += `?dataSourceId=${dataSourceId}`;
        }
        return <EuiLink href={href}>{name}</EuiLink>;
      },
    },
    {
      field: 'indices',
      name: (
        <EuiToolTip content="The index or index pattern used for the detector">
          <span style={columnStyle}>Indices{''}</span>
        </EuiToolTip>
      ),
      sortable: true,
      truncateText: true,
      textOnly: true,
      align: 'left',
      width: '15%',
      render: renderIndices,
    },
    {
      field: 'curState',
      name: (
        <EuiToolTip content="The current state of the real-time detection job">
          <span style={columnStyle}>Real-time state{''}</span>
        </EuiToolTip>
      ),
      sortable: true,
      dataType: 'string',
      align: 'left',
      width: '12%',
      truncateText: false,
      render: renderState,
    },
    {
      field: 'task',
      name: (
        <EuiToolTip content="This column indicates historical analysis detection and will take you to view historical results">
          <span style={columnStyle}>Historical analysis{''}</span>
        </EuiToolTip>
      ),
      sortable: true,
      truncateText: true,
      textOnly: true,
      align: 'left',
      width: '15%',
      render: (name: string, detector: Detector) => {
        if (!isEmpty(detector.taskId)) {
          let href = `${PLUGIN_NAME}#/detectors/${detector.id}/historical`;
          if (dataSourceId) {
            href += `?dataSourceId=${dataSourceId}`;
          }
          return <EuiLink href={href}>View results</EuiLink>;
        } else {
          return <EuiText>-</EuiText>;
        }
      },
    },
    {
      field: 'totalAnomalies',
      name: (
        <EuiToolTip content="Total real-time anomalies with a grade > 0 in last 24 hours">
          <span style={columnStyle}>Anomalies last 24 hours{''}</span>
        </EuiToolTip>
      ),
      sortable: true,
      dataType: 'number',
      align: 'right',
      width: '16%',
      truncateText: false,
    },
    {
      field: 'lastActiveAnomaly',
      name: (
        <EuiToolTip content="Time of the last active real-time anomaly with a grade > 0">
          <span style={columnStyle}>Last real-time occurrence{''}</span>
        </EuiToolTip>
      ),
      sortable: true,
      dataType: 'date',
      truncateText: false,
      align: 'left',
      width: '16%',
      render: renderTime,
    },
    {
      field: 'enabledTime',
      name: (
        <EuiToolTip content="The time the real-time detector was last started">
          <span style={columnStyle}>Last started{''}</span>
        </EuiToolTip>
      ),
      sortable: true,
      dataType: 'date',
      truncateText: false,
      align: 'left',
      width: '16%',
      render: renderTime,
    },
    ...(isResourceSharingAvailable()
      ? [
          {
            // Resource-sharing SPI marker column: the centralized Share button is
            // mounted here by security-dashboards-plugin when installed and enabled.
            name: (
              <EuiToolTip content="Manage who this detector is shared with">
                <span style={columnStyle}>Share{''}</span>
              </EuiToolTip>
            ),
            sortable: false,
            truncateText: false,
            align: 'center',
            width: '5%',
            render: (detector: Detector) => (
              <div
                data-resource-share-button
                data-resource-id={detector.id}
                data-resource-type="anomaly-detector"
                data-resource-share-display="icon"
                {...(dataSourceId ? { 'data-resource-data-source-id': dataSourceId } : {})}
              />
            ),
          },
        ]
      : []),
  ] as EuiBasicTableColumn<any>[];
}

/**
 * Whether the resource-sharing feature is available, via the core capability
 * registered by security-dashboards-plugin. False when that plugin is not
 * installed or the feature is disabled — no plugin dependency involved.
 */
function isResourceSharingAvailable(): boolean {
  try {
    return !!(getApplication().capabilities as any)?.resourceSharing?.enabled;
  } catch (e) {
    return false;
  }
}
