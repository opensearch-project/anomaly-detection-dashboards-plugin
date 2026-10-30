/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { DefineDetector } from '../DefineDetector';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { coreServicesMock } from '../../../../../test/mocks';
import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../utils/constants';
import { getDetector, matchDetector } from '../../../../redux/reducers/ad';
import {
  getClustersInfo,
  getIndicesAndAliases,
} from '../../../../redux/reducers/opensearch';
import {
  getDataSourceEnabled,
  getDataSourceManagementPlugin,
  getNotifications,
  getSavedObjectsClient,
} from '../../../../services';

jest.mock('../../../../services', () => ({
  ...jest.requireActual('../../../../services'),
  getDataSourceEnabled: jest.fn(),
  getDataSourceManagementPlugin: jest.fn(),
  getNotifications: jest.fn(),
  getSavedObjectsClient: jest.fn(),
}));

jest.mock('../../../../redux/reducers/ad', () => ({
  ...jest.requireActual('../../../../redux/reducers/ad'),
  matchDetector: jest.fn(),
  getDetector: jest.fn(),
}));

jest.mock('../../../../redux/reducers/opensearch', () => ({
  ...jest.requireActual('../../../../redux/reducers/opensearch'),
  getClustersInfo: jest.fn((...args) =>
    jest.requireActual('../../../../redux/reducers/opensearch').getClustersInfo(...args)
  ),
  getIndicesAndAliases: jest.fn((...args) =>
    jest.requireActual('../../../../redux/reducers/opensearch').getIndicesAndAliases(...args)
  ),
}));

const mockStore = configureStore([thunk]);
const analyticEngine = {
  id: 'analytic-engine-id',
  attributes: {
    title: 'Analytic engine',
    dataSourceEngineType: 'AnalyticEngine',
    dataSourceVersion: '3.1.0',
    installedPlugins: ['opensearch-anomaly-detection'],
  },
};

function renderDefineDetector(route: string, isEdit = false) {
  const history = createMemoryHistory({ initialEntries: [route] });
  const store = mockStore({
    ad: { detectors: {}, errorMessage: '', requesting: false },
    opensearch: { dataTypes: {}, clusters: [], requesting: false },
  });
  render(
    <Provider store={store}>
      <Router history={history}>
        <Route
          path={isEdit ? '/detectors/:detectorId/edit' : undefined}
          render={(props) => (
            <CoreServicesContext.Provider value={coreServicesMock}>
              <DefineDetector
                {...props}
                isEdit={isEdit}
                setActionMenu={jest.fn()}
                initialValues={{
                  ...INITIAL_DETECTOR_DEFINITION_VALUES,
                  clusters: [{ label: 'local', cluster: 'local', localcluster: 'true' }],
                }}
              />
            </CoreServicesContext.Provider>
          )}
        />
      </Router>
    </Provider>
  );
  return history;
}

describe('DefineDetector data source initialization', () => {
  let pickerConfig: any;
  const addDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getDataSourceEnabled as jest.Mock).mockReturnValue({
      enabled: true,
      hideLocalCluster: true,
    });
    (getNotifications as jest.Mock).mockReturnValue({ toasts: { addDanger } });
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue(analyticEngine),
    });
    (matchDetector as jest.Mock).mockImplementation(() => () =>
      Promise.resolve({ response: { match: false } })
    );
    (getDetector as jest.Mock).mockImplementation(() => () => Promise.resolve({}));
    (getDataSourceManagementPlugin as jest.Mock).mockReturnValue({
      ui: {
        getDataSourceMenu: () => ({ componentType, componentConfig }: any) => {
          pickerConfig = componentConfig;
          if (componentType === 'DataSourceView') {
            return <span data-test-subj="readOnlyDataSource">{componentConfig.activeOption[0].id}</span>;
          }
          return (
            <button
              onClick={() => componentConfig.onSelectedDataSources([{ id: analyticEngine.id }])}
            >
              Select analytic engine
            </button>
          );
        },
      },
    });
  });

  it.each(['/create?dataSourceId=', '/create'])(
    'waits for the default source before making requests for %s',
    async (route) => {
      const history = renderDefineDetector(route);
      expect(pickerConfig.activeOption).toBeUndefined();
      expect(pickerConfig.dataSourceFilter(analyticEngine)).toBe(true);
      expect(getClustersInfo).not.toHaveBeenCalled();
      expect(getIndicesAndAliases).not.toHaveBeenCalled();
      expect(matchDetector).not.toHaveBeenCalled();
      expect(screen.getByTestId('defineDetectorNextButton')).toBeDisabled();

      fireEvent.click(screen.getByText('Select analytic engine'));

      await waitFor(() => {
        expect(getClustersInfo).toHaveBeenCalledWith(analyticEngine.id);
        expect(getIndicesAndAliases).toHaveBeenCalledWith('', analyticEngine.id, '', true);
      });
      expect(history.location.search).toBe(`?dataSourceId=${analyticEngine.id}`);
      expect(screen.getByTestId('defineDetectorNextButton')).toBeEnabled();
      const nameInput = screen.getByTestId('detectorNameTextInput');
      fireEvent.change(nameInput, { target: { value: 'new-detector' } });
      fireEvent.blur(nameInput);
      await waitFor(() =>
        expect(matchDetector).toHaveBeenCalledWith('new-detector', analyticEngine.id)
      );
      fireEvent.click(screen.getByText('Cancel'));
      expect(history.location.pathname).toBe('/detectors');
      expect(new URLSearchParams(history.location.search).get('dataSourceId')).toBe(analyticEngine.id);
      expect(addDanger).not.toHaveBeenCalled();
    }
  );

  it.each(['/detectors/detector-id/edit?dataSourceId=', '/detectors/detector-id/edit'])(
    'resolves the source before loading an edit route: %s',
    async (route) => {
      const history = renderDefineDetector(route, true);
      expect(pickerConfig.activeOption).toBeUndefined();
      expect(pickerConfig.dataSourceFilter(analyticEngine)).toBe(true);
      expect(getDetector).not.toHaveBeenCalled();
      expect(getClustersInfo).not.toHaveBeenCalled();
      expect(getIndicesAndAliases).not.toHaveBeenCalled();
      expect(screen.getByTestId('updateDetectorButton')).toBeDisabled();

      fireEvent.click(screen.getByText('Select analytic engine'));

      await waitFor(() =>
        expect(getDetector).toHaveBeenCalledWith('detector-id', analyticEngine.id)
      );
      expect(history.location.search).toBe(`?dataSourceId=${analyticEngine.id}`);
      expect(screen.getByTestId('readOnlyDataSource')).toHaveTextContent(analyticEngine.id);
      expect(screen.queryByText('Select analytic engine')).not.toBeInTheDocument();
      expect(screen.getByTestId('updateDetectorButton')).toBeEnabled();
    }
  );

  it.each([
    [true, true, analyticEngine.id],
    [true, false, ''],
    [false, false, ''],
  ])('preserves edit selection with MDS=%s and local hidden=%s', async (enabled, hideLocalCluster, id) => {
    (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled, hideLocalCluster });
    renderDefineDetector(`/detectors/detector-id/edit?dataSourceId=${id}`, true);
    await waitFor(() => expect(getDetector).toHaveBeenCalledWith('detector-id', id));
    expect(screen.queryByText('Select analytic engine')).not.toBeInTheDocument();
    expect(screen.getByTestId('updateDetectorButton')).toBeEnabled();
  });
});
