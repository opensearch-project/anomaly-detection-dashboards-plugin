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
import { DetectorJobs } from '../DetectorJobs';
import { DETECTOR_STATE } from '../../../../../server/utils/constants';

describe('<DetectorJobs /> spec', () => {
  test('renders with real-time non-HC detector', () => {
    const { getByText } = render(
      <DetectorJobs
        detector={{
          categoryField: [],
          curState: DETECTOR_STATE.INIT,
        }}
      />
    );
    getByText('Real-time detector');
    getByText(DETECTOR_STATE.INIT);
  });
  test('renders with real-time HC detector', () => {
    const { getByText } = render(
      <DetectorJobs
        detector={{
          categoryField: ['test-field'],
          curState: DETECTOR_STATE.INIT,
        }}
      />
    );
    getByText('Real-time detector');
    getByText(DETECTOR_STATE.INIT);
  });
  test('renders with disabled historical analysis', () => {
    const { getByText } = render(
      <DetectorJobs
        detector={{
          categoryField: [],
          curState: DETECTOR_STATE.INIT,
        }}
      />
    );
    getByText('Historical analysis detector');
    getByText('Disabled');
  });
  test('renders with historical non-HC detector', () => {
    const { getByText, queryByText } = render(
      <DetectorJobs
        detector={{
          categoryField: [],
          curState: DETECTOR_STATE.INIT,
          taskState: DETECTOR_STATE.FINISHED,
          detectionDateRange: {
            startTime: 500,
            endTime: 5000,
          },
        }}
      />
    );
    getByText('Historical analysis detector');
    expect(queryByText('Disabled')).toBeNull();
  });
  test('renders with historical HC detector', () => {
    const { getByText, queryByText } = render(
      <DetectorJobs
        detector={{
          categoryField: ['test-field'],
          curState: DETECTOR_STATE.INIT,
          taskState: DETECTOR_STATE.FINISHED,
          detectionDateRange: {
            startTime: 500,
            endTime: 5000,
          },
        }}
      />
    );
    getByText('Historical analysis detector');
    expect(queryByText('Disabled')).toBeNull();
  });
});
