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

import { schema } from '@osd/config-schema';
import { i18n } from '@osd/i18n';
import { UiSettingsParams } from '../../../src/core/server/types';
import { DAILY_INSIGHTS_ENABLED } from '../utils/constants';

/**
 * UI settings for Detection Insights
 */
export function getAnomalyDetectionUiSettings(): Record<string, UiSettingsParams> {
  return {
    [DAILY_INSIGHTS_ENABLED]: {
      name: i18n.translate('anomalyDetection.uiSettings.dailyInsightsEnabled.title', {
        defaultMessage: 'Enable Daily Insights',
      }),
      value: false,
      description: i18n.translate('anomalyDetection.uiSettings.dailyInsightsEnabled.description', {
        defaultMessage:
          'Enable or disable the Daily Insights feature. Daily Insights uses algorithms to analyze and summarize correlated anomalies across your detectors. Note: The backend cluster setting "plugins.anomaly_detection.insights_enabled" must also be enabled.',
      }),
      category: ['Detection Insights'],
      schema: schema.boolean(),
      requiresPageReload: true,
    },
  };
}

