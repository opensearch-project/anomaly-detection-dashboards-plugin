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
import { render, wait } from '@testing-library/react';
import { AnomalyDetectionOverview } from '../AnomalyDetectionOverview';
import { Provider } from 'react-redux';
import {
  MemoryRouter as Router,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import configureStore from '../../../../redux/configureStore';
import {
  Detectors,
  initialDetectorsState,
} from '../../../../redux/reducers/ad';
import { sampleHttpResponses } from '../../../Overview/utils/constants';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';

const renderWithRouter = (isLoadingDetectors: boolean = false) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            exact
            path="/overview"
            render={() => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <AnomalyDetectionOverview
                  isLoadingDetectors={isLoadingDetectors}
                />{' '}
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
  jest.clearAllMocks();
  describe('No sample detectors created', () => {
    test('renders component', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: { detectorList: [], totalDetectors: 0 },
      });
      const { container, getByText, queryByText } = renderWithRouter();
      expect(container).toMatchSnapshot();
      getByText('Anomaly detection');
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
      await wait();
      expect(container).toMatchSnapshot();
      getByText('Anomaly detection');
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
      await wait();
      expect(container).toMatchSnapshot();
      getByText('Anomaly detection');
      getByText('Monitor HTTP responses');
      getByText('Monitor eCommerce orders');
      getByText('Monitor host health');
      expect(queryByText('INSTALLED')).toBeNull();
      expect(queryByText('Detector created')).toBeNull();
    });
  });
});
