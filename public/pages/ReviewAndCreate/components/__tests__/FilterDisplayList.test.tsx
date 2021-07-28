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
import { FilterDisplayList } from '../FilterDisplayList/FilterDisplayList';
import { FILTER_TYPES, OPERATORS_MAP } from '../../../../models/interfaces';
import { Formik } from 'formik';
import { DATA_TYPES } from '../../../../utils/constants';

const simpleFilter = {
  filterType: FILTER_TYPES.SIMPLE,
  fieldInfo: [
    {
      label: 'test-filter-field',
      type: DATA_TYPES.TEXT,
    },
  ],
  operator: OPERATORS_MAP.IS,
  fieldValue: 'null',
};

const customFilter = {
  filterType: FILTER_TYPES.CUSTOM,
  query: `{ "some": { "custom": { "filter": { "query" } } } }`,
};

const labeledSimpleFilter = {
  ...simpleFilter,
  label: 'custom-filter-label',
};
const labeledCustomFilter = {
  ...customFilter,
  label: 'custom-filter-label',
};

describe('<FilterDisplayList /> spec', () => {
  test('renders with no filters', () => {
    const { getByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <FilterDisplayList
              uiMetadata={{
                filters: [],
              }}
              filterQuery={''}
            />
          </div>
        )}
      </Formik>
    );
    getByText('-');
  });
  test('renders with simple filter', () => {
    const { getByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <FilterDisplayList
              uiMetadata={{
                filters: [simpleFilter],
              }}
              filterQuery={''}
            />
          </div>
        )}
      </Formik>
    );
    getByText('test-filter-field is null');
  });
  test('renders with custom filter', () => {
    const { getByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <FilterDisplayList
              uiMetadata={{
                filters: [customFilter],
              }}
              filterQuery={''}
            />
          </div>
        )}
      </Formik>
    );
    getByText('Custom expression:');
    getByText('View code');
  });
  test('renders with labeled simple filter', () => {
    const { getByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <FilterDisplayList
              uiMetadata={{
                filters: [labeledSimpleFilter],
              }}
              filterQuery={''}
            />
          </div>
        )}
      </Formik>
    );
    getByText('custom-filter-label');
  });
  test('renders with labeled custom filter', () => {
    const { getByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <FilterDisplayList
              uiMetadata={{
                filters: [labeledCustomFilter],
              }}
              filterQuery={''}
            />
          </div>
        )}
      </Formik>
    );
    getByText('custom-filter-label:');
    getByText('View code');
  });
});
