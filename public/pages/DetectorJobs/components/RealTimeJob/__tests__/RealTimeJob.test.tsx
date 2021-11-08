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
import { RealTimeJob } from '../RealTimeJob';

import { Formik } from 'formik';
import { INITIAL_DETECTOR_JOB_VALUES } from '../../../utils/constants';

describe('<RealTimeJob /> spec', () => {
  test('renders the component', () => {
    const { container, getByText } = render(
      <Formik initialValues={{ detectorName: '' }} onSubmit={jest.fn()}>
        {() => (
          <div>
            <RealTimeJob
              formikProps={{
                values: { ...INITIAL_DETECTOR_JOB_VALUES, realTime: false },
              }}
            />
          </div>
        )}
      </Formik>
    );
    expect(container.firstChild).toMatchSnapshot();
    getByText('Real-time detection');
    getByText('Start real-time detector automatically (recommended)');
  });
});
