/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { findAllByTestId, render, waitFor } from '@testing-library/react';
import { EmptyAssociatedDetectorMessage } from '../index';
import { getRandomDetector } from '../../../../../../public/redux/reducers/__tests__/utils';
import { DetectorListItem } from '../../../../../../public/models/interfaces';
import userEvent from '@testing-library/user-event';

describe('ConfirmUnlinkDetectorModal spec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the component with filter applied', () => {
    const { container, getByText } = render(
      <EmptyAssociatedDetectorMessage
        isFilterApplied={true}
        embeddableTitle="test-title"
      />
    );
    getByText('There are no detectors matching your search');
    expect(container).toMatchSnapshot();
  });
  test('renders the component with filter applied', () => {
    const { container, getByText } = render(
      <EmptyAssociatedDetectorMessage
        isFilterApplied={false}
        embeddableTitle="test-title"
      />
    );
    getByText(
      'There are no anomaly detectors associated with test-title visualization.'
    );
    expect(container).toMatchSnapshot();
  });
});
