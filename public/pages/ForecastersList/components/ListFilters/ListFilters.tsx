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
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiCompressedFieldSearch,
  EuiCompressedComboBox,
  EuiBadge,
} from '@elastic/eui';
import { getForecasterStateOptions } from '../../utils/helpers';
import { FORECASTER_STATE, FORECASTER_STATE_TO_DISPLAY } from '../../../../../server/utils/constants';

interface ListFiltersProps {
  search: string;
  selectedForecasterStates: FORECASTER_STATE[];
  selectedIndices: string[];
  indexOptions: EuiComboBoxOptionProps[];
  onForecasterStateChange: (options: EuiComboBoxOptionProps[]) => void;
  onIndexChange: (options: EuiComboBoxOptionProps[]) => void;
  onSearchForecasterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchIndexChange: (searchValue: string) => void;
}

const getVisibleIndices = (props) => {
  const visibleIndices = props.selectedIndices.length > 0
            ? props.selectedIndices.map((index) => ({ label: index }))
            : []
  return visibleIndices;
}

const getPlaceholderWithBadge = (label: string, count: number) => {
  if (count > 0) {
    return (
      <>
        {label} <EuiBadge color="default">{count}</EuiBadge>
      </>
    );
  }
  return label;
};

// The ratio is now approximately 4:1:2 between search:status:index
export const ListFilters = (props: ListFiltersProps) => {
  console.log('ListFilters props:', {
    selectedForecasterStates: props.selectedForecasterStates,
    stateOptions: getForecasterStateOptions()
  });

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={4}>
        <EuiCompressedFieldSearch
          fullWidth={true}
          value={props.search}
          placeholder="Search"
          onChange={props.onSearchForecasterChange}
          data-test-subj="forecasterListSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiCompressedComboBox
          id="selectedForecasterStates"
          data-test-subj="forecasterStateFilter"
          placeholder={getPlaceholderWithBadge('Status', props.selectedForecasterStates.length).toString()}
          isClearable={true}
          singleSelection={false}
          options={(() => {
            const options = getForecasterStateOptions();
            console.log('State filter options:', options);
            return options;
          })()}
          onChange={(selectedOptions) => {
            console.log('State filter onChange called with:', selectedOptions);
            props.onForecasterStateChange(selectedOptions);
            setTimeout(() => {
              console.log('After onForecasterStateChange, props are now:', props.selectedForecasterStates);
            }, 0);
          }}
          selectedOptions={(() => {
            const displayStates = props.selectedForecasterStates.map(
              (state: FORECASTER_STATE) => FORECASTER_STATE_TO_DISPLAY[state]
            );
            const uniqueDisplayStates = [...new Set(displayStates)];
            const mappedOptions = uniqueDisplayStates.map((displayState) => ({
              label: displayState,
            }));
            return mappedOptions;
          })()}
          fullWidth={true}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiCompressedComboBox
          id="selectedIndices"
          data-test-subj="indicesFilter"
          placeholder={getPlaceholderWithBadge('Indices', props.selectedIndices.length).toString()}
          isClearable={true}
          singleSelection={false}
          options={props.indexOptions}
          onChange={props.onIndexChange}
          onSearchChange={props.onSearchIndexChange}
          selectedOptions={getVisibleIndices(props)}
          fullWidth={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
