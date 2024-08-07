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
import { render } from '@testing-library/react';
import { DetectorDefinitionFields } from '../DetectorDefinitionFields/DetectorDefinitionFields';
import {
  Detector,
  UNITS,
  FILTER_TYPES,
  OPERATORS_MAP,
} from '../../../../models/interfaces';
import { Formik } from 'formik';
import { DATA_TYPES } from '../../../../utils/constants';

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
  resultIndex: 'opensearch-ad-plugin-result-test',
  resultIndexMinAge: 7,
  resultIndexMinSize: 51200,
  resultIndexTtl: 60,
  flattenCustomResultIndex: true,
} as Detector;

describe('<AdditionalSettings /> spec', () => {
  test('renders the component in create mode (no ID)', () => {
    const onEditDetectorDefinition = jest.fn();
    const { container, getByText, queryByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <DetectorDefinitionFields
              onEditDetectorDefinition={onEditDetectorDefinition}
              detector={testDetector}
              isCreate={true}
            />
          </div>
        )}
      </Formik>
    );
    expect(container.firstChild).toMatchSnapshot();
    getByText('test-detector');
    getByText('test-index');
    getByText('test-filter-field is null');
    getByText('10 Minutes');
    getByText('test-description');
    getByText('test-timefield');
    getByText('1 Minutes');
    getByText('opensearch-ad-plugin-result-test');
    getByText('Yes')
    getByText('7 Days');
    getByText('51200 MB');
    getByText('60 Days');
    expect(queryByText('test-id')).toBeNull();
  });
  test('renders the component in edit mode (with ID)', () => {
    const onEditDetectorDefinition = jest.fn();
    const { container, getByText, queryByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <DetectorDefinitionFields
              onEditDetectorDefinition={onEditDetectorDefinition}
              detector={testDetector}
              isCreate={false}
            />
          </div>
        )}
      </Formik>
    );
    expect(container.firstChild).toMatchSnapshot();
    getByText('test-detector');
    getByText('test-index');
    getByText('test-filter-field is null');
    getByText('10 Minutes');
    getByText('test-description');
    getByText('test-timefield');
    getByText('1 Minutes');
    expect(queryByText('test-id')).not.toBeNull();
  });
});
