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

import { getColumns } from '../../utils/tableUtils';
import { render } from '@testing-library/react';

describe('tableUtils spec', () => {
  describe('should render the column titles', () => {
    test('detector name column', () => {
      const result = getColumns('');
      const { getByText } = render(result[0].name);
      getByText('Detector');
    });
    test('indices column', () => {
      const result = getColumns('');
      const { getByText } = render(result[1].name);
      getByText('Indices');
    });
    test('detector state column', () => {
      const result = getColumns('');
      const { getByText } = render(result[2].name);
      getByText('Real-time state');
    });
    test('historical analysis column', () => {
      const result = getColumns('');
      const { getByText } = render(result[3].name);
      getByText('Historical analysis');
    });
    test('anomalies last 24 hrs column', () => {
      const result = getColumns('');
      const { getByText } = render(result[4].name);
      getByText('Anomalies last 24 hours');
    });
    test('last RT occurrence column', () => {
      const result = getColumns('');
      const { getByText } = render(result[5].name);
      getByText('Last real-time occurrence');
    });
    test('last started time column', () => {
      const result = getColumns('');
      const { getByText } = render(result[6].name);
      getByText('Last started');
    });
  });
});

describe('resource sharing Access column', () => {
  test('appends an Access column with a share-button marker when resource sharing is available', () => {
    const columns = getColumns('cluster-1', true);
    const accessColumn = columns[columns.length - 1];

    const { container: headerContainer } = render(accessColumn.name);
    expect(headerContainer.textContent).toContain('Access');

    const { container } = render(
      accessColumn.render({ id: 'detector-1', name: 'my detector' })
    );
    const marker = container.querySelector('[data-resource-share-button]');
    expect(marker).not.toBeNull();
    expect(marker!.getAttribute('data-resource-id')).toBe('detector-1');
    expect(marker!.getAttribute('data-resource-type')).toBe('anomaly-detector');
    expect(marker!.getAttribute('data-resource-name')).toBe('my detector');
    expect(marker!.getAttribute('data-resource-share-display')).toBe('icon');
    expect(marker!.getAttribute('data-resource-data-source-id')).toBe(
      'cluster-1'
    );
  });

  test('omits the data source id attribute when no dataSourceId is provided', () => {
    const columns = getColumns('', true);
    const accessColumn = columns[columns.length - 1];

    const { container } = render(
      accessColumn.render({ id: 'detector-2', name: 'another detector' })
    );
    const marker = container.querySelector('[data-resource-share-button]');
    expect(marker!.getAttribute('data-resource-data-source-id')).toBeNull();
  });

  test('does not append the Access column when resource sharing is unavailable', () => {
    const withoutAccess = getColumns('cluster-1', false).length;
    const withAccess = getColumns('cluster-1', true).length;
    expect(withAccess).toBe(withoutAccess + 1);
  });
});
