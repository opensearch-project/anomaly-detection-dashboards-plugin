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
  ClusterInfo,
  IndexAlias,
  MDSQueryParams,
} from '../../../server/models/types';
import sortBy from 'lodash/sortBy';
import { DetectorListItem, ForecasterListItem } from '../../models/interfaces';
import {
  DETECTORS_QUERY_PARAMS,
  FORECASTER_STATE,
  SORT_DIRECTION,
} from '../../../server/utils/constants';
import {
  ALL_INDICES,
  ALL_DETECTOR_STATES,
  MAX_DETECTORS,
  DEFAULT_QUERY_PARAMS,
  MAX_FORECASTER,
  EMPTY_FORECASTER_STATES,
} from './constants';
import { DETECTOR_STATE } from '../../../server/utils/constants';
import { timeFormatter } from '@elastic/charts';
import { getDataSourceEnabled } from '../../services';
import { DataSourceAttributes } from '../../../../../src/plugins/data_source/common/data_sources';
import { SavedObject } from '../../../../../src/core/public';
import * as pluginManifest from '../../../opensearch_dashboards.json';
import semver from 'semver';
import _ from 'lodash';

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
  //.ml-config
  return !(index.startsWith('.') || index.includes(':.'));
};

export function groupIndicesOrAliasesByCluster(
  indices,
  localClusterName: string,
  dataType: string
) {
  return indices.reduce((acc, index) => {
    const clusterName = index.label.includes(':')
      ? index.label.split(':')[0]
      : localClusterName;

    //if undefined should be local as well.
    let label =
      index.localCluster === undefined || index.localCluster
        ? `${dataType}: ${localClusterName} (Local)`
        : `${dataType}: ${clusterName} (Remote)`;

    const { localCluster, ...indexWithOutLocalInfo } = index; // Destructure and remove localCluster
    const cluster = acc.find((cluster) => cluster.label === label);
    if (cluster) {
      cluster.options.push(indexWithOutLocalInfo);
    } else {
      acc.push({ label, options: [indexWithOutLocalInfo] });
    }

    return acc;
  }, [] as { label: string; options: any[] }[]);
}

export function getVisibleOptions(
  indices: CatIndex[],
  aliases: IndexAlias[],
  localClusterName: string = ''
) {
  // Group by cluster or fallback to default label format
  const getLabeledOptions = (items: any[], label: string) =>
    items.length > 0
      ? groupIndicesOrAliasesByCluster(items, localClusterName, label)
      : [{ label, options: items }];
  console.log('getVisibleOptions', indices, aliases, localClusterName);

  const visibleIndices = mapToVisibleOptions(indices, 'index');
  const visibleAliases = mapToVisibleOptions(aliases, 'alias');

  // Combine grouped indices and aliases
  const visibleIndicesLabel = getLabeledOptions(visibleIndices, 'Indices');
  const visibleAliasesLabel = getLabeledOptions(visibleAliases, 'Aliases');
  const combinedVisibleIndicesAndAliases =
    visibleIndicesLabel.concat(visibleAliasesLabel);
  const sortedVisibleIndicesAndAliases = _.sortBy(combinedVisibleIndicesAndAliases, [
    (item) => (item.label.includes('Indices:') ? 0 : 1), // Indices first, then Aliases
    (item) => (item.label.includes('(Local)') ? 0 : 1), // Local first, then Remote
  ]);
  return sortedVisibleIndicesAndAliases;
}

export const mapToVisibleOptions = (items: any[], key: string) =>
  items
    .filter((value) => isUserIndex(value[key]))
    .map((value) => ({
      label: value[key],
      ...(key === 'index' && { health: value.health }), // Only applicable to indices, ignored for aliases
      localCluster: value.localCluster,
    }));

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
          detector.indices.some((index) => selectedIndices.includes(index))
        );
  let sorted = sortBy(filteredBySearchAndStateAndIndex, sortField);
  if (sortDirection == SORT_DIRECTION.DESC) {
    sorted = sorted.reverse();
  }
  return sorted;
};

