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
import { HistoricalJob } from '../HistoricalJob';

import { Formik } from 'formik';
import { INITIAL_DETECTOR_JOB_VALUES } from '../../../utils/constants';

describe('<HistoricalJob /> spec', () => {
  test('renders the component', () => {
    const { container } = render(
      <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <HistoricalJob
              formikProps={{
                values: { ...INITIAL_DETECTOR_JOB_VALUES, historical: false },
              }}
            />
          </div>
        )}
      </Formik>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
  test('hides date picker if disabled', async () => {
    const { queryByText } = render(
      <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <HistoricalJob
              formikProps={{
                values: { ...INITIAL_DETECTOR_JOB_VALUES, historical: false },
              }}
            />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Run historical analysis detection')).not.toBeNull();
    expect(queryByText('Historical analysis date range')).toBeNull();
  });
  test('shows date picker if enabled', async () => {
    const { queryByText } = render(
      <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <HistoricalJob
              formikProps={{
                values: { ...INITIAL_DETECTOR_JOB_VALUES, historical: true },
              }}
            />
          </div>
        )}
      </Formik>
    );
    expect(queryByText('Run historical analysis detection')).not.toBeNull();
    expect(queryByText('Historical analysis date range')).not.toBeNull();
  });
});
