/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { AnomaliesLiveChart } from '../AnomaliesLiveChart';
import { SELECTED_DETECTORS } from '../../../../pages/utils/__tests__/constants';
import { Provider } from 'react-redux';
import { coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { mockedStore } from '../../../../redux/utils/testUtils';
const anomalyResponse = [
  {
    ok: true,
    response: {
      anomaly_grade: 0.10949221682655441,
      data_start_time: 1651817250642,
      data_end_time: 1651817310642,
      detector_id: 'gtU2l4ABuV34PY9ITTdm',
      name: 'test2',
    },
  },
];
const anomalyResultQuery = [
  {
    anomaly_grade: 0.10949221682655441,
    data_start_time: 1651817250642,
    data_end_time: 1651817310642,
    detector_id: 'gtU2l4ABuV34PY9ITTdm',
  },
];

jest.mock('../../utils/utils', () => ({
  getLatestAnomalyResultsForDetectorsByTimeRange: jest.fn(
    () => anomalyResponse
  ),
  getFloorPlotTime: jest.fn(() => 1651817250642),
  getLatestAnomalyResultsByTimeRange: jest.fn(() => anomalyResultQuery),
  visualizeAnomalyResultForXYChart: jest.fn(),
}));
describe('<AnomaliesLiveChart /> spec', () => {
  test('AnomaliesLiveChart with Sample anomaly data', async () => {
    const { container, getByTestId, getAllByText, getByText } = render(
      <Provider store={mockedStore()}>
        <CoreServicesContext.Provider value={coreServicesMock}>
          <AnomaliesLiveChart {...SELECTED_DETECTORS} />
        </CoreServicesContext.Provider>
      </Provider>
    );
    //mock current last update to a specific date so doesn't produce new snapshot each minute
    Date.now = jest.fn().mockReturnValue(new Date('2021-06-06T12:33:37.000Z'));
    await waitFor(() => {
      expect(
        getByTestId('dashboardFullScreenButton').innerHTML.includes(
          'euiIcon-isssLoaded'
        )
      );
    });
    await waitFor(() => {});
    expect(container).toMatchSnapshot();
    getAllByText('Detector with the most recent anomaly');
  });
});
