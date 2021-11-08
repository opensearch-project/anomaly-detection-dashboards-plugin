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
import { HistoricalDetectorCallout } from '../HistoricalDetectorCallout/HistoricalDetectorCallout';
import { DETECTOR_STATE } from '../../../../../server/utils/constants';

describe('<HistoricalDetectorCallout /> spec', () => {
  test('renders component when initializing', () => {
    const { getByText } = render(
      <HistoricalDetectorCallout
        detector={{
          taskState: DETECTOR_STATE.INIT,
        }}
        onStopDetector={jest.fn()}
        isStoppingDetector={false}
      />
    );
    getByText(`Initializing the historical analysis.`);
  });
  test('renders component when running and partial progress', () => {
    const { getByText } = render(
      <HistoricalDetectorCallout
        detector={{
          taskState: DETECTOR_STATE.RUNNING,
          taskProgress: 0.5,
        }}
        onStopDetector={jest.fn()}
        isStoppingDetector={false}
      />
    );
    getByText('Running the historical analysis');
    getByText('Stop historical analysis');
    getByText('50%');
  });
  test('shows task failure if failed', () => {
    const { getByText } = render(
      <HistoricalDetectorCallout
        detector={{
          taskState: DETECTOR_STATE.FAILED,
          taskError: 'Some error message',
        }}
        onStopDetector={jest.fn()}
        isStoppingDetector={false}
      />
    );
    getByText('Some error message');
  });
  test('renders component on unexpected failure', () => {
    const { getByText } = render(
      <HistoricalDetectorCallout
        detector={{
          taskState: DETECTOR_STATE.UNEXPECTED_FAILURE,
        }}
        onStopDetector={jest.fn()}
        isStoppingDetector={false}
      />
    );
    getByText(
      `The historical analysis has failed unexpectedly. Try restarting the detector.`
    );
  });
});
