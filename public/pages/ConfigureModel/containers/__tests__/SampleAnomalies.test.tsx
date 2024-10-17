// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Provider } from 'react-redux';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { SampleAnomalies } from '../SampleAnomalies';
import configureStore from '../../../../redux/configureStore';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { mockedStore } from '../../../../redux/utils/testUtils';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { prepareDetector, focusOnFirstWrongFeature } from '../../utils/helpers';
import { createMemoryHistory } from 'history';
import {
  FeaturesFormikValues,
  ImputationFormikValues,
  RuleFormikValues,
} from '../../../../pages/ConfigureModel/models/interfaces';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { FEATURE_TYPE } from '../../../../models/interfaces';

// Mock the helper functions
jest.mock('../../utils/helpers', () => ({
  ...jest.requireActual('../../utils/helpers'),
  prepareDetector: jest.fn(() => ({
    // mock a detector object with at least an id, preventing the undefined error when detector.id is accessed in getSampleAdResult.
    id: 'test-detector-id',
    name: 'test-detector',
    description: 'test-detector-description',
  })),
  focusOnFirstWrongFeature: jest.fn(() => false),
}));

// Mock the Redux actions if necessary
jest.mock('../../../../redux/reducers/previewAnomalies', () => ({
  previewDetector: jest.fn(() => async () => Promise.resolve()),
}));

describe('<SampleAnomalies /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  test('calls prepareDetector with imputationOption and suppressionRules when previewDetector button is clicked', async () => {
    // Set up the mock props
    const mockDetector = getRandomDetector();

    const mockFeatureList: FeaturesFormikValues[] = [
      {
        featureId: 'feature1',
        featureName: 'Feature 1',
        featureEnabled: true,
        aggregationBy: 'sum',
        aggregationOf: [{ label: 'bytes' }],
        featureType: FEATURE_TYPE.SIMPLE,
        aggregationQuery: '',
      },
    ];

    const mockImputationOption: ImputationFormikValues = {
      imputationMethod: 'zero',
    };

    const mockSuppressionRules: RuleFormikValues[] = [
      {
        featureName: '',
        absoluteThreshold: undefined,
        relativeThreshold: undefined,
        aboveBelow: 'above',
      },
    ];

    const props = {
      detector: mockDetector,
      featureList: mockFeatureList,
      shingleSize: 8,
      categoryFields: ['category1'],
      errors: {},
      setFieldTouched: jest.fn(),
      imputationOption: mockImputationOption,
      suppressionRules: mockSuppressionRules,
    };

    // Create a mock history and store
    const history = createMemoryHistory();
    const initialState = {
      anomalies: {
        anomaliesResult: {
          anomalies: [],
        },
      },
    };
    const store = mockedStore();

    const { getByText } = render(
      <Provider store={store}>
        <Router history={history}>
          <CoreServicesContext.Provider value={coreServicesMock}>
            <SampleAnomalies {...props} />
          </CoreServicesContext.Provider>
        </Router>
      </Provider>
    );

    // Simulate clicking the previewDetector button
    fireEvent.click(getByText('Preview anomalies'));

    // Wait for async actions to complete
    await waitFor(() => {
      expect(prepareDetector).toHaveBeenCalledWith(
        props.featureList,
        props.shingleSize,
        props.categoryFields,
        expect.anything(), // newDetector (could be the same as props.detector or modified)
        true,
        props.imputationOption,
        props.suppressionRules
      );
    });
  });
});
