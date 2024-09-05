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
import { DataConnectionFlyout } from '../DataConnectionFlyout';

const renderDataConnectionFlyout = (
  indices: string[],
  localClusterName: string = 'local-cluster',
  onClose = jest.fn()
) => {
  return render(
    <DataConnectionFlyout
      indices={indices}
      localClusterName={localClusterName}
      onClose={onClose}
    />
  );
};

describe('<DataConnectionFlyout /> spec', () => {
  test('renders the flyout with indices and local cluster name', () => {
    const indices = [
      'test-index',
      'cluster-2:test-index-2',
      'cluster-3:http-index',
    ];
    const { container, getByText, getByTestId } =
      renderDataConnectionFlyout(indices);
    expect(container.firstChild).toMatchSnapshot();
    getByTestId('dataSourcesFlyout_header');
    getByText('local-cluster (Local)');
    getByText('test-index');
    getByText('cluster-2 (Remote)');
    getByText('test-index-2');
    getByText('cluster-3 (Remote)');
    getByText('http-index');
  });
  test('renders the flyout with only local indices', () => {
    const indices = ['local-index'];
    const { container, getByText, getByTestId, queryByText } =
      renderDataConnectionFlyout(indices);
    expect(container.firstChild).toMatchSnapshot();
    getByTestId('dataSourcesFlyout_header');
    getByText('local-cluster (Local)');
    getByText('local-index');
    expect(queryByText('Remote')).toBeNull();
  });

  test('handles no indices', () => {
    const indices: string[] = [];
    const { getByText, getByTestId } = renderDataConnectionFlyout(indices);

    getByTestId('dataSourcesFlyout_header');
    getByText('No data sources configured for this detector.');
  });

  test('calls onClose when flyout close button is clicked', () => {
    const onClose = jest.fn();
    const indices = ['test-index'];
    const { getByTestId } = renderDataConnectionFlyout(
      indices,
      'local-cluster',
      onClose
    );

    const closeButton = getByTestId('euiFlyoutCloseButton'); // Adjust the text if needed for close button
    closeButton.click();

    expect(onClose).toHaveBeenCalled();
  });
});
