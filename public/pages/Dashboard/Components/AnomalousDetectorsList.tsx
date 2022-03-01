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

import { DetectorListItem } from '../../../models/interfaces';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import {
  //@ts-ignore
  EuiBasicTable,
} from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { anomalousDetectorsStaticColumn } from '../utils/utils';
import { SORT_DIRECTION } from '../../../../server/utils/constants';
import { MAX_DETECTORS } from '../../../utils/constants';
import { get, orderBy } from 'lodash';

export interface AnomalousDetectorsListProps {
  selectedDetectors: DetectorListItem[];
}

export const AnomalousDetectorsList = (props: AnomalousDetectorsListProps) => {
  const [fieldForSort, setFieldForSort] = useState('name');
  const [sortDirection, setSortDirection] = useState(SORT_DIRECTION.ASC);
  const [indexOfPage, setIndexOfPage] = useState(0);
  const [sizeOfPage, setSizeOfPage] = useState(10);

  const sorting = {
    sort: {
      direction: sortDirection,
      field: fieldForSort,
    },
  };
  const pagination = {
    pageIndex: indexOfPage,
    pageSize: sizeOfPage,
    totalItemCount: Math.min(MAX_DETECTORS, props.selectedDetectors.length),
    pageSizeOptions: [5, 10, 20, 50],
  };

  useEffect(() => {
    setIndexOfPage(0);
  }, [props.selectedDetectors]);

  const handleTableChange = ({ page: tablePage = {}, sort = {} }: any) => {
    const { index: page, size } = tablePage;
    const { field: sortField, direction: direction } = sort;
    setIndexOfPage(page);
    setSizeOfPage(size);
    setSortDirection(direction);
    setFieldForSort(sortField);
  };

  const getOrderedDetectorsForPage = (
    selectedDetectors: DetectorListItem[],
    pageIdx: number,
    sizePerPage: number,
    directionForSort: SORT_DIRECTION,
    fieldForSort: string
  ) => {
    const orderedDetectors = orderBy(
      selectedDetectors,
      (detector) => get(detector, fieldForSort, ''),
      directionForSort
    );
    return orderedDetectors.slice(
      pageIdx * sizePerPage,
      (pageIdx + 1) * sizePerPage
    );
  };

  return (
    <div style={{ height: 'auto' }}>
      <ContentPanel title="Detectors and features" titleSize="s">
        <EuiBasicTable<any>
          data-test-subj="dashboardDetectorTable"
          items={getOrderedDetectorsForPage(
            props.selectedDetectors,
            indexOfPage,
            sizeOfPage,
            sortDirection,
            fieldForSort
          )}
          columns={anomalousDetectorsStaticColumn}
          tableLayout={'auto'}
          onChange={handleTableChange}
          sorting={sorting}
          pagination={pagination}
          compressed
        />
      </ContentPanel>
    </div>
  );
};
