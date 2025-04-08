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
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiLink,
  EuiSteps,
  EuiBasicTable,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';

type DataConnectionFlyoutProps = {
  indices: any;
  onClose(): void;
  localClusterName: string;
};

const columns = [
  {
    field: 'cluster',
    name: 'Data connection',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'index',
    name: 'Index',
    sortable: true,
    truncateText: true,
  },
];

const getIndexItemsToDisplay = (props: DataConnectionFlyoutProps) => {
  const indexItems = props.indices.map((index = '', int) => {
    const item = { id: int };
    const shouldSplit = index.includes(':');
    const splitIndex = index.split(':');
    let clusterName = shouldSplit ? splitIndex[0] : props.localClusterName;
    clusterName =
      clusterName === props.localClusterName && !shouldSplit
        ? `${clusterName} (Local)`
        : `${clusterName} (Remote)`;
    const indexName = shouldSplit ? splitIndex[1] : index;
    item.cluster = clusterName;
    item.index = indexName;
    return item;
  });
  return indexItems;
};

export const DataConnectionFlyout = (props: DataConnectionFlyoutProps) => {
  return (
    <EuiFlyout size="m" onClose={props.onClose}>
      <EuiFlyoutHeader hasBorder className="flyout">
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem className={'eui-textTruncate'}>
            <EuiTitle
              className={'eui-textTruncate'}
              size={'m'}
              data-test-subj={'dataSourcesFlyout_header'}
            >
              <h3>{`Index`}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}></EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        // @ts-ignore
        style={{ overflowY: 'auto' }}
      >
        <EuiBasicTable
          items={getIndexItemsToDisplay(props)}
          itemId={(item) => item.id}
          columns={columns}
          //pagination={true}
          isSelectable={false}
          hasActions={false}
          noItemsMessage={'No data sources configured for this detector.'}
          data-test-subj={'dataConnectionsFlyout_table'}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={true}></EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
