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

let mockCaptureNextUseStateSetter: ((value: any) => void) | null = null;
let mockUseStateCaptureActive = false;
let mockUseStateCallCount = 0;
const captureFeatureMissingSeveritySetter = (
  callback: (value: any) => void
) => {
  mockCaptureNextUseStateSetter = callback;
  mockUseStateCaptureActive = true;
  mockUseStateCallCount = 0;
};

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: (initial?: any) => {
      const state = actualReact.useState(initial);
      if (mockUseStateCaptureActive) {
        mockUseStateCallCount += 1;
        if (mockUseStateCallCount === 1 && mockCaptureNextUseStateSetter) {
          const [value, setter] = state;
          const callback = mockCaptureNextUseStateSetter;
          const wrappedSetter = (newValue: any) => {
            callback?.(newValue);
            return setter(newValue);
          };
          mockCaptureNextUseStateSetter = null;
          mockUseStateCaptureActive = false;
          mockUseStateCallCount = 0;
          return [value, wrappedSetter];
        }
      }
      return state;
    },
  };
});

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { AnomalyResults } from '../AnomalyResults';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { MISSING_FEATURE_DATA_SEVERITY } from '../../../../utils/constants';
import { UNITS } from '../../../../models/interfaces';
import { DETECTOR_STATE } from '../../../../../server/utils/constants';
import { useDispatch, useSelector } from 'react-redux';
import {
  getFeatureDataPointsForDetector,
  getFeatureMissingSeverities,
  buildParamsForGetAnomalyResultsWithDateRange,
} from '../../../utils/anomalyResultUtils';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../components/ContentPanel/ContentPanel', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="content-panel">{children}</div>
  ),
}));

jest.mock('../AnomalyResultsLiveChart', () => ({
  AnomalyResultsLiveChart: () => <div data-test-subj="live-chart" />,
}));

jest.mock('../AnomalyHistory', () => ({
  AnomalyHistory: () => <div data-test-subj="history" />,
}));

jest.mock('../DetectorStateDetails', () => ({
  DetectorStateDetails: () => <div data-test-subj="state-details" />,
}));

jest.mock('../../../Overview/components/SampleIndexDetailsCallout/SampleIndexDetailsCallout', () => ({
  SampleIndexDetailsCallout: () => <div data-test-subj="sample-callout" />,
}));

jest.mock('../../../utils/anomalyResultUtils', () => ({
  buildParamsForGetAnomalyResultsWithDateRange: jest.fn(),
  getFeatureDataPointsForDetector: jest.fn(),
  getFeatureMissingSeverities: jest.fn(),
  getFeatureDataMissingMessageAndActionItem: jest.fn(() => ({
    message: '',
    actionItem: '',
  })),
  FEATURE_DATA_CHECK_WINDOW_OFFSET: 2,
}));

jest.mock('../../../Overview/utils/helpers', () => ({
  detectorIsSample: jest.fn(() => false),
}));

jest.mock('../../../../redux/reducers/anomalyResults', () => ({
  getDetectorResults: jest.fn(() => ({ type: 'ad/DETECTOR_RESULTS' })),
}));

jest.mock('../../../../redux/reducers/ad', () => ({
  getDetector: jest.fn(() => ({ type: 'ad/GET_DETECTOR' })),
}));

jest.mock('../../../../pages/utils/helpers', () => ({
  getDataSourceFromURL: jest.fn(() => ({ dataSourceId: 'test-data-source' })),
}));

jest.mock('../../../../services', () => ({
  getDataSourceEnabled: jest.fn(() => ({ enabled: false })),
}));

jest.mock('react-router', () => ({
  ...(jest.requireActual('react-router') as Record<string, unknown>),
  useLocation: jest.fn(() => ({
    pathname: '',
    search: '',
    hash: '',
    state: undefined,
  })),
}));

const useSelectorMock = useSelector as jest.Mock;
const useDispatchMock = useDispatch as jest.Mock;
const getFeatureDataPointsForDetectorMock =
  getFeatureDataPointsForDetector as jest.Mock;
const getFeatureMissingSeveritiesMock =
  getFeatureMissingSeverities as jest.Mock;
const buildParamsForGetAnomalyResultsWithDateRangeMock =
  buildParamsForGetAnomalyResultsWithDateRange as jest.Mock;

const detectorId = 'detector-id';
const featureId = 'feature-id';
const featureName = 'cpu_usage';

const createDetector = (frequencyInterval: number) => ({
  id: detectorId,
  name: 'detector',
  curState: DETECTOR_STATE.RUNNING,
  enabled: true,
  enabledTime: 1587431400000,
  disabledTime: undefined,
  lastUpdateTime: 1587431400000,
  indices: ['index'],
  featureAttributes: [
    {
      featureId,
      featureName,
      featureEnabled: true,
      importance: 1,
      aggregationQuery: {},
    },
  ],
  detectionInterval: {
    period: {
      interval: 1,
      unit: UNITS.MINUTES,
    },
  },
  frequency: {
    period: {
      interval: frequencyInterval,
      unit: UNITS.MINUTES,
    },
  },
  windowDelay: {
    period: {
      interval: 0,
      unit: UNITS.MINUTES,
    },
  },
  resultIndex: '',
  imputationOption: undefined,
});

