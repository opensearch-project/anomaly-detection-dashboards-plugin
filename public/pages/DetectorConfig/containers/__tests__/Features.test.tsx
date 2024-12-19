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
import {
  render,
  waitFor,
  screen,
  fireEvent,
  within,
} from '@testing-library/react';
import { Formik } from 'formik';
import { Features } from '../Features';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import {
  ImputationMethod,
  Action,
  ThresholdType,
  Operator,
} from '../../../../models/types';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
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
import { featureQuery1, featureQuery2 } from './DetectorConfig.test';

describe('<Features /> spec', () => {
  test('renders the component with suppression rules', async () => {
    // Mock CoreServicesContext
    const coreServicesMock = {
      uiSettings: {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'theme:darkMode') return false; // Mock darkMode
          return null;
        }),
      },
    };

    // Set up the mock props
    const randomDetector = {
      ...getRandomDetector(false),
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
      imputationOption: { method: ImputationMethod.ZERO }
    };

    const { container, getByRole, getByText, queryByRole, getByTestId } =
      render(
        <CoreServicesContext.Provider value={coreServicesMock}>
          <Formik initialValues={{}} onSubmit={jest.fn()}>
            {() => (
              <Features
                detector={randomDetector}
                detectorId="test-detector-id"
                onEditFeatures={jest.fn()}
              />
            )}
          </Formik>
        </CoreServicesContext.Provider>
      );

    expect(container.firstChild).toMatchSnapshot();

    const firstButton = getByTestId('suppression-rules-button-0');
    expect(firstButton).toBeInTheDocument();
    fireEvent.click(firstButton);

    // Wait for the modal to appear and check for its content
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument(); // Ensure modal is opened
    });

    getByText('Suppression Rules'); // Modal header
    getByText(
      'Ignore anomalies for feature "value" with no more than 5 above expected value.'
    );

    //  Close the modal by clicking the close button (X)
    const closeButton = getByRole('button', {
      name: 'Closes this modal window',
    });
    fireEvent.click(closeButton);

    // Ensure the modal is closed
    await waitFor(() => {
      expect(queryByRole('dialog')).toBeNull();
    });

    const secondButton = getByTestId('suppression-rules-button-1');
    expect(secondButton).toBeInTheDocument();
    fireEvent.click(secondButton);

    // Wait for the modal to appear and check for its content
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument(); // Ensure modal is opened
    });

    getByText(
      'Ignore anomalies for feature "value2" with no more than 1000% below expected value.'
    );

    const closeSecondButton = getByRole('button', {
      name: 'Closes this modal window',
    });
    fireEvent.click(closeSecondButton);

    // Ensure the modal is closed
    await waitFor(() => {
      expect(queryByRole('dialog')).toBeNull();
    });
  });
  test('renders the component without suppression rules', async () => {
    // Mock CoreServicesContext
    const coreServicesMock = {
      uiSettings: {
        get: jest.fn().mockImplementation((key) => {
          if (key === 'theme:darkMode') return false; // Mock darkMode
          return null;
        }),
      },
    };

    // Set up the mock props
    const randomDetector = {
      ...getRandomDetector(false),
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
      rules: [],
      imputationOption: { method: ImputationMethod.ZERO }
    };

    const { container, queryByText, getByText, queryByRole, getByTestId } =
      render(
        <CoreServicesContext.Provider value={coreServicesMock}>
          <Formik initialValues={{}} onSubmit={jest.fn()}>
            {() => (
              <Features
                detector={randomDetector}
                detectorId="test-detector-id"
                onEditFeatures={jest.fn()}
              />
            )}
          </Formik>
        </CoreServicesContext.Provider>
      );

    expect(container.firstChild).toMatchSnapshot();
    const tableCell = screen.getByRole('cell', { name: /anomaly criteria/i });
    const anyText = within(tableCell).getByText('any');
    expect(anyText).toBeInTheDocument();
  });
});
