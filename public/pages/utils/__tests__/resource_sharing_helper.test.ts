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

jest.mock('../../../services', () => ({
  getClient: jest.fn(),
  getDataSourceEnabled: jest.fn(() => ({ enabled: false })),
}));

jest.mock('../../../../opensearch_dashboards.json', () => ({
  supportedOSDataSourceVersions: '>=2.9.0',
  unsupportedOSDataSourceEngineTypes: ['AnalyticEngine'],
  requiredOSDataSourcePlugins: ['opensearch-anomaly-detection'],
}));

import { getResourceSharingAvailableTypes } from '../helpers';
import { getClient } from '../../../services';

const mockGet = jest.fn();
(getClient as jest.Mock).mockReturnValue({ get: mockGet });

// Queue responses for the two endpoints the helper calls: the feature-flag
// gate (resource_sharing_enabled) and the registered-types list.
const withHttpResponses = (enabled: unknown, types?: unknown): jest.Mock => {
  mockGet.mockImplementation((path: string) => {
    if (path === '/api/v1/auth/resource_sharing_enabled') {
      return Promise.resolve(enabled);
    }
    if (path === '/api/resource/types') {
      return Promise.resolve(types);
    }
    return Promise.reject(new Error(`unexpected path ${path}`));
  });
  return mockGet;
};

describe('getResourceSharingAvailableTypes', () => {
  afterEach(() => {
    mockGet.mockReset();
    (getClient as jest.Mock).mockReturnValue({ get: mockGet });
  });

  it('returns [] when resource sharing is disabled on the data source', async () => {
    withHttpResponses(
      { enabled: false },
      { types: [{ type: 'anomaly-detector' }] }
    );
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([]);
  });

  it('returns the registered types when enabled', async () => {
    withHttpResponses(
      { enabled: true },
      { types: [{ type: 'anomaly-detector' }, { type: 'forecaster' }] }
    );
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([
      'anomaly-detector',
      'forecaster',
    ]);
  });

  it('supports a bare array types response', async () => {
    withHttpResponses({ enabled: true }, [{ type: 'forecaster' }]);
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([
      'forecaster',
    ]);
  });

  it('returns [] (fail-closed) when a request throws', async () => {
    mockGet.mockRejectedValue(new Error('not found'));
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([]);
  });

  it('forwards the selected data source id to both routes', async () => {
    const get = withHttpResponses({ enabled: true }, { types: [] });
    await getResourceSharingAvailableTypes('ds-1');
    expect(get).toHaveBeenCalledWith('/api/v1/auth/resource_sharing_enabled', {
      query: { dataSourceId: 'ds-1' },
    });
    expect(get).toHaveBeenCalledWith('/api/resource/types', {
      query: { dataSourceId: 'ds-1' },
    });
  });

  it('sends an empty query when no data source id is given', async () => {
    const get = withHttpResponses({ enabled: true }, { types: [] });
    await getResourceSharingAvailableTypes();
    expect(get).toHaveBeenCalledWith('/api/v1/auth/resource_sharing_enabled', {
      query: {},
    });
  });
});
