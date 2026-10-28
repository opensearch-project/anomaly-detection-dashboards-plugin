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
import { matchDetector } from '../../../../redux/reducers/ad';
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

function renderDefineDetector(route: string) {
  const history = createMemoryHistory({ initialEntries: [route] });
  const store = mockStore({
    ad: { detectors: {}, errorMessage: '', requesting: false },
    opensearch: { dataTypes: {}, clusters: [], requesting: false },
  });
  render(
    <Provider store={store}>
      <Router history={history}>
        <Route
          render={(props) => (
            <CoreServicesContext.Provider value={coreServicesMock}>
              <DefineDetector
                {...props}
                isEdit={false}
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
    (getDataSourceManagementPlugin as jest.Mock).mockReturnValue({
      ui: {
        getDataSourceMenu: () => ({ componentConfig }: any) => {
          pickerConfig = componentConfig;
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
});
