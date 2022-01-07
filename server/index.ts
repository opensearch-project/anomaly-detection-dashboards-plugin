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

import { schema, TypeOf } from '@osd/config-schema';
import {
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '../../../src/core/server';
import { AnomalyDetectionOpenSearchDashboardsPlugin } from './plugin';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

export type AnomalyDetectionOpenSearchDashboardsPluginConfigType = TypeOf<
  typeof configSchema
>;

export const config: PluginConfigDescriptor<AnomalyDetectionOpenSearchDashboardsPluginConfigType> =
  {
    exposeToBrowser: {
      enabled: true,
    },
    schema: configSchema,
  };

export interface AnomalyDetectionOpenSearchDashboardsPluginSetup {}
export interface AnomalyDetectionOpenSearchDashboardsPluginStart {}

export function plugin(initializerContext: PluginInitializerContext) {
  return new AnomalyDetectionOpenSearchDashboardsPlugin(initializerContext);
}
