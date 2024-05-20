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
import { render, screen } from '@testing-library/react';
import { DetectorDetail, DetectorRouterProps } from '../DetectorDetail';
import { Provider } from 'react-redux';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
  Redirect,
} from 'react-router-dom';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { useFetchDetectorInfo } from '../../../CreateDetectorSteps/hooks/useFetchDetectorInfo';

jest.mock('../../hooks/useFetchMonitorInfo');

//jest.mock('../../../CreateDetectorSteps/hooks/useFetchDetectorInfo');
jest.mock('../../../CreateDetectorSteps/hooks/useFetchDetectorInfo', () => ({
  // The jest.mock function is used at the top level of the test file to mock the entire module.
  // Within each test, the mock implementation for useFetchDetectorInfo is set using jest.Mock.
  // This ensures that the hook returns the desired values for each test case.
  useFetchDetectorInfo: jest.fn(),
}));

jest.mock('../../../../services', () => ({
  ...jest.requireActual('../../../../services'),

  getDataSourceEnabled: () => ({
    enabled: false,
  }),
}));

const detectorId = '4QY4YHEB5W9C7vlb3Mou';

// Configure the mock store
const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

const renderWithRouter = (detectorId: string, initialState: any) => ({
  ...render(
    <Provider store={mockStore(initialState)}>
      <Router>
        <Switch>
          <Route
            path={`/detectors/${detectorId}/results`}
            render={(props: RouteComponentProps<DetectorRouterProps>) => {
              const testProps = {
                ...props,
                match: {
                  params: { detectorId: detectorId },
                  isExact: false,
                  path: '',
                  url: '',
                },
              };
              return (
                <CoreServicesContext.Provider value={coreServicesMock}>
                  <DetectorDetail {...testProps} />
                </CoreServicesContext.Provider>
              );
            }}
          />
          <Redirect from="/" to={`/detectors/${detectorId}/results`} />
        </Switch>
      </Router>
    </Provider>
  ),
});

const resultIndex = 'opensearch-ad-plugin-result-test-query2';

describe('detector detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('detector info still loading', () => {
    const detectorInfo = {
      detector: getRandomDetector(true, resultIndex),
      hasError: false,
      isLoadingDetector: true,
      errorMessage: undefined,
    };

    (useFetchDetectorInfo as jest.Mock).mockImplementation(() => detectorInfo);

    const initialState = {
      opensearch: {
        indices: [{ health: 'green', index: resultIndex }],
        requesting: false,
      },
      ad: {
        detectors: {},
      },
      alerting: {
        monitors: {},
      },
    };

    renderWithRouter(detectorId, initialState);
    const element = screen.queryByTestId('missingResultIndexCallOut');

    // Assert that the element is not in the document
    expect(element).toBeNull();
  });

  test('detector has no result index', () => {
    const detectorInfo = {
      detector: getRandomDetector(true, undefined),
      hasError: false,
      isLoadingDetector: true,
      errorMessage: undefined,
    };

    (useFetchDetectorInfo as jest.Mock).mockImplementation(() => detectorInfo);

    const initialState = {
      opensearch: {
        indices: [{ health: 'green', index: resultIndex }],
        requesting: false,
      },
      ad: {
        detectors: {},
      },
      alerting: {
        monitors: {},
      },
    };

    renderWithRouter(detectorId, initialState);
    const element = screen.queryByTestId('missingResultIndexCallOut');

    // Assert that the element is not in the document
    expect(element).toBeNull();
  });

  test('cat indices are being requested', () => {
    const detectorInfo = {
      detector: getRandomDetector(true, resultIndex),
      hasError: false,
      isLoadingDetector: false,
      errorMessage: undefined,
    };

    (useFetchDetectorInfo as jest.Mock).mockImplementation(() => detectorInfo);

    const initialState = {
      opensearch: {
        indices: [],
        requesting: true,
      },
      ad: {
        detectors: {},
      },
      alerting: {
        monitors: {},
      },
    };

    renderWithRouter(detectorId, initialState);
    const element = screen.queryByTestId('missingResultIndexCallOut');

    // Assert that the element is not in the document
    expect(element).toBeNull();
  });

  test('visible indices are empty', () => {
    const detectorInfo = {
      detector: getRandomDetector(true, resultIndex),
      hasError: false,
      isLoadingDetector: false,
      errorMessage: undefined,
    };

    (useFetchDetectorInfo as jest.Mock).mockImplementation(() => detectorInfo);

    const initialState = {
      opensearch: {
        indices: [],
        requesting: false,
      },
      ad: {
        detectors: {},
      },
      alerting: {
        monitors: {},
      },
    };

    renderWithRouter(detectorId, initialState);
    const element = screen.queryByTestId('missingResultIndexCallOut');

    // Assert that the element is not in the document
    expect(element).toBeNull();
  });

  test('the result index is not found in the visible indices', () => {
    const detectorInfo = {
      detector: getRandomDetector(true, resultIndex),
      hasError: false,
      isLoadingDetector: false,
      errorMessage: undefined,
    };

    (useFetchDetectorInfo as jest.Mock).mockImplementation(() => detectorInfo);

    const initialState = {
      opensearch: {
        indices: [{ health: 'green', index: '.kibana_-962704462_v992471_1' }],
        requesting: false,
      },
      ad: {
        detectors: {},
      },
      alerting: {
        monitors: {},
      },
    };

    renderWithRouter(detectorId, initialState);
    const element = screen.queryByTestId('missingResultIndexCallOut');

    // Assert that the element is in the document
    expect(element).not.toBeNull();
  });

  test('the result index is found in the visible indices', () => {
    const detector = getRandomDetector(true, resultIndex);

    // Set up the mock implementation for useFetchDetectorInfo
    (useFetchDetectorInfo as jest.Mock).mockImplementation(() => ({
      detector: detector,
      hasError: false,
      isLoadingDetector: false,
      errorMessage: undefined,
    }));

    const initialState = {
      opensearch: {
        indices: [
          { health: 'green', index: '.kibana_-962704462_v992471_1' },
          { health: 'green', index: resultIndex },
        ],
        requesting: false,
      },
      ad: {
        detectors: {},
      },
      alerting: {
        monitors: {},
      },
    };

    renderWithRouter(detectorId, initialState);
    const element = screen.queryByTestId('missingResultIndexCallOut');

    // Assert that the element is not in the document
    expect(element).toBeNull();
  });
});
