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
  EuiBasicTable as EuiBasicTableComponent,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { get } from 'lodash';
import React, { useEffect, useState } from 'react';
import { SORT_DIRECTION } from '../../../../server/utils/constants';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import {
  entityValueColumn,
  staticColumn,
  ENTITY_VALUE_FIELD,
} from '../utils/tableUtils';
import { DetectorResultsQueryParams } from 'server/models/types';
import { AnomalyData } from '../../../models/interfaces';
import { getTitleWithCount } from '../../../utils/utils';
import { convertToCategoryFieldAndEntityString } from '../../utils/anomalyResultUtils';
import { HeatmapCell } from '../../AnomalyCharts/containers/AnomalyHeatmapChart';
import { getSavedObjectsClient, getNotifications, getDataSourceEnabled } from '../../../services';

//@ts-ignore
const EuiBasicTable = EuiBasicTableComponent as any;

interface AnomalyResultsTableProps {
  anomalies: AnomalyData[];
  isHCDetector?: boolean;
  isHistorical?: boolean;
  selectedHeatmapCell?: HeatmapCell | undefined;
  detectorIndex: string[];
  detectorTimeField: string;
}

interface ListState {
  page: number;
  queryParams: DetectorResultsQueryParams;
}
const MAX_ANOMALIES = 10000;

