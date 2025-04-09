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
  FILTER_TYPES,
  UNITS,
  Detector,
  UIFilter,
} from '../../../models/interfaces';
import { get, cloneDeep, isEmpty } from 'lodash';
import { DetectorDefinitionFormikValues } from '../../DefineDetector/models/interfaces';
import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../DefineDetector/utils/constants';
import {
  formikToIndices,
  formikToFilterQuery,
} from '../../ReviewAndCreate/utils/helpers';
import { DEFAULT_SHINGLE_SIZE } from '../../../utils/constants';
import { useSelector } from 'react-redux';
import { AppState } from '../../../redux/reducers';
import { getLocalCluster } from '../../../pages/utils/helpers';
import { ClusterInfo } from '../../../../server/models/types';

export function detectorDefinitionToFormik(
  ad: Detector,
  clusters: ClusterInfo[]
): DetectorDefinitionFormikValues {
  const initialValues = cloneDeep(INITIAL_DETECTOR_DEFINITION_VALUES);
  if (isEmpty(ad)) return initialValues;
  return {
    ...initialValues,
    name: ad.name,
    description: ad.description,
    index: [...ad.indices.map(index => ({ label: index }))],
    resultIndex: ad.resultIndex,
    filters: filtersToFormik(ad),
    filterQuery: JSON.stringify(
      get(ad, 'filterQuery', { match_all: {} }),
      null,
      4
    ),
    timeField: ad.timeField,
    interval: get(ad, 'detectionInterval.period.interval', 10),
    windowDelay: get(ad, 'windowDelay.period.interval', 0),
    resultIndexMinAge: get(ad, 'resultIndexMinAge', undefined),
    resultIndexMinSize:get(ad, 'resultIndexMinSize', undefined),
    resultIndexTtl: get(ad, 'resultIndexTtl', undefined),
    flattenCustomResultIndex: get(ad, 'flattenCustomResultIndex', false),
    clusters: indicesToClusters(ad.indices, clusters)
  };
}

export function indicesToClusters(indices: string[], clusters: ClusterInfo[]) {
  const seenClusters = new Set<string>();
  const hasLocalCluster = indices.some(index => !index.includes(':'));

  indices.forEach(index => {
    const [cluster] = index.split(':');
    if (cluster !== index) {
      seenClusters.add(cluster);
    }
  });

  const clusterOptions = Array.from(seenClusters).map(name => ({
    label: getClusterOptionLabel({ name, localCluster: false }),
    cluster: name,
    localcluster: 'false',
  }));

  if (hasLocalCluster && clusters) {
    const [local] = getLocalCluster(clusters);
    if (local) {
      clusterOptions.push({
        label: getClusterOptionLabel(local),
        cluster: local.name,
        localcluster: 'true',
      });
    }
  }
  return clusterOptions;
}

export function filtersToFormik(detector: Detector): UIFilter[] {
  // Detectors created or updated using the API will not have metadata - create a custom filter in this case.
  const noMetadata =
    get(detector, 'uiMetadata.filterType') === undefined &&
    get(detector, 'uiMetadata.filters') === undefined;
  const isOldDetector = get(detector, 'uiMetadata.filterType') !== undefined;

  if (noMetadata) {
    return [
      {
        filterType: FILTER_TYPES.CUSTOM,
        query: JSON.stringify(
          get(detector, 'filterQuery', { match_all: {} }),
          null,
          4
        ),
      },
    ];
  }

  const curFilterType = get(detector, 'uiMetadata.filterType');
  const curFilters = get(detector, 'uiMetadata.filters', []);

  // If this is an old detector:
  // If filters is empty: it means it was a custom filter. Convert to a single filter array with a
  // query value equal to the existing filterQuery
  // If a set of simple filters: modify them by injecting the filter type
  // into each existing filter
  if (isOldDetector) {
    if (isEmpty(curFilters)) {
      return [
        {
          filterType: FILTER_TYPES.CUSTOM,
          query: JSON.stringify(
            get(detector, 'filterQuery', { match_all: {} }),
            null,
            4
          ),
        },
      ];
    } else {
      curFilters.forEach(
        (filter: UIFilter) => (filter.filterType = curFilterType)
      );
    }
  }
  return curFilters;
}

export function formikToDetectorDefinition(
  values: DetectorDefinitionFormikValues,
  detector: Detector
): Detector {
  let detectorBody = {
    ...detector,
    name: values.name,
    description: values.description,
    indices: formikToIndices(values.index),
    resultIndex: values.resultIndex,
    filterQuery: formikToFilterQuery(values),
    uiMetadata: {
      features: get(detector, 'uiMetadata.features', {}),
      filters: get(values, 'filters', []),
    },
    timeField: values.timeField,
    detectionInterval: {
      period: { interval: values.interval, unit: UNITS.MINUTES },
    },
    windowDelay: {
      period: { interval: values.windowDelay, unit: UNITS.MINUTES },
    },
    resultIndexMinAge: values.resultIndexMinAge,
    resultIndexMinSize: values.resultIndexMinSize,
    resultIndexTtl: values.resultIndexTtl,
    flattenCustomResultIndex: values.flattenCustomResultIndex,
  } as Detector;

  return detectorBody;
}

export function clearModelConfiguration(ad: Detector): Detector {
  return {
    ...ad,
    featureAttributes: [],
    uiMetadata: {
      ...ad.uiMetadata,
      features: {},
    },
    categoryField: undefined,
    shingleSize: DEFAULT_SHINGLE_SIZE,
  };
}

  export const getClusterOptionLabel = (clusterInfo: ClusterInfo) =>
    `${clusterInfo.name} ${clusterInfo.localCluster ? '(Local)' : '(Remote)'}`;