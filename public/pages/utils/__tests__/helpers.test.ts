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
  getVisibleOptions,
  groupIndicesOrAliasesByCluster,
  isDataSourceCompatible,
  isForecastingDataSourceCompatible,
  sanitizeSearchText,
} from '../helpers';

jest.mock('../../../../opensearch_dashboards.json', () => ({
  supportedOSDataSourceVersions: '>=2.9.0',
  requiredOSDataSourcePlugins: ['opensearch-anomaly-detection'],
}));

describe('helpers', () => {
  describe('getVisibleOptions', () => {
    test('returns without system indices if valid index options and undefined localCluster', () => {
      expect(
        getVisibleOptions(
          [
            { index: 'hello', health: 'green' },
            { index: '.world', health: 'green' },
          ],
          [
            { alias: 'hello', index: 'world' },
            { alias: '.system', index: 'opensearch_dashboards' },
          ]
        )
      ).toEqual([
        {
          label: 'Indices:  (Local)',
          options: [{ label: 'hello', health: 'green' }],
        },
        {
          label: 'Aliases:  (Local)',
          options: [{ label: 'hello' }],
        },
      ]);
    });
    test('returns without system indices if valid index options', () => {
      expect(
        getVisibleOptions(
          [
            { index: 'hello', health: 'green', localCluster: true },
            { index: '.world', health: 'green', localCluster: false },
            { index: 'ale-cluster:ale', health: 'green', localCluster: false },
          ],
          [
            {
              alias: 'cluster-2:.system',
              index: 'opensearch_dashboards',
              localCluster: false,
            },
            { alias: 'hello', index: 'world', localCluster: true },
            { alias: 'cluster-2:hello', index: 'world', localCluster: false },
          ],
          'cluster-1'
        )
      ).toEqual([
        {
          label: 'Indices: cluster-1 (Local)',
          options: [{ label: 'hello', health: 'green' }],
        },
        {
          label: 'Indices: ale-cluster (Remote)',
          options: [
            {
              label: 'ale-cluster:ale',
              health: 'green',
            },
          ],
        },
        {
          label: 'Aliases: cluster-1 (Local)',
          options: [{ label: 'hello' }],
        },
        {
          label: 'Aliases: cluster-2 (Remote)',
          options: [{ label: 'cluster-2:hello' }],
        },
      ]);
    });
    test('returns empty aliases and index ', () => {
      expect(
        getVisibleOptions(
          [
            { index: '.hello', health: 'green' },
            { index: '.world', health: 'green' },
          ],
          [{ alias: '.system', index: 'opensearch_dashboards' }]
        )
      ).toEqual([
        {
          label: 'Indices',
          options: [],
        },
        {
          label: 'Aliases',
          options: [],
        },
      ]);
    });
  });
  describe('groupIndicesOrAliasesByCluster', () => {
    const localClusterName = 'local-cluster';
    const dataType = 'Indices';
  
    test('should group local indices correctly', () => {
      const indices = [
        { label: 'index1', localCluster: true },
        { label: 'index2', localCluster: true },
      ];
  
      const result = groupIndicesOrAliasesByCluster(indices, localClusterName, dataType);
  
      expect(result).toEqual([
        {
          label: 'Indices: local-cluster (Local)',
          options: [
            { label: 'index1' },
            { label: 'index2' },
          ],
        },
      ]);
    });
    test('should group remote indices correctly', () => {
      const indices = [
        { label: 'remote-cluster:index1', localCluster: false },
        { label: 'remote-cluster:index2', localCluster: false },
      ];
  
      const result = groupIndicesOrAliasesByCluster(indices, localClusterName, dataType);
  
      expect(result).toEqual([
        {
          label: 'Indices: remote-cluster (Remote)',
          options: [
            { label: 'remote-cluster:index1' },
            { label: 'remote-cluster:index2' },
          ],
        },
      ]);
    });
  
    test('should group mixed local and remote indices correctly', () => {
      const indices = [
        { label: 'index1', localCluster: true },
        { label: 'remote-cluster:index2', localCluster: false },
        { label: 'index3', localCluster: true },
        { label: 'another-remote:index4', localCluster: false },
      ];
  
      const result = groupIndicesOrAliasesByCluster(indices, localClusterName, dataType);
  
      expect(result).toEqual([
        {
          label: 'Indices: local-cluster (Local)',
          options: [
            { label: 'index1' },
            { label: 'index3' },
          ],
        },
        {
          label: 'Indices: remote-cluster (Remote)',
          options: [
            { label: 'remote-cluster:index2' },
          ],
        },
        {
          label: 'Indices: another-remote (Remote)',
          options: [
            { label: 'another-remote:index4' },
          ],
        },
      ]);
    });
  
    test('should handle indices with undefined localCluster property', () => {
      const indices = [
        { label: 'index1' },
        { label: 'index2', localCluster: undefined },
      ];
  
      const result = groupIndicesOrAliasesByCluster(indices, localClusterName, dataType);
  
      expect(result).toEqual([
        {
          label: 'Indices: local-cluster (Local)',
          options: [
            { label: 'index1' },
            { label: 'index2' },
          ],
        },
      ]);
    });
  });
  
  describe('sanitizeSearchText', () => {
    test('should return empty', () => {
      expect(sanitizeSearchText('*')).toBe('');
      expect(sanitizeSearchText('')).toBe('');
    });
    test('should prepend and append wildcard on valid input', () => {
      expect(sanitizeSearchText('h')).toBe('*h*');
      expect(sanitizeSearchText('hello')).toBe('*hello*');
    });
  });

  describe('isDataSourceCompatible', () => {
    const mockDataSource = (
      version: string,
      plugins: string[] = ['opensearch-anomaly-detection']
    ) => ({
      attributes: {
        dataSourceVersion: version,
        installedPlugins: plugins,
      },
    });

    test('should be compatible for version 3.1.0', () => {
      const dataSource = mockDataSource('3.1.0');
      expect(isDataSourceCompatible(dataSource as any)).toBe(true);
    });

    test('should be compatible for version 2.19.3', () => {
      const dataSource = mockDataSource('2.19.3');
      expect(isDataSourceCompatible(dataSource as any)).toBe(true);
    });

    test('should be compatible for version 3.1.0-SNAPSHOT', () => {
      const dataSource = mockDataSource('3.1.0-SNAPSHOT');
      expect(isDataSourceCompatible(dataSource as any)).toBe(true);
    });

    test('should be incompatible for version 2.8.0', () => {
      const dataSource = mockDataSource('2.8.0');
      expect(isDataSourceCompatible(dataSource as any)).toBe(false);
    });

    test('should be incompatible if required plugin is missing', () => {
      const dataSource = mockDataSource('3.1.0', ['some-other-plugin']);
      expect(isDataSourceCompatible(dataSource as any)).toBe(false);
    });
  });

  describe('isForecastingDataSourceCompatible', () => {
    const mockDataSource = (
      version: string,
      plugins: string[] = ['opensearch-anomaly-detection']
    ) => ({
      attributes: {
        dataSourceVersion: version,
        installedPlugins: plugins,
      },
    });

    test('should be compatible for version 3.1.0', () => {
      const dataSource = mockDataSource('3.1.0');
      expect(isForecastingDataSourceCompatible(dataSource as any)).toBe(true);
    });

    test('should be compatible for version 3.1.0-SNAPSHOT', () => {
      const dataSource = mockDataSource('3.1.0-SNAPSHOT');
      expect(isForecastingDataSourceCompatible(dataSource as any)).toBe(true);
    });

    test('should be incompatible for version 2.19.3', () => {
      const dataSource = mockDataSource('2.19.3');
      expect(isForecastingDataSourceCompatible(dataSource as any)).toBe(false);
    });

    test('should be incompatible for version 3.0.0', () => {
      const dataSource = mockDataSource('3.0.0');
      expect(isForecastingDataSourceCompatible(dataSource as any)).toBe(false);
    });

    test('should be incompatible if required plugin is missing', () => {
      const dataSource = mockDataSource('3.1.0', ['some-other-plugin']);
      expect(isForecastingDataSourceCompatible(dataSource as any)).toBe(false);
    });
  });
});
