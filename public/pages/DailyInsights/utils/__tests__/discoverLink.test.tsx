/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildDiscoverUrl } from '../discoverLink';
import { getSavedObjectsClient, getNotifications, getDataSourceEnabled } from '../../../../services';

jest.mock('../../../../services', () => ({
  getSavedObjectsClient: jest.fn(),
  getNotifications: jest.fn(),
  getDataSourceEnabled: jest.fn(),
}));

jest.mock('../../../../../../../src/plugins/opensearch_dashboards_utils/public', () => ({
  setStateToOsdUrl: (_key: string, _state: any, _opts: any, url: string) => {
    // Simple mock: append key=encoded_state to URL
    const encoded = encodeURIComponent(JSON.stringify(_state));
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${_key}=${encoded}`;
  },
}));

jest.mock('../../../../../../../src/plugins/data/public', () => ({
  opensearchFilters: {
    buildPhraseFilter: jest.fn((_field, _value, _indexPattern) => ({
      meta: { key: _field.name, params: { query: _value } },
    })),
    buildPhrasesFilter: jest.fn((_field, _values, _indexPattern) => ({
      meta: { key: _field.name, params: _values.map((v: string) => ({ query: v })) },
    })),
  },
}));

const mockCore = {
  workspaces: {
    currentWorkspace$: {
      pipe: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue(null),
      }),
    },
  },
} as any;

describe('buildDiscoverUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled: false });

    (getNotifications as jest.Mock).mockReturnValue({
      toasts: { addSuccess: jest.fn(), addDanger: jest.fn() },
    });

    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({ savedObjects: [{ id: 'idx-pat-1', attributes: { title: 'my-index', timeFieldName: 'time' } }] }),
      create: jest.fn().mockResolvedValue({ id: 'new-pat-1' }),
    });

    // jsdom doesn't set these, so provide defaults
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5601', pathname: '/app/anomaly-detection-dashboards' },
      writable: true,
    });
  });

  test('returns a URL containing the discover path', async () => {
    const url = await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
    });

    expect(url).not.toBeNull();
    expect(url).toContain('/app/data-explorer/discover#/');
  });

  test('includes time range with ±30 min buffer', async () => {
    const start = 1700000000000;
    const end = 1700003600000;
    const url = await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: start,
      endTime: end,
    });

    const expectedStart = new Date(start - 30 * 60 * 1000).toISOString();
    const expectedEnd = new Date(end + 30 * 60 * 1000).toISOString();
    const decoded = decodeURIComponent(url!);
    expect(decoded).toContain(expectedStart);
    expect(decoded).toContain(expectedEnd);
  });

  test('accepts string timestamps', async () => {
    const url = await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: '2026-04-07T14:00:00.000Z',
      endTime: '2026-04-07T15:00:00.000Z',
    });

    expect(url).not.toBeNull();
    expect(url).toContain('/app/data-explorer/discover#/');
  });

  test('uses existing index pattern when found', async () => {
    const mockFind = jest.fn().mockResolvedValue({
      savedObjects: [{ id: 'existing-pat', attributes: { title: 'my-index', timeFieldName: 'time' } }],
    });
    const mockCreate = jest.fn();
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: mockFind,
      create: mockCreate,
    });

    await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('creates index pattern when none exists', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 'new-pat' });
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({ savedObjects: [] }),
      create: mockCreate,
    });

    const url = await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
    });

    expect(mockCreate).toHaveBeenCalledWith('index-pattern', {
      title: 'my-index',
      timeFieldName: 'time',
    });
    expect(url).not.toBeNull();
  });

  test('uses provided timeField for index pattern creation', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 'new-pat' });
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({ savedObjects: [] }),
      create: mockCreate,
    });

    const url = await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
      timeField: '@timestamp',
    });

    expect(mockCreate).toHaveBeenCalledWith('index-pattern', {
      title: 'my-index',
      timeFieldName: '@timestamp',
    });
    expect(url).not.toBeNull();
    const decoded = decodeURIComponent(url!);
    expect(decoded).toContain('@timestamp');
  });

  test('includes entity filters in URL', async () => {
    const url = await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
      entities: ['service.name: checkout', 'host: server-1'],
    });

    expect(url).not.toBeNull();
    // Filters are encoded in _a state — just verify the URL has filter content
    expect(url).toContain('_a=');
    expect(url).toContain('filters');
  });

  test('skips entities without colon or equals separator', async () => {
    const url = await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
      entities: ['no-separator-entity'],
    });

    expect(url).not.toBeNull();
  });

  test('handles = separator in entity strings', async () => {
    const { opensearchFilters: mockFilters } = jest.requireMock(
      '../../../../../../../src/plugins/data/public'
    );
    mockFilters.buildPhraseFilter.mockClear();

    await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
      entities: ['serviceName.keyword=checkout'],
    });

    expect(mockFilters.buildPhraseFilter).toHaveBeenCalledWith(
      { name: 'serviceName.keyword', type: 'string' },
      'checkout',
      expect.anything()
    );
  });

  test('groups multiple values for same field into buildPhrasesFilter', async () => {
    const { opensearchFilters: mockFilters } = jest.requireMock(
      '../../../../../../../src/plugins/data/public'
    );
    mockFilters.buildPhrasesFilter.mockClear();

    await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
      entities: ['serviceName.keyword=checkout', 'serviceName.keyword=fraud-detection'],
    });

    expect(mockFilters.buildPhrasesFilter).toHaveBeenCalledWith(
      { name: 'serviceName.keyword', type: 'string' },
      ['checkout', 'fraud-detection'],
      expect.anything()
    );
  });

  test('returns null and shows toast on error', async () => {
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: jest.fn().mockRejectedValue(new Error('network error')),
    });

    const url = await buildDiscoverUrl(mockCore, {
      indices: ['my-index'],
      startTime: 1700000000000,
      endTime: 1700003600000,
    });

    expect(url).toBeNull();
    expect(getNotifications().toasts.addDanger).toHaveBeenCalledWith(
      'Error building Discover link'
    );
  });

  test('joins multiple indices with comma', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 'new-pat' });
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({ savedObjects: [] }),
      create: mockCreate,
    });

    await buildDiscoverUrl(mockCore, {
      indices: ['index-a', 'index-b'],
      startTime: 1700000000000,
      endTime: 1700003600000,
    });

    expect(mockCreate).toHaveBeenCalledWith('index-pattern', {
      title: 'index-a,index-b',
      timeFieldName: 'time',
    });
  });

  describe('MDS enabled', () => {
    beforeEach(() => {
      (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled: true });
    });

    test('includes dataset with dataSource in URL', async () => {
      const mockFind = jest.fn().mockResolvedValue({
        savedObjects: [{ id: 'mds-pat', attributes: { title: 'my-index', timeFieldName: 'time' }, references: [{ type: 'data-source', name: 'dataSource', id: 'ds-1' }] }],
      });
      const mockGet = jest.fn().mockResolvedValue({
        attributes: { title: 'My Cluster', dataSourceEngineType: 'opensearch' },
      });
      (getSavedObjectsClient as jest.Mock).mockReturnValue({
        find: mockFind,
        create: jest.fn(),
        get: mockGet,
      });

      const url = await buildDiscoverUrl(mockCore, {
        indices: ['my-index'],
        startTime: 1700000000000,
        endTime: 1700003600000,
        dataSourceId: 'ds-1',
      });

      expect(url).not.toBeNull();
      expect(url).toContain('_q=');
      expect(mockGet).toHaveBeenCalledWith('data-source', 'ds-1');
    });
  });
});
