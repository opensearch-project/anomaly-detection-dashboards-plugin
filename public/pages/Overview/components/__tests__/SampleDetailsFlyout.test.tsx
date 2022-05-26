/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { coreServicesMock } from '../../../../../test/mocks';
import { sampleHttpResponses } from '../../utils/constants';
import { SampleDetailsFlyout } from '../SampleDetailsFlyout/SampleDetailsFlyout';

describe('ModelConfigurationFields', () => {
  test('renders the component in create mode (no ID)', async () => {
    const { getByText } = render(
      <CoreServicesContext.Provider value={coreServicesMock}>
        <SampleDetailsFlyout
          title="Monitor HTTP responses"
          sampleData={sampleHttpResponses}
          detector={undefined}
          interval={1}
          onClose={() => jest.fn()}
        />
      </CoreServicesContext.Provider>
    );
    getByText('Monitor HTTP responses');
    getByText('Every 10 minutes');
  });
});