const buildFeatureDataPoints = (isMissing: boolean) => ({
  [featureName]: [
    {
      isMissing,
      plotTime: 1587431700000,
      startTime: 1587431640000,
      endTime: 1587431700000,
    },
  ],
});

const renderWithCoreContext = (ui: React.ReactElement) => {
  const coreServicesMock = {
    chrome: {
      setBreadcrumbs: jest.fn(),
    },
  } as any;

  return render(
    <CoreServicesContext.Provider value={coreServicesMock}>
      {ui}
    </CoreServicesContext.Provider>
  );
};

const renderAnomalyResults = (frequencyInterval: number) => {
  const detector = createDetector(frequencyInterval);
  const store = {
    ad: { detectors: { [detectorId]: detector } },
    alerting: { monitors: {} },
    anomalyResults: {
      requesting: false,
      total: 0,
      anomalies: [],
      errorMessage: '',
      featureData: {},
    },
  };

  useSelectorMock.mockImplementation((selector: any) => selector(store));

  buildParamsForGetAnomalyResultsWithDateRangeMock.mockReturnValue({});

  return renderWithCoreContext(
    <AnomalyResults
      detectorId={detectorId}
      onStartDetector={jest.fn()}
      onStopDetector={jest.fn()}
      onSwitchToConfiguration={jest.fn()}
      onSwitchToHistorical={jest.fn()}
    />
  );
};

describe('checkLatestFeatureDataPoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptureNextUseStateSetter = null;
    mockUseStateCaptureActive = false;
    mockUseStateCallCount = 0;
  });

  test('sets severity to GREEN when missing last 5 minutes, frequency 5 minutes', async () => {
    const setFeatureMissingSeverityMock = jest.fn();
    captureFeatureMissingSeveritySetter(setFeatureMissingSeverityMock);

    const mockDispatch = jest.fn((action) => {
      if (action?.type === 'ad/DETECTOR_RESULTS') {
        return Promise.resolve({
          response: {
            featureResults: { [featureId]: [] },
          },
        });
      }
      return Promise.resolve();
    });
    useDispatchMock.mockReturnValue(mockDispatch);

    getFeatureDataPointsForDetectorMock.mockReturnValue(
      buildFeatureDataPoints(true)
    );
    const severityMap = new Map();
    severityMap.set(MISSING_FEATURE_DATA_SEVERITY.GREEN, [featureName]);
    getFeatureMissingSeveritiesMock.mockReturnValue(severityMap);

    renderAnomalyResults(5);

    await waitFor(() =>
      expect(getFeatureDataPointsForDetectorMock).toHaveBeenCalled()
    );

    // Ensure the helper is called with detectorFrequencyAdjusted=true (6th arg)
    const args = (getFeatureDataPointsForDetectorMock as jest.Mock).mock
      .calls[0];
    expect(args[5]).toBe(true);

    await waitFor(() =>
      expect(setFeatureMissingSeverityMock).toHaveBeenCalledWith(
        MISSING_FEATURE_DATA_SEVERITY.GREEN
      )
    );
  });

  test('sets severity YELLOW when detector frequency matches interval and data is missing', async () => {
    const setFeatureMissingSeverityMock = jest.fn();
    captureFeatureMissingSeveritySetter(setFeatureMissingSeverityMock);

    const mockDispatch = jest.fn((action) => {
      if (action?.type === 'ad/DETECTOR_RESULTS') {
        return Promise.resolve({
          response: {
            featureResults: { [featureId]: [] },
          },
        });
      }
      return Promise.resolve();
    });
    useDispatchMock.mockReturnValue(mockDispatch);

    getFeatureDataPointsForDetectorMock.mockReturnValue(
      buildFeatureDataPoints(true)
    );
    const severityMap = new Map();
    severityMap.set(MISSING_FEATURE_DATA_SEVERITY.GREEN, []);
    severityMap.set(MISSING_FEATURE_DATA_SEVERITY.YELLOW, [featureName]);
    getFeatureMissingSeveritiesMock.mockReturnValue(severityMap);

    renderAnomalyResults(1);

    await waitFor(() =>
      expect(getFeatureDataPointsForDetectorMock).toHaveBeenCalled()
    );

    await waitFor(() =>
      expect(setFeatureMissingSeverityMock).toHaveBeenCalledWith(
        MISSING_FEATURE_DATA_SEVERITY.YELLOW
      )
    );

    // Ensure the helper is called with detectorFrequencyAdjusted=true (6th arg)
    const args2 = (getFeatureDataPointsForDetectorMock as jest.Mock).mock
      .calls[0];
    expect(args2[5]).toBe(true);
  });
});
