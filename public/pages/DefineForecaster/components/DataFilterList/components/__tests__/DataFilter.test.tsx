/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DATA_TYPES } from '../../../../../../utils/constants';
import { CoreServicesContext } from '../../../../../../components/CoreServices/CoreServices';
import {
  coreServicesMock,
  httpClientMock,
} from '../../../../../../../test/mocks';
import { DataFilter } from '../DataFilter';
import {
  OPERATORS_MAP,
  FILTER_TYPES,
  UIFilter,
} from '../../../../../../models/interfaces';
import { ForecasterDefinitionFormikValues } from '../../../../models/interfaces';
import { FormikProps, Formik } from 'formik';
import { Provider } from 'react-redux';
import { mockedStore } from '../../../../../../redux/utils/testUtils';

const initialState = {
  opensearch: {
    indices: [
      {
        label: 'test-index',
        health: 'green',
      },
    ],
    aliases: [],
    dataTypes: {
      integer: ['cpu', 'memory'],
    },
    requesting: false,
    searchResult: {},
    errorMessage: '',
  },
};

const filters = [
  {
    filterType: FILTER_TYPES.SIMPLE,
    fieldInfo: [
      {
        label: 'cpu',
        type: DATA_TYPES.NUMBER,
      },
    ],
    operator: OPERATORS_MAP.IS_GREATER,
    fieldValue: 0,
  },
] as UIFilter;

const values = {
  name: 'test-ad',
  description: 'desc',
  index: [
    {
      label: 'test-index',
      health: 'green',
    },
  ],
  filters: [
    {
      filterType: FILTER_TYPES.SIMPLE,
      fieldInfo: [
        {
          label: 'cpu',
          type: DATA_TYPES.NUMBER,
        },
      ],
      operator: OPERATORS_MAP.IS_GREATER,
      fieldValue: 0,
    },
  ],
  filterQuery: JSON.stringify({ bool: { filter: [] } }, null, 4),
  timeField: 'timestamp',
  interval: 10,
  windowDelay: 1,
} as ForecasterDefinitionFormikValues;

const formikProps = {
  values: { values },
  errors: {},
  touched: {
    index: true,
    name: true,
    timeField: true,
  },
  isSubmitting: false,
  isValidating: false,
  submitCount: 0,
  initialErrors: {},
  initialTouched: {},
  isValid: true,
  dirty: true,
  validateOnBlur: true,
  validateOnChange: true,
  validateOnMount: true,
} as FormikProps<ForecasterDefinitionFormikValues>;

const renderWithProvider = () => ({
  ...render(
    <Provider store={mockedStore(initialState)}>
      <CoreServicesContext.Provider value={coreServicesMock}>
        <Formik initialValues={values} onSubmit={jest.fn()}>
          <DataFilter
            formikProps={formikProps}
            filter={filters}
            index={0}
            values={values}
            replace={jest.fn()}
            onOpen={() => {}}
            onSave={jest.fn()}
            onCancel={jest.fn()}
            onDelete={jest.fn()}
            openPopoverIndex={0}
            setOpenPopoverIndex={jest.fn(() => 0)}
            isNewFilter={true}
            oldFilterType={undefined}
            oldFilterQuery={undefined}
          />
        </Formik>
      </CoreServicesContext.Provider>
    </Provider>
  ),
});

describe('dataFilter', () => {
  const user = userEvent.setup();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('renders data filter', async () => {
    const { container, getByText, getByTestId, getAllByText } =
      renderWithProvider();
    expect(container).toMatchSnapshot();
    getByText('Create custom label?');
    getByText('Operator');
    expect(getByTestId('switchForCustomLabel')).not.toBeChecked();
    await user.click(getByTestId('switchForCustomLabel'));
    await waitFor(() => {});
    expect(getByTestId('switchForCustomLabel')).toBeChecked();
    await user.click(getByTestId('switchForCustomLabel'));
    await user.click(getByTestId('comboBoxToggleListButton'));
    await waitFor(() => {
      getAllByText('cpu');
    });
    await user.click(getByTestId('cancelFilter0Button'));
  }, 30000);
  test('renders data filter, click on custom', async () => {
    const { container, getByText, getByTestId } = renderWithProvider();
    getByText('Create custom label?');
    getByText('Operator');
    await user.click(getByTestId('filterTypeButton'));
    await waitFor(() => {
      getByText('Use visual editor');
    });
    await user.click(getByTestId('filterTypeButton'));
    await waitFor(() => {
      getByText('Use query DSL');
    });
    await user.click(getByTestId('cancelFilter0Button'));
  }, 30000);
});
