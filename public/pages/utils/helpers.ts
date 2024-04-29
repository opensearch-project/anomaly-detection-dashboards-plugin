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
import queryString from 'query-string';
import {
  CatIndex,
  IndexAlias,
  MDSQueryParams,
} from '../../../server/models/types';
import sortBy from 'lodash/sortBy';
import { DetectorListItem } from '../../models/interfaces';
import { DETECTORS_QUERY_PARAMS, SORT_DIRECTION } from '../../../server/utils/constants';
import { ALL_INDICES, ALL_DETECTOR_STATES, MAX_DETECTORS, DEFAULT_QUERY_PARAMS } from './constants';
import { DETECTOR_STATE } from '../../../server/utils/constants';
import { timeFormatter } from '@elastic/charts';
import { getDataSourceEnabled, getDataSourcePlugin } from '../../services';

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

export const getAllDetectorsQueryParamsWithDataSourceId = (
  dataSourceId: string = ''
) => ({
  from: 0,
  search: '',
  indices: '',
  size: MAX_DETECTORS,
  sortDirection: SORT_DIRECTION.ASC,
  sortField: 'name',
  dataSourceId,
});

export const getSampleDetectorsQueryParamsWithDataSouceId = (
  dataSourceId: string = ''
) => ({
  from: 0,
  search: 'sample',
  indices: '',
  size: MAX_DETECTORS,
  sortDirection: SORT_DIRECTION.ASC,
  sortField: 'name',
  dataSourceId,
});

export const getDataSourceFromURL = (location: {
  search: string;
}): MDSQueryParams => {
  const queryParams = queryString.parse(location.search);
  const dataSourceId = queryParams.dataSourceId;
  return { dataSourceId: typeof dataSourceId === 'string' ? dataSourceId : '' };
};

export const constructHrefWithDataSourceId = (
  basePath: string,
  dataSourceId: string = '',
  withHash: Boolean
): string => {
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  const url = new URLSearchParams();

  // Set up base parameters for '/detectors'
  if (basePath.startsWith('/detectors')) {
    url.set(DETECTORS_QUERY_PARAMS.FROM, DEFAULT_QUERY_PARAMS.from.toString());
    url.set(DETECTORS_QUERY_PARAMS.SIZE, DEFAULT_QUERY_PARAMS.size.toString());
    url.set(DETECTORS_QUERY_PARAMS.SEARCH, DEFAULT_QUERY_PARAMS.search);
    url.set(DETECTORS_QUERY_PARAMS.INDICES, DEFAULT_QUERY_PARAMS.indices);
    url.set(DETECTORS_QUERY_PARAMS.SORT_FIELD, DEFAULT_QUERY_PARAMS.sortField);
    url.set(DETECTORS_QUERY_PARAMS.SORT_DIRECTION, SORT_DIRECTION.ASC)
    if (dataSourceEnabled) {
      url.set(DETECTORS_QUERY_PARAMS.DATASOURCEID, '');
    }
  }

  if (dataSourceEnabled && dataSourceId !== undefined) {
    url.set('dataSourceId', dataSourceId);
  }

  // we share this helper function to construct the href with dataSourceId
  // some places we need to return the url with hash, some places we don't need to
  // so adding this flag to indicate if we want to return the url with hash
  if (withHash) {
    return `#${basePath}?${url.toString()}`;
  }

  return `${basePath}?${url.toString()}`;
};
