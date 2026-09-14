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
  getSecurityDashboards: jest.fn(),
  isSecurityDashboardsAvailable: jest.fn(() => true),
}));

jest.mock('../../../../opensearch_dashboards.json', () => ({
  supportedOSDataSourceVersions: '>=2.9.0',
  unsupportedOSDataSourceEngineTypes: ['AnalyticEngine'],
  requiredOSDataSourcePlugins: ['opensearch-anomaly-detection'],
}));

import { getResourceSharingAvailableTypes } from '../helpers';
import {
  getClient,
  getSecurityDashboards,
  isSecurityDashboardsAvailable,
} from '../../../services';

const mockGet = jest.fn();
(getClient as jest.Mock).mockReturnValue({ get: mockGet });

// By default, security-dashboards-plugin's local-SPI check confirms every
// type it is asked about. Individual tests override this per case.
const mockIsResourceSharingAvailable = jest.fn(() => Promise.resolve(true));
(getSecurityDashboards as jest.Mock).mockReturnValue({
  ui: { isResourceSharingAvailable: mockIsResourceSharingAvailable },
});

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
    mockIsResourceSharingAvailable.mockReset();
    mockIsResourceSharingAvailable.mockImplementation(() => Promise.resolve(true));
    (getClient as jest.Mock).mockReturnValue({ get: mockGet });
    (isSecurityDashboardsAvailable as jest.Mock).mockReturnValue(true);
  });

  it('returns [] when resource sharing is disabled on the data source', async () => {
    withHttpResponses(
      { enabled: false },
      { types: [{ type: 'anomaly-detector' }] }
    );
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([]);
  });

  it('returns the registered types when enabled and the local SPI confirms each one', async () => {
    withHttpResponses(
      { enabled: true },
      { types: [{ type: 'anomaly-detector' }, { type: 'forecaster' }] }
    );
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([
      'anomaly-detector',
      'forecaster',
    ]);
    expect(mockIsResourceSharingAvailable).toHaveBeenCalledWith('anomaly-detector', 'ds-1');
    expect(mockIsResourceSharingAvailable).toHaveBeenCalledWith('forecaster', 'ds-1');
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

  it('returns [] without calling either backend route when security-dashboards-plugin is not installed', async () => {
    (isSecurityDashboardsAvailable as jest.Mock).mockReturnValue(false);
    const get = withHttpResponses({ enabled: true }, { types: [{ type: 'anomaly-detector' }] });
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('drops a type that the backend reports as registered but the local SPI does not confirm', async () => {
    withHttpResponses(
      { enabled: true },
      { types: [{ type: 'anomaly-detector' }, { type: 'forecaster' }] }
    );
    // Simulates: local cluster has resource sharing disabled (so the SPI never
    // started) while the selected data source reports it as enabled.
    mockIsResourceSharingAvailable.mockImplementation((type: string) =>
      Promise.resolve(type === 'forecaster')
    );
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([
      'forecaster',
    ]);
  });

  it('drops a type when the local SPI confirmation throws', async () => {
    withHttpResponses({ enabled: true }, { types: [{ type: 'anomaly-detector' }] });
    mockIsResourceSharingAvailable.mockRejectedValue(new Error('boom'));
    await expect(getResourceSharingAvailableTypes('ds-1')).resolves.toEqual([]);
  });
});
