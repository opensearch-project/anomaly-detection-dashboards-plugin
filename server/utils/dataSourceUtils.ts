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

import { RequestHandlerContext } from '../../../../src/core/server';

/**
 * Engine type string used by the core data_source plugin to mark an
 * OpenSearch Serverless (AOSS) data source.
 *
 * Source of truth: src/plugins/data_source/common/data_sources/types.ts
 *   DataSourceEngineType.OpenSearchServerless = 'OpenSearch Serverless'
 */
export const OPENSEARCH_SERVERLESS_ENGINE_TYPE = 'OpenSearch Serverless';

/**
 * Server-side counterpart to public/utils/dataSourceUtils.ts#isServerlessDataSource.
 *
 * Returns true iff the data source identified by {@link dataSourceId} is an
 * OpenSearch Serverless (AOSS) collection. Returns false when:
 *   - {@link dataSourceId} is undefined/empty (local cluster — not serverless)
 *   - the saved object lookup fails (e.g., stale id, network error)
 *   - the engine type attribute is missing or set to a non-serverless value
 *
 * Callers should treat this as a runtime capability check: on serverless,
 * AD-plugin-level endpoints (e.g., `_plugins/_anomaly_detection/detectors/
 * results/_search`) are not available because the AD backend plugin does
 * not run in the serverless data plane. Handlers must fall back to the
 * standard OpenSearch `_search` against the custom result index.
 */
export const isServerlessDataSource = async (
  context: RequestHandlerContext,
  dataSourceId?: string
): Promise<boolean> => {
  if (!dataSourceId) return false;
  try {
    const dataSource = await context.core.savedObjects.client.get(
      'data-source',
      dataSourceId
    );
    return (
      (dataSource.attributes as any)?.dataSourceEngineType ===
      OPENSEARCH_SERVERLESS_ENGINE_TYPE
    );
  } catch {
    return false;
  }
};
