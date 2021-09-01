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

/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { render, fireEvent, wait } from '@testing-library/react';
import { DetectorConfig } from '../DetectorConfig';
import {
  Detector,
  UiMetaData,
  FILTER_TYPES,
  UIFilter,
  FEATURE_TYPE,
  UiFeature,
  FeatureAttributes,
} from '../../../../models/interfaces';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { coreServicesMock } from '../../../../../test/mocks';
import { toString } from '../MetaData';
import { DATA_TYPES } from '../../../../utils/constants';
import { OPERATORS_MAP } from '../../../../models/interfaces';
import { displayText } from '../../../DefineDetector/components/DataFilterList/utils/helpers';
import { mockedStore, initialState } from '../../../../redux/utils/testUtils';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';

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
    fieldInfo: [{ label: fieldInFilter, type: DATA_TYPES.NUMBER }],
    operator: OPERATORS_MAP.IN_RANGE,
    fieldRangeStart: 20,
    fieldRangeEnd: 40,
  },
  {
    fieldInfo: [{ label: fieldInFilter, type: DATA_TYPES.NUMBER }],
    operator: OPERATORS_MAP.IS_NOT_NULL,
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
  test.skip('renders the component', () => {
    const randomDetector = {
      ...getRandomDetector(false),
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
    await wait(() => {
      getByText('Model parameters are required to run a detector');
      queryByText('Set the index fields');
      getByText('Model configuration');
      getByText(randomDetector.name);
      getByText(randomDetector.indices[0]);
      getByText(toString(randomDetector.detectionInterval));
      getByText(toString(randomDetector.lastUpdateTime));
      getByText(randomDetector.id);
      getByText(toString(randomDetector.windowDelay));
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
        await wait(() => {
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
        filterType: FILTER_TYPES.SIMPLE,
        filters: [],
        features: {
          value: {
            featureType: FEATURE_TYPE.CUSTOM,
          } as UiFeature,
        },
      } as UiMetaData,
    };
    const { getByTestId, getByText, queryByText } = renderWithRouter(
      randomDetector
    );
    await wait(() => {
      getByText('Custom expression:');
      expect(queryByText('detector_1')).toBeNull();
      expect(queryByText('detector_2')).toBeNull();
    });

    fireEvent.click(getByTestId('viewFeature-0'));
    await wait(() => {
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
        const { getByTestId, getAllByText, queryByText } = renderWithRouter(
          randomDetector
        );
        await wait(() => {
          getAllByText('Custom expression:');
          expect(queryByText('detector_1')).toBeNull();
          expect(queryByText('detector_2')).toBeNull();
          expect(queryByText('max')).toBeNull();
          expect(queryByText('aggregation_name')).toBeNull();
        });

        fireEvent.click(getByTestId(toClick));
        await wait(() => {
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

  test.skip('renders the component with 2 custom and 1 simple features', () => {
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
        {
          featureName: 'value',
          featureEnabled: false,
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
          value3: {
            featureType: FEATURE_TYPE.SIMPLE,
            aggregationOf: 'value3',
            aggregationBy: 'avg',
          } as UiFeature,
        },
      } as UiMetaData,
    };
    const { container } = renderWithRouter(randomDetector);
    expect(container.firstChild).toMatchSnapshot();
  });
});
