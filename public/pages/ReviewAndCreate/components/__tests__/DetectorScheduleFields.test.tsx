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
    const { container, getByText } = render(
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
    expect(container.firstChild).toMatchSnapshot();
    getByText('Start automatically');
    getByText('Enabled');
  });
  test('renders the component with real-time and historical not selected', () => {
    const values = {
      ...INITIAL_DETECTOR_JOB_VALUES,
      realTime: false,
      historical: false,
    } as DetectorJobsFormikValues;
    const { container, getByText } = render(
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
    expect(container.firstChild).toMatchSnapshot();
    getByText('Start manually');
    getByText('Disabled');
  });
});