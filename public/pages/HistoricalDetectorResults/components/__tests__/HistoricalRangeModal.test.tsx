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
import { HistoricalRangeModal } from '../HistoricalRangeModal/HistoricalRangeModal';

describe('<HistoricalRangeModal /> spec', () => {
  test('renders component when creating first historical analysis', () => {
    const { getByText } = render(
      <HistoricalRangeModal
        detector={{}}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isEdit={false}
      />
    );

    getByText('Set up historical analysis');
  });
  test('renders component when editing historical analysis', () => {
    const { getByText } = render(
      <HistoricalRangeModal
        detector={{}}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isEdit={true}
      />
    );
    getByText('Modify historical analysis');
  });
  test('defaults to 30 days when no existing date range', () => {
    const { getByText } = render(
      <HistoricalRangeModal
        detector={{}}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isEdit={false}
      />
    );
    getByText('last 30 days');
  });
  test('defaults to detector date range if it exists', () => {
    const { queryByText } = render(
      <HistoricalRangeModal
        detector={{
          detectionDateRange: {
            startTime: 500,
            endTime: 5000,
          },
        }}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        isEdit={false}
      />
    );
    expect(queryByText('last 30 days')).toBeNull();
  });
});
