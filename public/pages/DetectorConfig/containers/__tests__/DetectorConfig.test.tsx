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
import { Provider } from 'react-redux';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { DetectorConfig } from '../DetectorConfig';
import {
  Detector,
  UiMetaData,
  FILTER_TYPES,
  UIFilter,
  FEATURE_TYPE,
  UiFeature,
  FeatureAttributes,
  OPERATORS_MAP,
  UNITS,
} from '../../../../models/interfaces';
import {
  getRandomDetector,
  getUIMetadata,
} from '../../../../redux/reducers/__tests__/utils';
import { coreServicesMock } from '../../../../../test/mocks';
import { toStringConfigCell } from '../../../ReviewAndCreate/utils/helpers';
import { DATA_TYPES } from '../../../../utils/constants';
import { mockedStore, initialState } from '../../../../redux/utils/testUtils';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import {
  ImputationMethod,
  Action,
  ThresholdType,
  Operator,
} from '../../../../models/types';
import { DETECTOR_STATE } from '../../../../../server/utils/constants';

const renderWithRouter = (detector: Detector) => ({
  ...render(
    <Provider
      store={mockedStore({
        ...initialState,
        ad: {
          ...initialState.ad,
          detectors: {
            [detector.id]: detector,
          },
        },
      })}
    >
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <DetectorConfig
                  detectorId={detector.id}
                  onEditDetector={jest.fn()}
                  onEditFeatures={jest.fn()}
                  {...props}
                />
              </CoreServicesContext.Provider>
            )}
          />
        </Switch>
      </Router>
    </Provider>
  ),
});

const fieldInFilter = 'age';
const filters = [
  {
    filterType: FILTER_TYPES.SIMPLE,
    fieldInfo: [{ label: fieldInFilter, type: DATA_TYPES.NUMBER }],
    operator: OPERATORS_MAP.IN_RANGE,
    fieldRangeStart: 20,
    fieldRangeEnd: 40,
  },
  {
    filterType: FILTER_TYPES.CUSTOM,
    query: { some: 'query' },
  },
] as UIFilter[];

const featureQuery1 = {
  featureName: 'value',
  featureEnabled: true,
  aggregationQuery: {
    size: 0,
    query: {
      bool: {
        must: {
          terms: {
            detector_id: ['detector_1', 'detector_2'],
          },
        },
      },
    },
    aggs: {
      unique_detectors: {
        terms: {
          field: 'detector_id',
          size: 20,
          order: {
            total_anomalies_in_24hr: 'asc',
          },
        },
        aggs: {
          total_anomalies_in_24hr: {
            filter: {
              range: {
                data_start_time: { gte: 'now-24h', lte: 'now' },
              },
            },
          },
          latest_anomaly_time: { max: { field: 'data_start_time' } },
        },
      },
    },
  },
} as { [key: string]: any };

const featureQuery2 = {
  featureName: 'value2',
  featureEnabled: true,
  aggregationQuery: {
    aggregation_name: {
      max: {
        field: 'value2',
      },
    },
  },
} as { [key: string]: any };

