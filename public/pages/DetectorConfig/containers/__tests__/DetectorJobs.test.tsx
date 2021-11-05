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
