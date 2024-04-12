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
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
} from '@elastic/eui';
import React from 'react';
import { getDetectorStateOptions } from '../../utils/helpers';
import { DETECTOR_STATE } from '../../../../utils/constants';

interface ListFiltersProps {
  activePage: number;
  pageCount: number;
  search: string;
  selectedDetectorStates: DETECTOR_STATE[];
  selectedIndices: string[];
  indexOptions: EuiComboBoxOptionProps[];
  onDetectorStateChange: (options: EuiComboBoxOptionProps[]) => void;
  onIndexChange: (options: EuiComboBoxOptionProps[]) => void;
  onSearchDetectorChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchIndexChange: (searchValue: string) => void;
  onPageClick: (pageNumber: number) => void;
}
export const ListFilters = (props: ListFiltersProps) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={false} style={{ width: '40%' }}>
      <EuiFieldSearch
        fullWidth={true}
        value={props.search}
        placeholder="Search"
        onChange={props.onSearchDetectorChange}
        data-test-subj="detectorListSearch"
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiComboBox
        id="selectedDetectorStates"
        data-test-subj="detectorStateFilter"
        placeholder="All detector states"
        isClearable={true}
        singleSelection={false}
        options={getDetectorStateOptions()}
        onChange={props.onDetectorStateChange}
        selectedOptions={
          props.selectedDetectorStates.length > 0
            ? props.selectedDetectorStates.map((index) => ({ label: index }))
            : []
        }
        fullWidth={true}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiComboBox
        id="selectedIndices"
        data-test-subj="indicesFilter"
        placeholder="All indices"
        isClearable={true}
        singleSelection={false}
        options={props.indexOptions}
        onChange={props.onIndexChange}
        onSearchChange={props.onSearchIndexChange}
        selectedOptions={
          props.selectedIndices.length > 0
            ? props.selectedIndices.map((index) => ({ label: index }))
            : []
        }
        fullWidth={true}
      />
    </EuiFlexItem>
    {props.pageCount > 1 ? (
      <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
        <EuiPagination
          pageCount={props.pageCount}
          activePage={props.activePage}
          onPageClick={props.onPageClick}
          data-test-subj="detectorPageControls"
        />
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);
