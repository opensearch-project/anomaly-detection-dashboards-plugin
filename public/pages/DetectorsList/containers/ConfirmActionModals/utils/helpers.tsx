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
import { EuiLink, EuiText, EuiIcon, EuiDataGrid } from '@elastic/eui';
import { getAlertingMonitorListLink } from '../../../../../utils/utils';
import { Monitor } from '../../../../../models/interfaces';
import { DetectorListItem } from '../../../../../models/interfaces';
import { PLUGIN_NAME } from '../../../../../utils/constants';
import { get, isEmpty } from 'lodash';
import { DETECTOR_STATE } from '../../../../../../server/utils/constants';

const getNames = (detectors: DetectorListItem[]) => {
  let data = [];
  for (let i = 0; i < detectors.length; i++) {
    data.push({
      Detector: (
        <EuiLink
          href={`${PLUGIN_NAME}#/detectors/${detectors[i].id}`}
          target="_blank"
        >
          {detectors[i].name} <EuiIcon type="popout" size="s" />
        </EuiLink>
      ),
    });
  }
  return data;
};

const getNamesAndMonitors = (
  detectors: DetectorListItem[],
  monitors: { [key: string]: Monitor }
) => {
  let data = [];
  for (let i = 0; i < detectors.length; i++) {
    const relatedMonitor = get(monitors, `${detectors[i].id}`);
    if (relatedMonitor) {
      data.push({
        Detector: (
          <EuiLink
            href={`${PLUGIN_NAME}#/detectors/${detectors[i].id}`}
            target="_blank"
          >
            {detectors[i].name} <EuiIcon type="popout" size="s" />
          </EuiLink>
        ),
        Monitor: (
          <EuiLink
            href={`${getAlertingMonitorListLink()}/${relatedMonitor.id}`}
            target="_blank"
          >
            {relatedMonitor.name} <EuiIcon type="popout" size="s" />
          </EuiLink>
        ),
      });
    } else {
      data.push({
        Detector: (
          <EuiLink
            href={`${PLUGIN_NAME}#/detectors/${detectors[i].id}`}
            target="_blank"
          >
            {detectors[i].name} <EuiIcon type="popout" size="s" />
          </EuiLink>
        ),
        Monitor: '-',
      });
    }
  }
  return data;
};

const getNamesAndMonitorsAndStates = (
  detectors: DetectorListItem[],
  monitors: { [key: string]: Monitor }
) => {
  let data = [];
  for (let i = 0; i < detectors.length; i++) {
    const relatedMonitor = get(monitors, `${detectors[i].id}`);
    const isRunning =
      detectors[i].curState === DETECTOR_STATE.INIT ||
      detectors[i].curState === DETECTOR_STATE.RUNNING;
    if (relatedMonitor) {
      data.push({
        Detector: (
          <EuiLink
            href={`${PLUGIN_NAME}#/detectors/${detectors[i].id}`}
            target="_blank"
          >
            {detectors[i].name} <EuiIcon type="popout" size="s" />
          </EuiLink>
        ),
        Monitor: (
          <EuiLink
            href={`${getAlertingMonitorListLink()}/${relatedMonitor.id}`}
            target="_blank"
          >
            {relatedMonitor.name} <EuiIcon type="popout" size="s" />
          </EuiLink>
        ),
        Running: <EuiText>{isRunning ? 'Yes' : 'No'}</EuiText>,
      });
    } else {
      data.push({
        Detector: (
          <EuiLink
            href={`${PLUGIN_NAME}#/detectors/${detectors[i].id}`}
            target="_blank"
          >
            {detectors[i].name} <EuiIcon type="popout" size="s" />
          </EuiLink>
        ),
        Monitor: '-',
        Running: <EuiText>{isRunning ? 'Yes' : 'No'}</EuiText>,
      });
    }
  }
  return data;
};

export const getNamesGrid = (detectors: DetectorListItem[]) => {
  const gridData = getNames(detectors);
  return (
    <EuiDataGrid
      aria-label="Detector names"
      columns={[
        {
          id: 'Detector',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
      ]}
      columnVisibility={{
        visibleColumns: ['Detector'],
        setVisibleColumns: () => {},
      }}
      rowCount={gridData.length}
      renderCellValue={({ rowIndex, columnId }) =>
        //@ts-ignore
        gridData[rowIndex][columnId]
      }
      gridStyle={{
        border: 'horizontal',
        header: 'shade',
        rowHover: 'highlight',
        stripes: true,
      }}
      toolbarVisibility={false}
    />
  );
};

export const getNamesAndMonitorsGrid = (
  detectors: DetectorListItem[],
  monitors: { [key: string]: Monitor }
) => {
  const gridData = getNamesAndMonitors(detectors, monitors);
  return (
    <EuiDataGrid
      aria-label="Detector names and monitors"
      columns={[
        {
          id: 'Detector',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
        {
          id: 'Monitor',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
      ]}
      columnVisibility={{
        visibleColumns: ['Detector', 'Monitor'],
        setVisibleColumns: () => {},
      }}
      rowCount={gridData.length}
      renderCellValue={({ rowIndex, columnId }) =>
        //@ts-ignore
        gridData[rowIndex][columnId]
      }
      gridStyle={{
        border: 'horizontal',
        header: 'shade',
        rowHover: 'highlight',
        stripes: true,
      }}
      toolbarVisibility={false}
    />
  );
};

export const getNamesAndMonitorsAndStatesGrid = (
  detectors: DetectorListItem[],
  monitors: { [key: string]: Monitor }
) => {
  const gridData = getNamesAndMonitorsAndStates(detectors, monitors);
  return (
    <EuiDataGrid
      aria-label="Detector names and monitors and state"
      columns={[
        {
          id: 'Detector',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
        {
          id: 'Monitor',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
        {
          id: 'Running',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
      ]}
      columnVisibility={{
        visibleColumns: ['Detector', 'Monitor', 'Running'],
        setVisibleColumns: () => {},
      }}
      rowCount={gridData.length}
      renderCellValue={({ rowIndex, columnId }) =>
        //@ts-ignore
        gridData[rowIndex][columnId]
      }
      gridStyle={{
        border: 'horizontal',
        header: 'shade',
        rowHover: 'highlight',
        stripes: true,
      }}
      toolbarVisibility={false}
    />
  );
};

export const containsEnabledDetectors = (detectors: DetectorListItem[]) => {
  const enabledDetectors = detectors.filter(
    (detector) =>
      detector.curState === DETECTOR_STATE.RUNNING ||
      detector.curState === DETECTOR_STATE.INIT
  );
  return !isEmpty(enabledDetectors);
};
