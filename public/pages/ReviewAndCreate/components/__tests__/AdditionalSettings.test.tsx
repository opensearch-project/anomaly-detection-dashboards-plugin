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
import { AdditionalSettings } from '../AdditionalSettings/AdditionalSettings';

import { Formik } from 'formik';

describe('<AdditionalSettings /> spec', () => {
  test('renders the component with high cardinality disabled', () => {
    const { container, getByText, getAllByText } = render(
      <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <AdditionalSettings categoryField={[]} shingleSize={8} />
          </div>
        )}
      </Formik>
    );
    expect(container.firstChild).toMatchSnapshot();
    getAllByText('Category field');
    getAllByText('Window size');
    getByText('-');
    getByText('8');
  });
  test('renders the component with high cardinality enabled', () => {
    const { container, getByText, getAllByText } = render(
      <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <AdditionalSettings
              categoryField={['test_field']}
              shingleSize={8}
            />
          </div>
        )}
      </Formik>
    );
    expect(container.firstChild).toMatchSnapshot();
    getAllByText('Category field');
    getAllByText('Window size');
    getByText('test_field');
    getByText('8');
  });
});