export const filterAndSortForecasters = (
  forecasters: ForecasterListItem[],
  search: string,
  selectedIndices: string[],
  selectedForecasterStates: FORECASTER_STATE[]
) => {
  console.log('filterAndSortForecasters', search, selectedIndices, selectedForecasterStates);
  let filteredBySearch =
    search == ''
      ? forecasters
      : forecasters.filter((forecaster) => forecaster.name.includes(search));
  let filteredBySearchAndState =
    selectedForecasterStates == EMPTY_FORECASTER_STATES
      ? filteredBySearch
      : filteredBySearch.filter((forecaster) =>
          selectedForecasterStates.includes(forecaster.curState)
        );
  console.log('filteredBySearchAndState', filteredBySearchAndState, selectedIndices);
  let filteredBySearchAndStateAndIndex =
    selectedIndices == ALL_INDICES
      ? filteredBySearchAndState
      : filteredBySearchAndState.filter((forecaster) =>
          forecaster.indices.some((index) => selectedIndices.includes(index))
        );
  console.log('filteredBySearchAndStateAndIndex', filteredBySearchAndStateAndIndex);
  return filteredBySearchAndStateAndIndex;
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

export const getAllForecastersQueryParamsWithDataSourceId = (
  dataSourceId: string = ''
) => ({
  from: 0,
  search: '',
  indices: '',
  size: MAX_FORECASTER,
  sortDirection: SORT_DIRECTION.ASC,
  sortFieldId: 'name',
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
    url.set(DETECTORS_QUERY_PARAMS.SORT_DIRECTION, SORT_DIRECTION.ASC);
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

export const isDataSourceCompatible = (
  dataSource: SavedObject<DataSourceAttributes>
) => {
  if (
    'requiredOSDataSourcePlugins' in pluginManifest &&
    !pluginManifest.requiredOSDataSourcePlugins.every((plugin) =>
      dataSource.attributes.installedPlugins?.includes(plugin)
    )
  ) {
    return false;
  }

  // filter out data sources which is NOT in the support range of plugin
  if (
    'supportedOSDataSourceVersions' in pluginManifest &&
    !semver.satisfies(
      dataSource.attributes.dataSourceVersion,
      pluginManifest.supportedOSDataSourceVersions
    )
  ) {
    return false;
  }
  return true;
};

export const getLocalCluster = (clusters: ClusterInfo[]): ClusterInfo[] => {
  return clusters.filter((cluster) => cluster.localCluster === true);
};

export const getForecastClusterInfoLabel = (clusterInfo: ClusterInfo) =>
  `${clusterInfo.name} ${clusterInfo.localCluster ? '' : '(Cross cluster connection)'}`;

export const getClusterLabel = (localCluster: boolean, clusterName: string) =>
  localCluster ? `${clusterName} (Local)` : `${clusterName} (Remote)`;

export function getVisibleForecasterOptions(
  indices: CatIndex[],
  aliases: IndexAlias[],
  localClusterName: string = ''
) {
  // Group by cluster or fallback to default label format
  const getForecastLabeledOptions = (items: any[], label: string) =>
    items.length > 0
      ? groupForecasterIndicesOrAliasesByCluster(items, localClusterName, label)
      : [{ label, options: items }];
  console.log('getVisibleOptions', indices, aliases, localClusterName);

  const visibleIndices = mapToVisibleOptions(indices, 'index');
  const visibleAliases = mapToVisibleOptions(aliases, 'alias');

  // Combine grouped indices and aliases
  const visibleIndicesLabel = getForecastLabeledOptions(visibleIndices, 'Indexes');
  const visibleAliasesLabel = getForecastLabeledOptions(visibleAliases, 'Aliases');
  const combinedVisibleIndicesAndAliases =
    visibleIndicesLabel.concat(visibleAliasesLabel);
  const sortedVisibleIndicesAndAliases = _.sortBy(combinedVisibleIndicesAndAliases, [
    (item) => (item.label.includes('Indices:') ? 0 : 1), // Indices first, then Aliases
    (item) => (item.label.includes('(Local)') ? 0 : 1), // Local first, then Remote
  ]);
  return sortedVisibleIndicesAndAliases;
}

export const mapToVisibleForecasterOptions = (items: any[], key: string) =>
  items
    .filter((value) => isUserIndex(value[key]))
    .map((value) => ({
      label: value[key],
      ...(key === 'index' && { health: value.health }), // Only applicable to indices, ignored for aliases
      localCluster: value.localCluster,
    }));

  export function groupForecasterIndicesOrAliasesByCluster(
    indices,
    localClusterName: string,
    dataType: string
  ) {
    return indices.reduce((acc, index) => {
      const clusterName = index.label.includes(':')
        ? index.label.split(':')[0]
        : localClusterName;
  
      //if undefined should be local as well.
      let label =
        index.localCluster === undefined || index.localCluster
          ? `${localClusterName}: ${dataType}`
          : `${clusterName} (Cross cluster connection): ${dataType}`;
  
      const { localCluster, ...indexWithOutLocalInfo } = index; // Destructure and remove localCluster
      const cluster = acc.find((cluster) => cluster.label === label);
      if (cluster) {
        cluster.options.push(indexWithOutLocalInfo);
      } else {
        acc.push({ label, options: [indexWithOutLocalInfo] });
      }
  
      return acc;
    }, [] as { label: string; options: any[] }[]);
  }