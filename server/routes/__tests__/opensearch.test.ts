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

import OpenSearchService from '../opensearch';

const responseFactory = {
  ok: jest.fn(({ body }) => body),
};

const indexNotFoundError = {
  statusCode: 404,
  body: { error: { type: 'index_not_found_exception' } },
};

const makeService = (
  callAsCurrentUser = jest.fn(),
  dataSourceCallAPI = jest.fn()
) => {
  const client = {
    asScoped: jest.fn(() => ({ callAsCurrentUser })),
  };
  const context = {
    dataSource: {
      opensearch: {
        legacy: {
          getClient: jest.fn(() => ({ callAPI: dataSourceCallAPI })),
        },
      },
    },
  };

  return {
    service: new OpenSearchService(client, true),
    client,
    context,
  };
};

const requestWithQuery = (query = {}, params = {}) =>
  ({
    query: {
      indexOrAliasQuery: '',
      clusters: '',
      queryForLocalCluster: 'true',
      ...query,
    },
    params,
  }) as any;

describe('OpenSearchService getIndicesAndAliases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not request data streams when includeDataStreams is not true', async () => {
    const callAsCurrentUser = jest
      .fn()
      .mockResolvedValueOnce([{ index: 'logs-000001', health: 'green' }])
      .mockResolvedValueOnce([{ alias: 'logs-alias', index: 'logs-000001' }]);
    const { service, context } = makeService(callAsCurrentUser);

    const body: any = await service.getIndicesAndAliases(
      context as any,
      requestWithQuery(),
      responseFactory as any
    );

    expect(body).toEqual({
      ok: true,
      response: {
        aliases: [
          { alias: 'logs-alias', index: 'logs-000001', localCluster: true },
        ],
        indices: [
          { index: 'logs-000001', health: 'green', localCluster: true },
        ],
      },
    });
    expect(callAsCurrentUser).toHaveBeenCalledTimes(2);
    expect(callAsCurrentUser).not.toHaveBeenCalledWith(
      'transport.request',
      expect.anything()
    );
  });

  test('returns local data stream names when includeDataStreams is true', async () => {
    const callAsCurrentUser = jest
      .fn()
      .mockResolvedValueOnce([{ index: 'logs-000001', health: 'green' }])
      .mockResolvedValueOnce([{ alias: 'logs-alias', index: 'logs-000001' }])
      .mockResolvedValueOnce({
        data_streams: [{ name: 'logs-http' }, { name: 'logs-nginx' }],
      });
    const { service, context } = makeService(callAsCurrentUser);

    const body: any = await service.getIndicesAndAliases(
      context as any,
      requestWithQuery({
        includeDataStreams: 'true',
        indexOrAliasQuery: 'logs-*',
      }),
      responseFactory as any
    );

    expect(body.response.dataStreams).toEqual([
      { name: 'logs-http', localCluster: true },
      { name: 'logs-nginx', localCluster: true },
    ]);
    expect(body.response.dataStreamsError).toBe('');
    expect(callAsCurrentUser).toHaveBeenCalledWith('transport.request', {
      method: 'GET',
      path: '/_resolve/index/logs-*',
    });
  });

  test('returns remote data stream names with remote cluster metadata', async () => {
    const callAsCurrentUser = jest.fn().mockResolvedValueOnce({
      indices: [{ name: 'remote-a:logs-000001' }],
      aliases: [{ name: 'remote-a:logs-alias', indices: ['logs-000001'] }],
      data_streams: [{ name: 'remote-a:logs-http' }],
    });
    const { service, context } = makeService(callAsCurrentUser);

    const body: any = await service.getIndicesAndAliases(
      context as any,
      requestWithQuery({
        includeDataStreams: 'true',
        clusters: 'remote-a',
        queryForLocalCluster: 'false',
      }),
      responseFactory as any
    );

    expect(body.response.dataStreams).toEqual([
      { name: 'remote-a:logs-http', localCluster: false },
    ]);
    expect(body.response.dataStreamsError).toBe('');
    expect(callAsCurrentUser).toHaveBeenCalledTimes(1);
    expect(callAsCurrentUser).toHaveBeenCalledWith('transport.request', {
      method: 'GET',
      path: '/_resolve/index/remote-a:*',
    });
  });

  test('keeps indices and aliases when local data stream lookup fails', async () => {
    const callAsCurrentUser = jest
      .fn()
      .mockResolvedValueOnce([{ index: 'logs-000001', health: 'green' }])
      .mockResolvedValueOnce([{ alias: 'logs-alias', index: 'logs-000001' }])
      .mockRejectedValueOnce(new Error('resolve unavailable'));
    const { service, context } = makeService(callAsCurrentUser);

    const body: any = await service.getIndicesAndAliases(
      context as any,
      requestWithQuery({ includeDataStreams: 'true' }),
      responseFactory as any
    );

    expect(body.ok).toBe(true);
    expect(body.response.indices).toEqual([
      { index: 'logs-000001', health: 'green', localCluster: true },
    ]);
    expect(body.response.aliases).toEqual([
      { alias: 'logs-alias', index: 'logs-000001', localCluster: true },
    ]);
    expect(body.response.dataStreams).toEqual([]);
    expect(body.response.dataStreamsError).toBe('resolve unavailable');
  });

  test('returns empty data streams without error for index_not_found_exception', async () => {
    const callAsCurrentUser = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(indexNotFoundError);
    const { service, context } = makeService(callAsCurrentUser);

    const body: any = await service.getIndicesAndAliases(
      context as any,
      requestWithQuery({ includeDataStreams: 'true' }),
      responseFactory as any
    );

    expect(body).toEqual({
      ok: true,
      response: {
        aliases: [],
        indices: [],
        dataStreams: [],
        dataStreamsError: '',
      },
    });
  });

  test('uses the MDS client for data stream lookup when dataSourceId is provided', async () => {
    const callAsCurrentUser = jest.fn();
    const dataSourceCallAPI = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ data_streams: [{ name: 'logs-http' }] });
    const { service, context, client } = makeService(
      callAsCurrentUser,
      dataSourceCallAPI
    );

    await service.getIndicesAndAliases(
      context as any,
      requestWithQuery(
        { includeDataStreams: 'true' },
        { dataSourceId: 'ds-1' }
      ),
      responseFactory as any
    );

    expect(context.dataSource.opensearch.legacy.getClient).toHaveBeenCalledWith(
      'ds-1'
    );
    expect(client.asScoped).not.toHaveBeenCalled();
    expect(dataSourceCallAPI).toHaveBeenCalledWith('transport.request', {
      method: 'GET',
      path: '/_resolve/index/*',
    });
  });
});
