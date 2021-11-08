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
import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';

interface ListControlsProps {
  activePage: number;
  pageCount: number;
  onPageClick: (pageNumber: number) => void;
}
export const ListControls = (props: ListControlsProps) => (
  <EuiFlexGroup
    style={{ padding: '0px 5px' }}
    alignItems="center"
    justifyContent="flexEnd"
  >
    {props.pageCount > 1 ? (
      <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
        <EuiPagination
          pageCount={props.pageCount}
          activePage={props.activePage}
          onPageClick={props.onPageClick}
          data-test-subj="anomaliesPageControls"
        />
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);
