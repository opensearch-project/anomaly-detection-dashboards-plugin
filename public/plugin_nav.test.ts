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

import { coreMock } from '../../../src/core/public/mocks';
import { DEFAULT_APP_CATEGORIES, DEFAULT_NAV_GROUPS } from '../../../src/core/utils';
import { AnomalyDetectionOpenSearchDashboardsPlugin } from './plugin';

jest.mock('@osd/monaco', () => ({
  monaco: {
    languages: {
      CompletionItemKind: { Function: 1, Field: 4, Module: 6, Operator: 12, Keyword: 14 },
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      registerCompletionItemProvider: jest.fn(),
    },
    editor: { create: jest.fn(), defineTheme: jest.fn() },
    Range: jest.fn(),
  },
}));

// Mock dynamic imports used in mount functions
jest.mock('./anomaly_detection_app', () => ({
  renderApp: jest.fn(() => jest.fn()),
}));
jest.mock('./forecasting_app', () => ({
  renderApp: jest.fn(() => jest.fn()),
}));
jest.mock('./daily_insights_app', () => ({
  renderApp: jest.fn(() => jest.fn()),
}));

describe('AnomalyDetectionPlugin nav registration', () => {
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let plugin: AnomalyDetectionOpenSearchDashboardsPlugin;

  const mockPlugins = {
    embeddable: { registerEmbeddableFactory: jest.fn() },
    notifications: {},
    visAugmenter: {},
    dataSourceManagement: {},
    dataSource: {},
    data: {},
    uiActions: {
      addTriggerAction: jest.fn(),
      registerTrigger: jest.fn(),
    },
    expressions: { registerFunction: jest.fn() },
  } as any;

  beforeEach(() => {
    coreSetup = coreMock.createSetup();
    coreSetup.chrome.navGroup.getNavGroupEnabled.mockReturnValue(true);
    coreSetup.uiSettings.get = jest.fn().mockReturnValue(false);
    plugin = new AnomalyDetectionOpenSearchDashboardsPlugin();
  });

  it('should use core.chrome.getIsIconSideNavEnabled() for flag check', () => {
    (coreSetup.chrome.getIsIconSideNavEnabled as jest.Mock).mockReturnValue(true);

    plugin.setup(coreSetup, mockPlugins);

    // Verify getIsIconSideNavEnabled was called (the chrome API, not uiSettings)
    expect(coreSetup.chrome.getIsIconSideNavEnabled).toHaveBeenCalled();

    const calls = (coreSetup.chrome.navGroup.addNavLinksToGroup as jest.Mock).mock.calls;

    // When icon side nav is enabled, anomaly detection should be registered with
    // observabilityTools category in observability group
    const observabilityCalls = calls.filter(
      (call: any) => call[0] === DEFAULT_NAV_GROUPS.observability
    );
    const iconSideNavCall = observabilityCalls.find((call: any) =>
      call[1].some(
        (link: any) =>
          link.id === 'anomaly-detection-dashboards' &&
          link.category === DEFAULT_APP_CATEGORIES.observabilityTools &&
          link.euiIconType === 'navAnomalyDetection'
      )
    );
    expect(iconSideNavCall).toBeDefined();
  });

  it('should register with detect category when icon side nav is disabled', () => {
    (coreSetup.chrome.getIsIconSideNavEnabled as jest.Mock).mockReturnValue(false);

    plugin.setup(coreSetup, mockPlugins);

    expect(coreSetup.chrome.getIsIconSideNavEnabled).toHaveBeenCalled();

    const calls = (coreSetup.chrome.navGroup.addNavLinksToGroup as jest.Mock).mock.calls;

    const observabilityCalls = calls.filter(
      (call: any) => call[0] === DEFAULT_NAV_GROUPS.observability
    );
    const defaultCall = observabilityCalls.find((call: any) =>
      call[1].some(
        (link: any) =>
          link.id === 'anomaly-detection-dashboards' &&
          link.category === DEFAULT_APP_CATEGORIES.detect
      )
    );
    expect(defaultCall).toBeDefined();
  });
});
