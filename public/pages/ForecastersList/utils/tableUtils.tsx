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
  EuiToolTip,
  EuiHealth,
  EuiDataGridColumn,
} from '@elastic/eui';
//@ts-ignore
import moment from 'moment';
import React from 'react';
import {
  FORECASTING_FEATURE_NAME,
  FORECASTER_RESOURCE_TYPE,
} from '../../../utils/constants';
import { isResourceSharingAvailable } from '../../utils/helpers';
import { FORECASTER_STATE, FORECASTER_STATE_TO_DISPLAY } from '../../../../server/utils/constants';
import { forecastStateToColorMap } from '../../utils/constants';
import { CurStateCell } from './CurStateCell';

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

function renderIndices(indices) {
  if (!indices || indices.length === 0) {
    return DEFAULT_EMPTY_DATA;
  }
  return <>{indices.join(', ')}</>;
}

export const renderState = (state: FORECASTER_STATE) => {
  return (
    //@ts-ignore
    <EuiHealth color={forecastStateToColorMap.get(state)}>{FORECASTER_STATE_TO_DISPLAY[state]}</EuiHealth>
  );
};

export function getDataGridColumns(): EuiDataGridColumn[] {
  return [
    {
      id: 'name',
      displayAsText: 'Name',
      display: (
        <EuiToolTip content="The name of the forecaster">
          <span style={columnStyle}>Name</span>
        </EuiToolTip>
      ),
      isSortable: true,
      schema: 'string',
    },
    {
      id: 'indices',
      displayAsText: 'Indices',
      display: (
        <EuiToolTip content="The index or index pattern used for the forecaster">
          <span style={columnStyle}>Indices</span>
        </EuiToolTip>
      ),
      isSortable: true,
      schema: 'string',
    },
    {
      id: 'curState',
      displayAsText: 'Status',
      display: (
        <EuiToolTip content="The current state of the forecaster">
          <span style={columnStyle}>Status</span>
        </EuiToolTip>
      ),
      isSortable: true,
      schema: 'string',
      isExpandable: true,
    },
    {
      id: 'lastUpdateTime',
      displayAsText: 'Last updated',
      display: (
        <EuiToolTip content="Time of the last update">
          <span style={columnStyle}>Last updated</span>
        </EuiToolTip>
      ),
      isSortable: true,
      schema: 'datetime', // from dataType 'date'
      defaultSortDirection: 'desc',
    },
    ...(isResourceSharingAvailable(FORECASTER_RESOURCE_TYPE)
      ? [
          {
            // Resource-sharing SPI marker column: the centralized Share button
            // is mounted here by security-dashboards-plugin when installed and
            // resource sharing is enabled for forecasters.
            id: 'share',
            displayAsText: 'Share',
            display: (
              <EuiToolTip content="Manage who this forecaster is shared with">
                <span style={columnStyle}>Share</span>
              </EuiToolTip>
            ),
            isSortable: false,
            schema: 'string',
            initialWidth: 60,
          } as EuiDataGridColumn,
        ]
      : []),
  ];
}

export function renderCellValueFactory(
  forecasters, 
  dataSourceId?, 
  forceCollapsedRows?: Set<number>,
  forceCollapseRow?: (rowIndex: number) => void) {
  return function RenderCellValue({ rowIndex, columnId, setCellProps, isExpandable, isExpanded, isDetails }) {
    try {
      const forecaster = forecasters[rowIndex];
      if (!forecaster || rowIndex >= forecasters.length) {
        return null;
      }

      const value = forecaster[columnId];

      switch (columnId) {
        case 'name': {
          let href = `${FORECASTING_FEATURE_NAME}#/forecasters/${forecaster.id}/details`;
          
          if (dataSourceId) {
            href += `?dataSourceId=${dataSourceId}`;
          }
          
          // Add a timestamp to force a full component remount when navigating to details
          // This prevents issues with stale React refs that can cause endless loading
          // The URL parameter ensures React Router treats this as a completely fresh route,
          // properly resetting all component state including refs.
          href += (dataSourceId ? '&' : '?') + '_t=' + Date.now();
          
          return <EuiLink href={href}>{value}</EuiLink>;
        }

        case 'indices':
          return renderIndices(value);

        case 'curState':{
          // Check if the parent said "force collapse this row"
          const forciblyCollapsed = forceCollapsedRows?.has(rowIndex);

          // If the cell is not expanded, OR it's forcibly collapsed, just show the normal cell
          if (!isExpanded || forciblyCollapsed || value === FORECASTER_STATE.INACTIVE_NOT_STARTED) {
            return renderState(value);
          }

          // Otherwise, render CurStateCell
          return (
            <CurStateCell
              forecaster={forecaster}
              dataSourceId={dataSourceId}
              isExpanded={isExpanded}
              onForceCollapse={() => forceCollapseRow?.(rowIndex)} // pass rowIndex
            />
          );
        }

        case 'lastUpdateTime':
          return renderTime(value);

        case 'share':
          // Resource-sharing SPI marker: fulfilled by security-dashboards-plugin
          return (
            <div
              data-resource-share-button
              data-resource-id={forecaster.id}
              data-resource-type={FORECASTER_RESOURCE_TYPE}
              data-resource-share-display="icon"
              {...(dataSourceId
                ? { 'data-resource-data-source-id': dataSourceId }
                : {})}
            />
          );

        default:
          return <>{value}</>;
      }
    } catch (error) {
      console.error('Error rendering cell value:', error);
      return DEFAULT_EMPTY_DATA;
    }
  };
}
