/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import chance from 'chance';
import userEvent from '@testing-library/user-event';
import { render, waitFor, fireEvent, screen, within } from '@testing-library/react';
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
import {
  ImputationMethod,
  ThresholdType,
  Action,
  Operator,
  Rule
} from '../../../../models/types';

const detectorFaker = new chance('seed');
const features = new Array(detectorFaker.natural({ min: 1, max: 5 }))
  .fill(null)
  .map(() => getRandomFeature(false));

// Generate rules based on the existing features
const rules = features.map((feature, index) => ({
  action: Action.IGNORE_ANOMALY,
  conditions: [
    {
      featureName: feature.featureName,
      thresholdType: index % 2 === 0 ? ThresholdType.ACTUAL_OVER_EXPECTED_MARGIN : ThresholdType.EXPECTED_OVER_ACTUAL_RATIO, // Alternate threshold types for variety
      operator: Operator.LTE,
      value: index % 2 === 0 ? 5 : 0.1, // Use different values for variety
    },
  ],
})) as Rule[];

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
  imputationOption: { method: ImputationMethod.ZERO},
  rules: rules
} as Detector;

describe('ModelConfigurationFields', () => {
  test('renders the component in create mode (no ID)', async () => {
    const onEditModelConfiguration = jest.fn();
    const { container, getByText, getByTestId, queryByText, getByRole, queryByRole } = render(
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
    getByText('set_to_zero');

    // Check for the suppression rules button link
    const button = getByRole('button', { name: '2 rules' });
    expect(button).toBeInTheDocument();

    userEvent.click(getByTestId('viewFeature-0'));
    await waitFor(() => {
      queryByText('max');
    });
  });
});
