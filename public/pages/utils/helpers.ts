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

import { CatIndex, IndexAlias } from '../../../server/models/types';
import sortBy from 'lodash/sortBy';
import { DetectorListItem } from '../../models/interfaces';
import { SORT_DIRECTION } from '../../../server/utils/constants';
import { ALL_INDICES, ALL_DETECTOR_STATES } from './constants';
import { DETECTOR_STATE } from '../../../server/utils/constants';
import { timeFormatter } from '@elastic/charts';

export function sanitizeSearchText(searchValue: string): string {
  if (!searchValue || searchValue == '*') {
    return '';
  }
  if (canAppendWildcard(searchValue)) {
    return `*${searchValue}*`;
  } else {
    return searchValue;
  }
}
function canAppendWildcard(searchValue: string): boolean {
  // If it's not a letter or number, reject it
  if (!searchValue || !/[a-z0-9]/i.test(searchValue)) {
    return false;
  }
  return true;
}

const isUserIndex = (index: string) => {
  if (!index) {
    return false;
  }
  return !index.startsWith('.');
};

export function getVisibleOptions(indices: CatIndex[], aliases: IndexAlias[]) {
  const visibleIndices = indices
    .filter((value) => isUserIndex(value.index))
    .map((value) => ({ label: value.index, health: value.health }));
  const visibleAliases = aliases
    .filter((value) => isUserIndex(value.alias))
    .map((value) => ({ label: value.alias }));

  return [
    {
      label: 'Indices',
      options: visibleIndices,
    },
    {
      label: 'Aliases',
      options: visibleAliases,
    },
  ];
}

export const filterAndSortDetectors = (
  detectors: DetectorListItem[],
  search: string,
  selectedIndices: string[],
  selectedDetectorStates: DETECTOR_STATE[],
  sortField: string,
  sortDirection: string
) => {
  let filteredBySearch =
    search == ''
      ? detectors
      : detectors.filter((detector) => detector.name.includes(search));
  let filteredBySearchAndState =
    selectedDetectorStates == ALL_DETECTOR_STATES
      ? filteredBySearch
      : filteredBySearch.filter((detector) =>
          selectedDetectorStates.includes(detector.curState)
        );
  let filteredBySearchAndStateAndIndex =
    selectedIndices == ALL_INDICES
      ? filteredBySearchAndState
      : filteredBySearchAndState.filter((detector) =>
          selectedIndices.includes(detector.indices[0])
        );
  let sorted = sortBy(filteredBySearchAndStateAndIndex, sortField);
  if (sortDirection == SORT_DIRECTION.DESC) {
    sorted = sorted.reverse();
  }
  return sorted;
};

export const getDetectorsToDisplay = (
  detectors: DetectorListItem[],
  page: number,
  size: number
) => {
  return detectors.slice(size * page, page * size + size);
};

export const dateFormatter = timeFormatter('MM/DD/YY hh:mm:ss A');
export const minuteDateFormatter = timeFormatter('MM/DD/YY hh:mm A');

export const formatNumber = (data: any) => {
  try {
    const value = parseFloat(data);
    return !value ? value : value.toFixed(2);
  } catch (err) {
    return '';
  }
};
