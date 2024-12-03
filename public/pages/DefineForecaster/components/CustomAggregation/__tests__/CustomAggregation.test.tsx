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
import { CustomAggregation, validateQuery } from '../CustomAggregation';
import { Provider } from 'react-redux';
import { mockedStore } from '../../../../../redux/utils/testUtils';
import { Formik } from 'formik';
import { FeaturesFormikValues } from '../../../models/interfaces';
import { INITIAL_FEATURE_VALUES } from '../../../utils/constants';
import { CoreServicesContext } from '../../../../../components/CoreServices/CoreServices';
import { coreServicesMock } from '../../../../../../test/mocks';

const renderWithFormik = (initialValue: FeaturesFormikValues) => ({
  ...render(
    <Provider store={mockedStore()}>
      <CoreServicesContext.Provider value={coreServicesMock}>
        <Formik initialValues={initialValue} onSubmit={jest.fn()}>
          {(formikProps) => (
            <div>
              <CustomAggregation index={1} />
            </div>
          )}
        </Formik>
      </CoreServicesContext.Provider>
    </Provider>
  ),
});

describe('<CustomAggregation /> spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('renders the component', () => {
    const { container } = renderWithFormik(INITIAL_FEATURE_VALUES);
    expect(container.firstChild).toMatchSnapshot();
  });
  describe('validateQuery', () => {
    test('should return undefined if valid query', () => {
      expect(validateQuery('{}')).toBeUndefined();
      expect(validateQuery('{"a":{"b":{}}}')).toBeUndefined();
    });
    test('should return error message if invalid query', () => {
      console.log = jest.fn();
      expect(validateQuery('hello')).toEqual('Invalid JSON');
      expect(validateQuery('{a : b: {}')).toEqual('Invalid JSON');
    });
  });
});
