/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import chance from 'chance';
import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/react';
import { ModelConfigurationFields } from '../ModelConfigurationFields/ModelConfigurationFields';
import {
  Detector,
  UNITS,
  FILTER_TYPES,
  OPERATORS_MAP,
  ValidationModelResponse,
} from '../../../../models/interfaces';
import { DATA_TYPES } from '../../../../utils/constants';
import { getRandomFeature } from '../../../../redux/reducers/__tests__/utils';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { coreServicesMock } from '../../../../../test/mocks';
import { ImputationMethod } from '../../../../models/types';

const detectorFaker = new chance('seed');
const features = new Array(detectorFaker.natural({ min: 1, max: 5 }))
  .fill(null)
  .map(() => getRandomFeature(false));

const testDetector = {
  id: 'test-id',
  name: 'test-detector',
  indices: ['test-index'],
  detectionInterval: {
    period: {
      interval: 10,
      unit: UNITS.MINUTES,
    },
  },
  description: 'test-description',
  timeField: 'test-timefield',
  windowDelay: {
    period: {
      interval: 1,
      unit: UNITS.MINUTES,
    },
  },
  uiMetadata: {
    filters: [
      {
        filterType: FILTER_TYPES.SIMPLE,
        fieldInfo: [
          {
            label: 'test-filter-field',
            type: DATA_TYPES.TEXT,
          },
        ],
        operator: OPERATORS_MAP.IS,
        fieldValue: 'null',
      },
    ],
  },
  featureAttributes: features,
  imputationOption: { method: ImputationMethod.ZERO}
} as Detector;

describe('ModelConfigurationFields', () => {
  test('renders the component in create mode (no ID)', async () => {
    const onEditModelConfiguration = jest.fn();
    const { container, getByText, getByTestId, queryByText } = render(
      <CoreServicesContext.Provider value={coreServicesMock}>
        <ModelConfigurationFields
          detector={testDetector}
          onEditModelConfiguration={onEditModelConfiguration}
          validationFeatureResponse={{} as ValidationModelResponse}
          validModel={true}
          validationError={false}
          isLoading={false}
          isCreatingDetector={true}
        />
      </CoreServicesContext.Provider>
    );
    expect(container.firstChild).toMatchSnapshot();
    userEvent.click(getByTestId('viewFeature-0'));
    await waitFor(() => {
      queryByText('max');
      queryByText('Zero');
    });
  });
});
