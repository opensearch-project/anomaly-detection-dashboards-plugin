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
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
