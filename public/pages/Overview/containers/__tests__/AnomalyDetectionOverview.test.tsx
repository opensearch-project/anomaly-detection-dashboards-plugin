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

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { AnomalyDetectionOverview } from '../AnomalyDetectionOverview';
import { Provider } from 'react-redux';
import {
  MemoryRouter as Router,
  Redirect,
  Route,
  Switch,
  RouteComponentProps,
} from 'react-router-dom';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import configureStore from '../../../../redux/configureStore';
import { sampleHttpResponses } from '../../../Overview/utils/constants';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';

jest.mock('../../../../services', () => {
  const originalModule = jest.requireActual('../../../../services');

  return {
    ...originalModule,
    getDataSourceEnabled: () => ({
      enabled: false  
    }),
    getUISettings: () => ({
      get: (flag) => {
        if (flag === 'home:useNewHomePage') {
          return false; 
        }
        return originalModule.getUISettings().get(flag);
      }
    }),
    getNavigationUI: () => ({
      HeaderControl: null 
    }),
    getApplication: () => ({
      setAppRightControls: null, 
      setAppDescriptionControls: null 
    })
  };
});


const renderWithRouter = () => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            exact
            path="/overview"
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <AnomalyDetectionOverview
                  setActionMenu={jest.fn()}
                  {...props}/>
              </CoreServicesContext.Provider>
            )}
          />
          <Redirect from="/" to="/overview" />
        </Switch>
      </Router>
    </Provider>
  ),
});

describe('<AnomalyDetectionOverview /> spec', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://test.com',
        pathname: '/',
        search: '',
        hash: '',
      },
      writable: true
    });
  });
  jest.clearAllMocks();
  describe('No sample detectors created', () => {
    test('renders component', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: { detectorList: [], totalDetectors: 0 },
      });
      const { container, getByText, queryByText } = renderWithRouter();
      expect(container).toMatchSnapshot();
      getByText('Get started');
      getByText('Monitor HTTP responses');
      getByText('Monitor eCommerce orders');
      getByText('Monitor host health');
      expect(queryByText('INSTALLED')).toBeNull();
      expect(queryByText('Detector created')).toBeNull();
      expect(queryByText('View detector and sample data')).toBeNull();
    });
  });

  describe('Some detectors created', () => {
    jest.clearAllMocks();
    test('renders component with sample detector', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          detectorList: [
            {
              id: 'sample-detector-id',
              name: sampleHttpResponses.detectorName,
              indices: sampleHttpResponses.indexName,
              totalAnomalies: 0,
              lastActiveAnomaly: 0,
            },
          ],
          totalDetectors: 1,
        },
      });
      const { container, getByText, getAllByText } = renderWithRouter();
      await waitFor(() => {});
      expect(container).toMatchSnapshot();
      getByText('Get started');
      getByText('Monitor HTTP responses');
      getByText('Monitor eCommerce orders');
      getByText('Monitor host health');
      expect(getAllByText('Detector created')).toHaveLength(1);
      expect(getAllByText('View detector and sample data')).toHaveLength(1);
      expect(getAllByText('INSTALLED')).toHaveLength(1);
    });
    test('renders component with non-sample detector', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          detectorList: [
            {
              id: 'non-sample-detector-id',
              name: 'non-sample-detector',
              indices: 'non-sample-index',
              totalAnomalies: 0,
              lastActiveAnomaly: 0,
            },
          ],
          totalDetectors: 1,
        },
      });
      const { container, getByText, queryByText } = renderWithRouter();
      await waitFor(() => {});
      expect(container).toMatchSnapshot();
      getByText('Get started');
      getByText('Monitor HTTP responses');
      getByText('Monitor eCommerce orders');
      getByText('Monitor host health');
      expect(queryByText('INSTALLED')).toBeNull();
      expect(queryByText('Detector created')).toBeNull();
    });
  });
});
