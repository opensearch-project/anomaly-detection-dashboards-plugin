/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router-dom';
import { DetectorList } from '../List';
import { CoreServicesContext } from '../../../../../components/CoreServices/CoreServices';
import configureStore from '../../../../../redux/configureStore';
import { coreServicesMock, httpClientMock } from '../../../../../../test/mocks';
import { AD_NODE_API } from '../../../../../../utils/constants';

let mockMenuConfig: any;
let mockDataSourceEnabled = true;
let mockHideLocalCluster = true;
const mockHttpClient = httpClientMock;
const mockDataSourceMenu = ({ componentConfig }) => {
  mockMenuConfig = componentConfig;
  return null;
};

jest.mock('../../../../../services', () => ({
  ...jest.requireActual('../../../../../services'),
  getDataSourceEnabled: () => ({
    enabled: mockDataSourceEnabled,
    hideLocalCluster: mockHideLocalCluster,
  }),
  getDataSourceManagementPlugin: () => ({
    ui: { getDataSourceMenu: () => mockDataSourceMenu },
  }),
  getClient: () => mockHttpClient,
  getNotifications: () => ({ toasts: { addDanger: jest.fn() } }),
  getSavedObjectsClient: () => ({}),
  getUISettings: () => ({ get: () => false }),
  getNavigationUI: () => ({ HeaderControl: null }),
  getApplication: () => ({}),
}));

// Drive the List's actual debounced callback without coupling this regression to
// EUI's combobox internals. Request construction and Redux remain unmocked.
jest.mock('../../../components/ListFilters/ListFilters', () => ({
  ListFilters: ({ onSearchIndexChange }) => (
    <input
      aria-label="Search indices"
      onChange={(event) => onSearchIndexChange(event.target.value)}
    />
  ),
}));

function renderList(search: string) {
  return render(
    <Provider store={configureStore(mockHttpClient)}>
      <MemoryRouter initialEntries={[`/detectors${search}`]}>
        <Route
          path="/detectors"
          render={(props) => (
            <CoreServicesContext.Provider value={coreServicesMock as any}>
              <DetectorList {...props} setActionMenu={jest.fn()} />
            </CoreServicesContext.Provider>
          )}
        />
      </MemoryRouter>
    </Provider>
  );
}

async function searchIndices(input: HTMLElement, query: string) {
  fireEvent.change(input, { target: { value: query } });
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

const indexRequest = (query: string) => ({
  query: {
    indexOrAliasQuery: query,
    clusters: '*',
    queryForLocalCluster: true,
  },
});

describe('AD list index search data source readiness', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockMenuConfig = undefined;
    mockDataSourceEnabled = true;
    mockHideLocalCluster = true;
    (mockHttpClient.get as jest.Mock).mockResolvedValue({
      ok: true,
      response: {
        detectorList: [],
        totalDetectors: 0,
        indices: [],
        aliases: [],
        clusters: [],
        monitors: [],
      },
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test.each(['', '?dataSourceId='])(
    'ignores index search until a remote source is selected for URL %s',
    async (search) => {
      const { getByRole } = renderList(search);
      const input = getByRole('textbox', { name: 'Search indices' });
      expect(mockMenuConfig.activeOption).toBeUndefined();

      await searchIndices(input, 'logs');
      expect(mockHttpClient.get).not.toHaveBeenCalled();

      await act(async () => {
        mockMenuConfig.onSelectedDataSources([{ id: 'remote-source' }]);
      });
      // The ignored search must not update indexQuery before resolution.
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `..${AD_NODE_API.GET_INDICES_AND_ALIASES}/remote-source`,
        indexRequest('')
      );

      (mockHttpClient.get as jest.Mock).mockClear();
      await searchIndices(input, '');
      await searchIndices(input, 'logs');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `..${AD_NODE_API.GET_INDICES_AND_ALIASES}/remote-source`,
        indexRequest('*logs*')
      );
      expect(mockHttpClient.get).not.toHaveBeenCalledWith(
        `..${AD_NODE_API.GET_INDICES_AND_ALIASES}`,
        expect.anything()
      );
    }
  );

  test.each([
    ['an explicit local-cluster selection', true, '?dataSourceId='],
    ['MDS disabled', false, ''],
  ])('allows index searches with %s', async (_case, enabled, search) => {
    mockDataSourceEnabled = enabled;
    mockHideLocalCluster = false;
    const { getByRole } = renderList(search);
    await act(async () => {});
    (mockHttpClient.get as jest.Mock).mockClear();

    await searchIndices(
      getByRole('textbox', { name: 'Search indices' }),
      'logs'
    );

    expect(mockHttpClient.get).toHaveBeenCalledWith(
      `..${AD_NODE_API.GET_INDICES_AND_ALIASES}`,
      indexRequest('*logs*')
    );
  });
});