export function AnomalyResultsTable(props: AnomalyResultsTableProps) {
  const [state, setState] = useState<ListState>({
    page: 0,
    queryParams: {
      from: 0,
      size: 10,
      sortDirection: SORT_DIRECTION.DESC,
      sortField: 'startTime',
    },
  });
  const [targetAnomalies, setTargetAnomalies] = useState<any[]>([] as any[]);

  // Only return anomalies if they exist. If high-cardinality: only show when a heatmap cell is selected
  const totalAnomalies =
    props.anomalies &&
    ((props.isHCDetector && props.selectedHeatmapCell) || !props.isHCDetector)
      ? props.anomalies.filter((anomaly) => anomaly.anomalyGrade > 0)
      : [];

  const handleOpenDiscover = async (startTime: number, endTime: number, item: any) => {
    try {
      // calculate time range with 10-minute buffer on each side per customer request
      const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
      const startISO = new Date(startTime - TEN_MINUTES_IN_MS).toISOString();
      const endISO = new Date(endTime + TEN_MINUTES_IN_MS).toISOString();
      
      const basePath = `${window.location.origin}${window.location.pathname.split('/app/')[0]}`;
      
      const savedObjectsClient = getSavedObjectsClient();
      
      const indexPatternTitle = props.detectorIndex.join(',');
      
      // try to find an existing index pattern with this title
      const indexPatternResponse = await savedObjectsClient.find({
        type: 'index-pattern',
        fields: ['title'],
        search: `"${indexPatternTitle}"`,
        searchFields: ['title'],
      });
      
      let indexPatternId;
      
      if (indexPatternResponse.savedObjects.length > 0) {
        indexPatternId = indexPatternResponse.savedObjects[0].id;
      } else {
        // try to create a new index pattern
        try {
          const newIndexPattern = await savedObjectsClient.create('index-pattern', {
            title: indexPatternTitle,
            timeFieldName: props.detectorTimeField,
          });
          
          indexPatternId = newIndexPattern.id;

          getNotifications().toasts.addSuccess(`Created new index pattern: ${indexPatternTitle}`);
        } catch (error) {
          getNotifications().toasts.addDanger(`Failed to create index pattern: ${error.message}`);
          return;
        }
      }
      
      // put query params for HC detector
      let queryParams = '';
      if (props.isHCDetector && item[ENTITY_VALUE_FIELD]) {
        const entityValues = item[ENTITY_VALUE_FIELD].split('\n').map((s: string) => s.trim()).filter(Boolean);
        const filters = entityValues.map((entityValue: string) => {
          const [field, value] = entityValue.split(': ').map((s: string) => s.trim());
          return `('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'${indexPatternId}',key:${field},negate:!f,params:(query:${value}),type:phrase),query:(match_phrase:(${field}:${value})))`;
        });
        
        queryParams = `filters:!(${filters.join(',')}),`;
      }

      const discoverUrl = `${basePath}/app/data-explorer/discover#?_a=(discover:(columns:!(_source),isDirty:!f,sort:!()),metadata:(indexPattern:'${indexPatternId}',view:discover))&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${startISO}',to:'${endISO}'))&_q=(${queryParams}query:(language:kuery,query:''))`;
      
      window.open(discoverUrl, '_blank');
    } catch (error) {
      getNotifications().toasts.addDanger('Error opening discover view');
    }
  };

  const getCustomColumns = () => {
    const dataSourceEnabled = getDataSourceEnabled().enabled;
    const columns = [...staticColumn] as any[];
    
    if (!dataSourceEnabled) {
      const actionsColumnIndex = columns.findIndex((column: any) => column.field === 'actions');
      
      if (actionsColumnIndex !== -1) {
        const actionsColumn = { ...columns[actionsColumnIndex] } as any;
        
        if (actionsColumn.actions && Array.isArray(actionsColumn.actions)) {
          actionsColumn.actions = [
            {
              ...actionsColumn.actions[0],
              onClick: (item: any) => handleOpenDiscover(item.startTime, item.endTime, item),
            },
          ];
        }
        
        columns[actionsColumnIndex] = actionsColumn;
      }
    } else {
      const actionsColumnIndex = columns.findIndex((column: any) => column.field === 'actions');
      if (actionsColumnIndex !== -1) {
        columns.splice(actionsColumnIndex, 1);
      }
    }
    
    return columns;
  };

  const sortFieldCompare = (field: string, sortDirection: SORT_DIRECTION) => {
    return (a: any, b: any) => {
      if (get(a, `${field}`) > get(b, `${field}`))
        return sortDirection === SORT_DIRECTION.ASC ? 1 : -1;
      if (get(a, `${field}`) < get(b, `${field}`))
        return sortDirection === SORT_DIRECTION.ASC ? -1 : 1;
      return 0;
    };
  };

  useEffect(() => {
    // Only return anomalies if they exist. If high-cardinality: only show when a heatmap cell is selected
    let anomalies =
      props.anomalies &&
      ((props.isHCDetector && props.selectedHeatmapCell) || !props.isHCDetector)
        ? props.anomalies.filter((anomaly) => anomaly.anomalyGrade > 0)
        : [];

    if (props.isHCDetector) {
      anomalies = anomalies.map((anomaly) => {
        return {
          ...anomaly,
          [ENTITY_VALUE_FIELD]: convertToCategoryFieldAndEntityString(
            get(anomaly, 'entity', [])
          ),
        };
      });
    }

    anomalies.sort(
      sortFieldCompare(
        state.queryParams.sortField,
        state.queryParams.sortDirection
      )
    );

    setTargetAnomalies(
      anomalies.slice(
        state.page * state.queryParams.size,
        (state.page + 1) * state.queryParams.size
      )
    );
  }, [props.anomalies, state]);

  const isLoading = false;

  const handleTableChange = ({ page: tablePage = {}, sort = {} }: any) => {
    const { index: page, size } = tablePage;
    const { field: sortField, direction: sortDirection } = sort;
    setState({
      page,
      queryParams: {
        ...state.queryParams,
        size,
        sortField,
        sortDirection,
      },
    });
  };

  const sorting = {
    sort: {
      direction: state.queryParams.sortDirection,
      field: state.queryParams.sortField,
    },
  };
  const pagination = {
    pageIndex: state.page,
    pageSize: state.queryParams.size,
    totalItemCount: Math.min(MAX_ANOMALIES, totalAnomalies.length),
    pageSizeOptions: [10, 30, 50, 100],
  };
  
  const customColumns = getCustomColumns();

  return (
    <ContentPanel
      title={getTitleWithCount('Anomaly occurrences', totalAnomalies.length)}
      titleDataTestSubj="anomalyOccurrencesHeader"
      titleSize="xs"
      titleClassName="preview-title"
    >
      <EuiBasicTable
        items={targetAnomalies}
        columns={
          props.isHCDetector && props.isHistorical
            ? [
                ...customColumns.slice(0, 2),
                entityValueColumn,
                ...customColumns.slice(3),
              ]
            : props.isHCDetector
            ? [
                ...customColumns.slice(0, 2),
                entityValueColumn,
                ...customColumns.slice(2),
              ]
            : props.isHistorical
            ? [...customColumns.slice(0, 2), ...customColumns.slice(3)]
            : customColumns
        }
        onChange={handleTableChange}
        sorting={sorting}
        pagination={pagination}
        noItemsMessage={
          isLoading ? (
            'Loading anomaly results...'
          ) : (
            <EuiEmptyPrompt
              style={{ maxWidth: '45em' }}
              body={
                <EuiText data-test-subj="noAnomaliesMessage" size="s">
                  <p>There are no anomalies currently.</p>
                </EuiText>
              }
            />
          )
        }
      />
    </ContentPanel>
  );
}
