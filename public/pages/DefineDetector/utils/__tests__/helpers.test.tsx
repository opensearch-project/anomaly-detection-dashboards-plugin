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

import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../utils/constants';
import { DATA_TYPES } from '../../../../utils/constants';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import {
  detectorDefinitionToFormik,
  filtersToFormik,
} from '../../utils/helpers';
import {
  Detector,
  OPERATORS_MAP,
  FILTER_TYPES,
} from '../../../../models/interfaces';
import { initialState, mockedStore } from '../../../../redux/utils/testUtils';
import { ClusterOption } from '../../components/Datasource/DataSource';
const mockClusters: ClusterInfo[] = [
  { name: 'opensearch', localCluster: true },
  { name: 'remote-cluster-1', localCluster: false },
];

const localOnlyClusterOption: ClusterOption[] = [
  { cluster: 'opensearch', label: 'opensearch (Local)', localcluster: 'true' },
];

const clusterOptions: ClusterOption[] = [
  {
    cluster: 'remote-cluster-1',
    label: 'remote-cluster-1 (Remote)',
    localcluster: 'false',
  },
  { cluster: 'opensearch', label: 'opensearch (Local)', localcluster: 'true' },
];

describe('detectorDefinitionToFormik', () => {
  test('should return initialValues if detector is null', () => {
    const randomDetector = {} as Detector;
    const adFormikValues = detectorDefinitionToFormik(
      randomDetector,
      mockClusters
    );
    expect(adFormikValues).toEqual(INITIAL_DETECTOR_DEFINITION_VALUES);
  });
  test('should return correct values if detector is not null, 1 local index', () => {
    const randomDetector = getRandomDetector();
    const adFormikValues = detectorDefinitionToFormik(
      randomDetector,
      mockClusters
    );
    expect(adFormikValues).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      filters: randomDetector.uiMetadata.filters,
      filterQuery: JSON.stringify(randomDetector.filterQuery || {}, null, 4),
      index: [{ label: randomDetector.indices[0] }],
      timeField: randomDetector.timeField,
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
      resultIndex: randomDetector.resultIndex,
      resultIndexMinAge: randomDetector.resultIndexMinAge,
      resultIndexMinSize: randomDetector.resultIndexMinSize,
      resultIndexTtl: randomDetector.resultIndexTtl,
      flattenCustomResultIndex: randomDetector.flattenCustomResultIndex,
      clusters: localOnlyClusterOption,
    });
  });
  test('should return correct values if detector is not null, 2 indices', () => {
    const testIndices = ['index-1', 'index-2'];
    const randomDetector = getRandomDetector(true, '', testIndices);
    const adFormikValues = detectorDefinitionToFormik(
      randomDetector,
      mockClusters
    );
    expect(adFormikValues).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      filters: randomDetector.uiMetadata.filters,
      filterQuery: JSON.stringify(randomDetector.filterQuery || {}, null, 4),
      index: [{ label: 'index-1' }, { label: 'index-2' }],
      timeField: randomDetector.timeField,
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
      resultIndex: randomDetector.resultIndex,
      resultIndexMinAge: randomDetector.resultIndexMinAge,
      resultIndexMinSize: randomDetector.resultIndexMinSize,
      resultIndexTtl: randomDetector.resultIndexTtl,
      flattenCustomResultIndex: randomDetector.flattenCustomResultIndex,
      clusters: localOnlyClusterOption,
    });
  });

  test('should return correct values if detector is not null, 1 local, 1 remote index', () => {
    const testIndices = ['index-1', 'remote-cluster-1:index-2'];
    const randomDetector = getRandomDetector(true, '', testIndices);
    const adFormikValues = detectorDefinitionToFormik(
      randomDetector,
      mockClusters
    );
    expect(adFormikValues).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      filters: randomDetector.uiMetadata.filters,
      filterQuery: JSON.stringify(randomDetector.filterQuery || {}, null, 4),
      index: [{ label: 'index-1' }, { label: 'remote-cluster-1:index-2' }],
      timeField: randomDetector.timeField,
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
      resultIndex: randomDetector.resultIndex,
      resultIndexMinAge: randomDetector.resultIndexMinAge,
      resultIndexMinSize: randomDetector.resultIndexMinSize,
      resultIndexTtl: randomDetector.resultIndexTtl,
      flattenCustomResultIndex: randomDetector.flattenCustomResultIndex,
      clusters: clusterOptions,
    });
  });
  test('should return if detector does not have metadata', () => {
    const randomDetector = getRandomDetector();
    //@ts-ignore
    randomDetector.uiMetadata = undefined;
    const adFormikValues = detectorDefinitionToFormik(
      randomDetector,
      mockClusters
    );
    expect(adFormikValues).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      filterQuery: JSON.stringify(randomDetector.filterQuery || {}, null, 4),
      filters: filtersToFormik(randomDetector),
      index: [{ label: randomDetector.indices[0] }], // Currently we support only one index
      timeField: randomDetector.timeField,
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
      resultIndex: randomDetector.resultIndex,
      resultIndexMinAge: randomDetector.resultIndexMinAge,
      resultIndexMinSize: randomDetector.resultIndexMinSize,
      resultIndexTtl: randomDetector.resultIndexTtl,
      flattenCustomResultIndex: randomDetector.flattenCustomResultIndex,
      clusters: localOnlyClusterOption,
    });
  });
  test("upgrade old detector's filters to include filter type", () => {
    const randomDetector = getRandomDetector();
    randomDetector.uiMetadata = {
      features: {},
      filters: [
        {
          fieldInfo: [
            {
              label: 'service',
              type: DATA_TYPES.KEYWORD,
            },
          ],
          fieldValue: 'app_3',
          operator: OPERATORS_MAP.IS,
        },
        {
          fieldInfo: [
            {
              label: 'host',
              type: DATA_TYPES.KEYWORD,
            },
          ],
          fieldValue: 'server_2',
          operator: OPERATORS_MAP.IS,
        },
      ],
      filterType: FILTER_TYPES.SIMPLE,
    };
    const adFormikValues = filtersToFormik(randomDetector);
    expect(adFormikValues).toEqual([
      {
        fieldInfo: [
          {
            label: 'service',
            type: DATA_TYPES.KEYWORD,
          },
        ],
        fieldValue: 'app_3',
        operator: OPERATORS_MAP.IS,
        filterType: FILTER_TYPES.SIMPLE,
      },
      {
        fieldInfo: [
          {
            label: 'host',
            type: DATA_TYPES.KEYWORD,
          },
        ],
        fieldValue: 'server_2',
        operator: OPERATORS_MAP.IS,
        filterType: FILTER_TYPES.SIMPLE,
      },
    ]);
  });
});
