/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route } from 'react-router-dom';
import { AnomalyDetectionOverview } from '../AnomalyDetectionOverview';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import configureStore from '../../../../redux/configureStore';
import { coreServicesMock, httpClientMock } from '../../../../../test/mocks';
import { AD_NODE_API } from '../../../../../utils/constants';

let mockMenuConfig: any;
let mockHideLocalCluster = true;
const mockNotifications = { toasts: { addDanger: jest.fn() } };
const mockDataSourceMenu = ({ componentConfig }) => {
  mockMenuConfig = componentConfig;
  return null;
};

jest.mock('../../../../services', () => ({
  ...jest.requireActual('../../../../services'),
  getDataSourceEnabled: () => ({
    enabled: true,
    hideLocalCluster: mockHideLocalCluster,
  }),
  getDataSourceManagementPlugin: () => ({
    ui: { getDataSourceMenu: () => mockDataSourceMenu },
  }),
  getNotifications: () => mockNotifications,
  getSavedObjectsClient: () => ({}),
  getUISettings: () => ({ get: () => false }),
  getNavigationUI: () => ({ HeaderControl: null }),
  getApplication: () => ({}),
}));

const sourceId = 'analytic-engine-source';
const source = {
  attributes: {
    dataSourceEngineType: 'AnalyticEngine',
    dataSourceVersion: '3.7.0',
    installedPlugins: ['opensearch-anomaly-detection'],
  },
};

function renderOverview(search: string) {
  let currentLocation: any;
  const result = render(
    <Provider store={configureStore(httpClientMock)}>
      <MemoryRouter initialEntries={[`/overview${search}`]}>
        <Route
          path="/overview"
          render={(props) => {
            currentLocation = props.location;
            return (
              <CoreServicesContext.Provider value={coreServicesMock as any}>
                <AnomalyDetectionOverview
                  {...props}
                  setActionMenu={jest.fn()}
                  landingDataSourceId={
                    new URLSearchParams(search).get('dataSourceId') ?? undefined
                  }
                />
              </CoreServicesContext.Provider>
            );
          }}
        />
      </MemoryRouter>
    </Provider>
  );
  return { ...result, getLocation: () => currentLocation };
}

describe('AD overview data source initialization', () => {
  beforeEach(() => {
    mockHideLocalCluster = true;
    mockMenuConfig = undefined;
    (httpClientMock.get as jest.Mock).mockResolvedValue({
      ok: true,
      response: { detectorList: [], totalDetectors: 0, indices: [] },
    });
  });

  test.each(['', '?dataSourceId='])(
    'waits for the workspace source for URL %s',
    async (search) => {
      const { getLocation, getByTestId } = renderOverview(search);
      expect(mockMenuConfig.activeOption).toBeUndefined();
      expect(mockMenuConfig.dataSourceFilter(source)).toBe(true);
      expect(httpClientMock.get).not.toHaveBeenCalled();

      act(() => mockMenuConfig.onSelectedDataSources([{ id: sourceId }]));

      await waitFor(() =>
        expect(httpClientMock.get).toHaveBeenCalledWith(
          `..${AD_NODE_API._INDICES}/${sourceId}`,
          expect.anything()
        )
      );
      expect(httpClientMock.get).toHaveBeenCalledWith(
        `${AD_NODE_API.DETECTOR}/_list/${sourceId}`,
        expect.objectContaining({
          query: expect.objectContaining({ dataSourceId: sourceId }),
        })
      );
      expect(
        (httpClientMock.get as jest.Mock).mock.calls.every(([url]) =>
          url.endsWith(`/${sourceId}`)
        )
      ).toBe(true);
      expect(getLocation().search).toContain(`dataSourceId=${sourceId}`);
      expect(getByTestId('add_detector')).toHaveAttribute(
        'href',
        expect.stringContaining(`dataSourceId=${sourceId}`)
      );
      expect(mockNotifications.toasts.addDanger).not.toHaveBeenCalled();
    }
  );

  test('preserves an explicit remote source', async () => {
    renderOverview(`?dataSourceId=${sourceId}`);
    expect(mockMenuConfig.activeOption).toEqual([{ id: sourceId }]);
    await waitFor(() =>
      expect(httpClientMock.get).toHaveBeenCalledWith(
        `..${AD_NODE_API._INDICES}/${sourceId}`,
        expect.anything()
      )
    );
  });

  test('preserves explicit local-cluster selection when available', async () => {
    mockHideLocalCluster = false;
    renderOverview('?dataSourceId=');
    expect(mockMenuConfig.activeOption).toEqual([{ id: '' }]);
    await waitFor(() =>
      expect(httpClientMock.get).toHaveBeenCalledWith(
        `..${AD_NODE_API._INDICES}`,
        expect.anything()
      )
    );
  });
});
