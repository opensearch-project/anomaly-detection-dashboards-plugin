/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { UiSettingScope } from '../../../../../../src/core/public';
import {
  DataSourceAttributes,
  DataSourceEngineType,
} from '../../../../../../src/plugins/data_source/common/data_sources';
import { DataSourceSelectable } from '../../../../../../src/plugins/data_source_management/public/components/data_source_selectable/data_source_selectable';
import { getDataSourceEnabled } from '../../../services';
import {
  getDataSourceFromURL,
  getInitialDataSourceId,
  isDataSourceCompatible,
  isForecastingDataSourceCompatible,
} from '../helpers';

jest.mock('../../../services', () => ({
  getDataSourceEnabled: jest.fn(),
}));

// These decorative core components use the automatic JSX runtime, whereas the
// plugin's test Babel configuration uses classic JSX. Keep them out of this
// selection regression without replacing the picker or its selection helpers.
jest.mock(
  '../../../../../../src/plugins/data_source_management/public/components/custom_database_icon',
  () => ({
    EmptyIcon: () => null,
    ErrorIcon: () => null,
  })
);
jest.mock(
  '../../../../../../src/plugins/data_source_management/public/components/toast_button',
  () => ({
    getManageDataSourceButton: () => null,
    getReloadButton: () => null,
  })
);

const dataSourceId = 'analytic-engine-source';
const dataSource = {
  id: dataSourceId,
  type: 'data-source',
  references: [],
  attributes: {
    title: 'Analytic engine',
    endpoint: 'https://analytic-engine.example',
    dataSourceEngineType: DataSourceEngineType.AnalyticEngine,
    dataSourceVersion: '3.5.0',
    installedPlugins: ['opensearch-anomaly-detection'],
    auth: { type: 'no_auth', credentials: undefined },
  },
};

// Exercise the shared picker with the plugin's real manifest and compatibility
// predicates: mocking the picker would miss its explicit-empty-ID behavior.
describe.each([
  ['anomaly detection', isDataSourceCompatible],
  ['forecasting', isForecastingDataSourceCompatible],
] as const)('%s data source selection', (_feature, dataSourceFilter) => {
  const renderSelector = (
    search: string,
    hideLocalCluster = true,
    attributes: Partial<DataSourceAttributes> = {}
  ) => {
    (getDataSourceEnabled as jest.Mock).mockReturnValue({
      enabled: true,
      hideLocalCluster,
    });
    const initialDataSourceId = getInitialDataSourceId(
      getDataSourceFromURL({ search }).dataSourceId
    );
    const onSelectedDataSources = jest.fn();
    const notifications = { add: jest.fn(), addWarning: jest.fn() };
    const savedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        savedObjects: [
          {
            ...dataSource,
            attributes: { ...dataSource.attributes, ...attributes },
          },
        ],
      }),
    };
    const uiSettings = {
      getUserProvidedWithScope: jest.fn().mockResolvedValue(dataSourceId),
    };

    render(
      <DataSourceSelectable
        savedObjectsClient={savedObjectsClient as any}
        notifications={notifications as any}
        onSelectedDataSources={onSelectedDataSources}
        hideLocalCluster={hideLocalCluster}
        disabled={false}
        fullWidth={false}
        scope={UiSettingScope.WORKSPACE}
        uiSettings={uiSettings as any}
        selectedOption={
          initialDataSourceId === undefined
            ? undefined
            : [{ id: initialDataSourceId }]
        }
        dataSourceFilter={dataSourceFilter}
      />
    );

    return { onSelectedDataSources, notifications, uiSettings };
  };

  test.each([
    ['missing', ''],
    ['blank', '?dataSourceId='],
    ['explicit', `?dataSourceId=${dataSourceId}`],
  ])(
    'selects the associated AnalyticEngine source for a %s URL ID',
    async (_id, search) => {
      const {
        onSelectedDataSources,
        notifications,
        uiSettings,
      } = renderSelector(search);

      await waitFor(() => {
        expect(onSelectedDataSources).toHaveBeenCalledWith([
          { id: dataSourceId, label: 'Analytic engine' },
        ]);
      });
      expect(uiSettings.getUserProvidedWithScope).toHaveBeenCalledWith(
        'defaultDataSource',
        UiSettingScope.WORKSPACE
      );
      expect(onSelectedDataSources).not.toHaveBeenCalledWith([]);
      expect(notifications.add).not.toHaveBeenCalled();
      expect(notifications.addWarning).not.toHaveBeenCalled();
    }
  );

  test('preserves an explicit local-cluster selection when local is available', async () => {
    const { onSelectedDataSources, notifications } = renderSelector(
      '?dataSourceId=',
      false
    );

    await waitFor(() => {
      expect(onSelectedDataSources).toHaveBeenCalledWith([
        { id: '', label: 'Local cluster' },
      ]);
    });
    expect(notifications.add).not.toHaveBeenCalled();
    expect(notifications.addWarning).not.toHaveBeenCalled();
  });

  test.each([
    ['missing AD plugin', { installedPlugins: [] }],
    ['unsupported version', { dataSourceVersion: '2.8.0' }],
  ])(
    'rejects an AnalyticEngine source with %s',
    async (_reason, attributes) => {
      const { onSelectedDataSources, notifications } = renderSelector(
        '?dataSourceId=',
        true,
        attributes
      );

      await waitFor(() => {
        expect(onSelectedDataSources).toHaveBeenCalledWith([]);
      });
      expect(notifications.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title:
            'No compatible data sources are available. Add a compatible data source.',
        })
      );
    }
  );
});
