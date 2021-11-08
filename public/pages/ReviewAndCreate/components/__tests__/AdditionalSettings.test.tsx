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
    getAllByText('Shingle size');
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
    getAllByText('Shingle size');
    getByText('test_field');
    getByText('8');
  });
});
