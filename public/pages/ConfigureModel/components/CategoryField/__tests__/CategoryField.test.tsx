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

import React, { Fragment } from 'react';
import { render, fireEvent } from '@testing-library/react';
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
    const { container, queryByText, queryByTestId, getByTestId, getByText } =
      render(
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
    const { queryByText, queryByTestId } = render(
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
    expect(queryByTestId('noCategoryFieldsCallout')).not.toBeNull();
    expect(queryByTestId('categoryFieldComboBox')).toBeNull();
    expect(queryByText('Enable categorical fields')).not.toBeNull();
  });
  test('hides callout if component is loading', () => {
    const { queryByText, queryByTestId } = render(
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
  test(`fields are readonly if editing`, () => {
    const { getByTestId, queryByText } = render(
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
                isEdit={true}
                isHCDetector={true}
                categoryFieldOptions={['a', 'b', 'c']}
                setIsHCDetector={(isHCDetector: boolean) => {
                  return;
                }}
                isLoading={false}
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
    // try to open combo box. options should not show since the box is readonly
    fireEvent.click(getByTestId('comboBoxToggleListButton'));
    expect(queryByText('a')).toBeNull();
    expect(queryByText('b')).toBeNull();
    expect(queryByText('c')).toBeNull();
  });
  test('shows warning callout if creating & category field enabled', () => {
    const { queryByTestId } = render(
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
    expect(queryByTestId('cannotEditCategoryFieldCallout')).not.toBeNull();
  });
  test('hides warning callout if creating & category field disabled', () => {
    const { queryByTestId } = render(
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
    expect(queryByTestId('cannotEditCategoryFieldCallout')).toBeNull();
  });
  test('shows info callout and hides warning callout if editing', () => {
    const { queryByTestId } = render(
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
                isEdit={true}
                isHCDetector={true}
                categoryFieldOptions={[]}
                setIsHCDetector={(isHCDetector: boolean) => {
                  return;
                }}
                isLoading={false}
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
    expect(queryByTestId('categoryFieldReadOnlyCallout')).not.toBeNull();
    expect(queryByTestId('cannotEditCategoryFieldCallout')).toBeNull();
  });
});
