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
import { DetectorScheduleFields } from '../DetectorScheduleFields/DetectorScheduleFields';
import { Formik } from 'formik';
import { INITIAL_DETECTOR_JOB_VALUES } from '../../../DetectorJobs/utils/constants';
import { DetectorJobsFormikValues } from '../../../DetectorJobs/models/interfaces';

describe('<DetectorScheduleFields /> spec', () => {
  test('renders the component with real-time and historical selected', () => {
    const values = {
      ...INITIAL_DETECTOR_JOB_VALUES,
      realTime: true,
      historical: true,
    } as DetectorJobsFormikValues;
    const { getByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <DetectorScheduleFields
              values={values}
              onEditDetectorSchedule={jest.fn()}
            />
          </div>
        )}
      </Formik>
    );
    getByText('Start automatically');
    getByText('Enabled');
  });
  test('renders the component with real-time and historical not selected', () => {
    const values = {
      ...INITIAL_DETECTOR_JOB_VALUES,
      realTime: false,
      historical: false,
    } as DetectorJobsFormikValues;
    const { getByText } = render(
      <Formik initialValues={{}} onSubmit={jest.fn()}>
        {() => (
          <div>
            <DetectorScheduleFields
              values={values}
              onEditDetectorSchedule={jest.fn()}
            />
          </div>
        )}
      </Formik>
    );
    getByText('Start manually');
    getByText('Disabled');
  });
});
