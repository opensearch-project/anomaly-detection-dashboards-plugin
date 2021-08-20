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

import React, { Fragment } from 'react';
import { render, fireEvent, getByRole } from '@testing-library/react';
import { Form, Formik } from 'formik';
import { CategoryField } from '../CategoryField';

describe('<CategoryField /> spec', () => {
  test('renders the component when disabled', () => {
    const { container, queryByText, queryByTestId } = render(
      <Fragment>
        <Formik
          initialValues={{
            categoryField: [],
          }}
          onSubmit={() => {}}
        >
          <Fragment>
            <Form>
              <CategoryField
                isEdit={false}
                isHCDetector={false}
                categoryFieldOptions={['option 1', 'option 2']}
                setIsHCDetector={(isHCDetector: boolean) => {
                  return;
                }}
                isLoading={false}
                originalShingleSize={1}
                formikProps={{
                  values: {
                    categoryFieldEnabled: false,
                  },
                }}
              />
            </Form>
          </Fragment>
        </Formik>
      </Fragment>
    );
    expect(container).toMatchSnapshot();
    expect(queryByTestId('noCategoryFieldsCallout')).toBeNull();
    expect(queryByTestId('categoryFieldComboBox')).toBeNull();
    expect(queryByText('Enable categorical fields')).not.toBeNull();
  });
  test('renders the component when enabled', () => {
    const {
      container,
      queryByText,
      queryByTestId,
      getByTestId,
      getByText,
    } = render(
      <Fragment>
        <Formik
          initialValues={{
            categoryField: [],
          }}
          onSubmit={() => {}}
        >
          <Fragment>
            <Form>
              <CategoryField
                isEdit={false}
                isHCDetector={true}
                categoryFieldOptions={['a', 'b']}
                setIsHCDetector={(isHCDetector: boolean) => {
                  return;
                }}
                isLoading={false}
                originalShingleSize={1}
                formikProps={{
                  values: {
                    categoryFieldEnabled: true,
                  },
                }}
              />
            </Form>
          </Fragment>
        </Formik>
      </Fragment>
    );
    expect(container).toMatchSnapshot();
    expect(queryByTestId('noCategoryFieldsCallout')).toBeNull();
    expect(queryByTestId('categoryFieldComboBox')).not.toBeNull();
    expect(queryByText('Enable categorical fields')).not.toBeNull();
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    getByText('a');
    getByText('b');
  });
  test('shows callout when there are no available category fields', () => {
    const { container, queryByText, queryByTestId } = render(
      <Fragment>
        <Formik
          initialValues={{
            categoryField: [],
          }}
          onSubmit={() => {}}
        >
          <Fragment>
            <Form>
              <CategoryField
                isEdit={false}
                isHCDetector={true}
                categoryFieldOptions={[]}
                setIsHCDetector={(isHCDetector: boolean) => {
                  return;
                }}
                isLoading={false}
                originalShingleSize={1}
                formikProps={{
                  values: {
                    categoryFieldEnabled: true,
                  },
                }}
              />
            </Form>
          </Fragment>
        </Formik>
      </Fragment>
    );
    expect(container).toMatchSnapshot();
    expect(queryByTestId('noCategoryFieldsCallout')).not.toBeNull();
    expect(queryByTestId('categoryFieldComboBox')).toBeNull();
    expect(queryByText('Enable categorical fields')).not.toBeNull();
  });
  test('hides callout if component is loading', () => {
    const { container, queryByText, queryByTestId } = render(
      <Fragment>
        <Formik
          initialValues={{
            categoryField: [],
          }}
          onSubmit={() => {}}
        >
          <Fragment>
            <Form>
              <CategoryField
                isEdit={false}
                isHCDetector={true}
                categoryFieldOptions={[]}
                setIsHCDetector={(isHCDetector: boolean) => {
                  return;
                }}
                isLoading={true}
                originalShingleSize={1}
                formikProps={{
                  values: {
                    categoryFieldEnabled: true,
                  },
                }}
              />
            </Form>
          </Fragment>
        </Formik>
      </Fragment>
    );
    expect(container).toMatchSnapshot();
    expect(queryByTestId('noCategoryFieldsCallout')).toBeNull();
    expect(queryByText('Enable categorical fields')).not.toBeNull();
  });
  test(`limits selection to a maximum of 2 entities`, () => {
    const { getAllByRole, getByTestId, queryByText } = render(
      <Fragment>
        <Formik
          initialValues={{
            categoryField: [],
          }}
          onSubmit={() => {}}
        >
          <Fragment>
            <Form>
              <CategoryField
                isEdit={false}
                isHCDetector={true}
                categoryFieldOptions={['a', 'b', 'c']}
                setIsHCDetector={(isHCDetector: boolean) => {
                  return;
                }}
                isLoading={false}
                originalShingleSize={1}
                formikProps={{
                  values: {
                    categoryFieldEnabled: true,
                  },
                }}
              />
            </Form>
          </Fragment>
        </Formik>
      </Fragment>
    );
    // open combo box
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    expect(queryByText('a')).not.toBeNull();
    expect(queryByText('b')).not.toBeNull();
    expect(queryByText('c')).not.toBeNull();

    // select top 3 options (a,b,c)
    fireEvent.click(getAllByRole('option')[0]);
    fireEvent.click(getAllByRole('option')[0]);
    fireEvent.click(getAllByRole('option')[0]);

    // close combo box
    fireEvent.click(getByTestId('comboBoxToggleListButton'));

    // the last selection (c) is still not selected
    expect(queryByText('a')).not.toBeNull();
    expect(queryByText('b')).not.toBeNull();
    expect(queryByText('c')).toBeNull();
  });
});