describe('<DetectorConfig /> spec', () => {
  test('renders the component', () => {
    const randomDetector = {
      ...getRandomDetector(false),
      imputationOption: { method: ImputationMethod.PREVIOUS },
      rules: [
        {
          action: Action.IGNORE_ANOMALY,
          conditions: [
            {
              featureName: 'value', // Matches a feature in featureAttributes
              thresholdType: ThresholdType.ACTUAL_OVER_EXPECTED_MARGIN,
              operator: Operator.LTE,
              value: 5,
            },
            {
              featureName: 'value2', // Matches another feature in featureAttributes
              thresholdType: ThresholdType.EXPECTED_OVER_ACTUAL_RATIO,
              operator: Operator.LTE,
              value: 10,
            },
          ],
        },
      ],
    };
    const { container } = renderWithRouter(randomDetector);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders empty features and filters', async () => {
    const randomDetector = {
      ...getRandomDetector(true),
      uiMetadata: {} as UiMetaData,
      featureAttributes: [],
      shingleSize: 8,
    };
    const { getByText, queryByText } = renderWithRouter(randomDetector);
    waitFor(() => {
      getByText('Model parameters are required to run a detector');
      queryByText('Set the index fields');
      getByText('Model configuration');
      getByText(randomDetector.name);
      getByText(randomDetector.indices[0]);
      getByText(toStringConfigCell(randomDetector.detectionInterval));
      getByText(toStringConfigCell(randomDetector.lastUpdateTime));
      getByText(randomDetector.id);
      getByText(toStringConfigCell(randomDetector.windowDelay));
      getByText(randomDetector.description);
      // filter should be -
      getByText('-');
      queryByText('Set the index fields');
    });
  });

  describe('test 1 simple feature enabled/disabled', () => {
    test.each([
      [true, 'Enabled'],
      [false, 'Disabled'],
    ])(
      'renders 1 simple feature enabled/disabled',
      async (enabledInDef, enabledInRender) => {
        const randomDetector = {
          ...getRandomDetector(true),
          featureAttributes: [
            {
              featureName: 'value',
              featureEnabled: enabledInDef,
            },
          ] as FeatureAttributes[],
          uiMetadata: {
            filterType: FILTER_TYPES.SIMPLE,
            filters: [],
            features: {
              value: {
                featureType: FEATURE_TYPE.SIMPLE,
                aggregationOf: 'value',
                aggregationBy: 'avg',
              } as UiFeature,
            },
          } as UiMetaData,
        };
        const { getByText, getAllByText } = renderWithRouter(randomDetector);
        waitFor(() => {
          getByText('Field: value');
          getByText('Aggregation method: avg');
          getAllByText(enabledInRender);
        });
      }
    );
  });

  test('renders one custom feature', async () => {
    const randomDetector = {
      ...getRandomDetector(true),
      featureAttributes: [
        {
          featureName: 'value',
          featureEnabled: true,
          aggregationQuery: featureQuery1,
        },
      ] as FeatureAttributes[],
      uiMetadata: {
        filters: [filters[0]] as UIFilter[],
        features: {
          value: {
            featureType: FEATURE_TYPE.CUSTOM,
          } as UiFeature,
        },
      } as UiMetaData,
    };
    const { getByTestId, getByText, queryByText } =
      renderWithRouter(randomDetector);
    await waitFor(() => {
      getByText('Custom expression:');
      expect(queryByText('detector_1')).toBeNull();
      expect(queryByText('detector_2')).toBeNull();
    });

    fireEvent.click(getByTestId('viewFeature-0'));
    await waitFor(() => {
      queryByText('detector_1');
      queryByText('detector_2');
    });
  });

  describe('renders two custom features', () => {
    test.each([
      [
        'viewFeature-0',
        ['detector_1', 'detector_2'],
        ['max', 'aggregation_name'],
      ],
      [
        'viewFeature-1',
        ['max', 'aggregation_name'],
        ['detector_1', 'detector_2'],
      ],
    ])(
      'renders two custom features',
      async (toClick, notExpected, expected) => {
        const randomDetector = {
          ...getRandomDetector(true),
          featureAttributes: [
            {
              featureName: 'value',
              featureEnabled: true,
              aggregationQuery: featureQuery1,
            },
            {
              featureName: 'value2',
              featureEnabled: true,
              aggregationQuery: featureQuery2,
            },
          ] as FeatureAttributes[],
          uiMetadata: {
            filterType: FILTER_TYPES.SIMPLE,
            filters: [],
            features: {
              value: {
                featureType: FEATURE_TYPE.CUSTOM,
              } as UiFeature,
              value2: {
                featureType: FEATURE_TYPE.CUSTOM,
              } as UiFeature,
            },
          } as UiMetaData,
        };
        const { getByTestId, getAllByText, queryByText } =
          renderWithRouter(randomDetector);
        await waitFor(() => {
          getAllByText('Custom expression:');
          expect(queryByText('detector_1')).toBeNull();
          expect(queryByText('detector_2')).toBeNull();
          expect(queryByText('max')).toBeNull();
          expect(queryByText('aggregation_name')).toBeNull();
        });

        fireEvent.click(getByTestId(toClick));
        await waitFor(() => {
          notExpected.forEach((obj, index) => {
            expect(queryByText(notExpected[index])).toBeNull();
          });
          expected.forEach((obj, index) => {
            queryByText(expected[index]);
          });
        });
      }
    );
  });

  test('renders the component with 2 custom and 1 simple features', () => {
    const features = [
      {
        featureName: 'value',
        featureEnabled: true,
        aggregationQuery: featureQuery1,
      },
      {
        featureName: 'value2',
        featureEnabled: true,
        aggregationQuery: featureQuery2,
      },
      {
        featureName: 'value',
        featureEnabled: false,
      },
    ] as FeatureAttributes[];

    const randomFixedValueMap: Array<{ featureName: string; data: number }> =
      [];

    features.forEach((feature) => {
      if (feature.featureEnabled) {
        randomFixedValueMap.push({ featureName: feature.featureName, data: 3 });
      }
    });

    const imputationOption = {
      method: ImputationMethod.FIXED_VALUES,
      defaultFill: randomFixedValueMap,
    };

    const randomDetector = {
      ...getRandomDetector(true),
      featureAttributes: features,
      uiMetadata: {
        filterType: FILTER_TYPES.SIMPLE,
        filters: [],
        features: {
          value: {
            featureType: FEATURE_TYPE.CUSTOM,
          } as UiFeature,
          value2: {
            featureType: FEATURE_TYPE.CUSTOM,
          } as UiFeature,
          value3: {
            featureType: FEATURE_TYPE.SIMPLE,
            aggregationOf: 'value3',
            aggregationBy: 'avg',
          } as UiFeature,
        },
      } as UiMetaData,
      imputationOption: imputationOption,
      rules: [
        {
          action: Action.IGNORE_ANOMALY,
          conditions: [
            {
              featureName: 'value', // Matches a feature in featureAttributes
              thresholdType: ThresholdType.ACTUAL_OVER_EXPECTED_MARGIN,
              operator: Operator.LTE,
              value: 5,
            },
            {
              featureName: 'value2', // Matches another feature in featureAttributes
              thresholdType: ThresholdType.EXPECTED_OVER_ACTUAL_RATIO,
              operator: Operator.LTE,
              value: 10,
            },
          ],
        },
      ],
    };
    const { container } = renderWithRouter(randomDetector);
    expect(container.firstChild).toMatchSnapshot();
  });
  test('renders rules', () => {
    // Define example features
    const features = [
      {
        featureName: 'value',
        featureEnabled: true,
        aggregationQuery: featureQuery1,
      },
      {
        featureName: 'value2',
        featureEnabled: true,
        aggregationQuery: featureQuery2,
      },
      {
        featureName: 'value',
        featureEnabled: false,
      },
    ] as FeatureAttributes[];

    // Updated example detector
    const testDetector: Detector = {
      primaryTerm: 1,
      seqNo: 1,
      id: 'detector-1',
      name: 'Sample Detector',
      description: 'A sample detector for testing',
      timeField: 'timestamp',
      indices: ['index1'],
      filterQuery: {},
      featureAttributes: features, // Using the provided features
      windowDelay: { period: { interval: 1, unit: UNITS.MINUTES } },
      detectionInterval: { period: { interval: 1, unit: UNITS.MINUTES } },
      shingleSize: 8,
      lastUpdateTime: 1586823218000,
      curState: DETECTOR_STATE.RUNNING,
      stateError: '',
      uiMetadata: getUIMetadata(features),
      rules: [
        {
          action: Action.IGNORE_ANOMALY,
          conditions: [
            {
              featureName: 'value', // Matches a feature in featureAttributes
              thresholdType: ThresholdType.ACTUAL_OVER_EXPECTED_MARGIN,
              operator: Operator.LTE,
              value: 5,
            },
            {
              featureName: 'value2', // Matches another feature in featureAttributes
              thresholdType: ThresholdType.EXPECTED_OVER_ACTUAL_RATIO,
              operator: Operator.LTE,
              value: 10,
            },
          ],
        },
      ],
    };

    const { container } = renderWithRouter(testDetector);
    expect(container.firstChild).toMatchSnapshot();
  });
});
