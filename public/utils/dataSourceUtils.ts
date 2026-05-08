/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSavedObjectsClient } from '../services';

/**
 * Engine type string used by the core data_source plugin to mark an
 * OpenSearch Serverless (AOSS) data source.
 *
 * Source of truth: src/plugins/data_source/common/data_sources/types.ts
 *   DataSourceEngineType.OpenSearchServerless = 'OpenSearch Serverless'
 */
export const OPENSEARCH_SERVERLESS_ENGINE_TYPE = 'OpenSearch Serverless';

/**
 * Returns true iff the data source identified by {@link dataSourceId} is an
 * OpenSearch Serverless (AOSS) collection.
 *
 * Returns false when:
 *   - {@link dataSourceId} is undefined/empty (local cluster — not serverless)
 *   - the saved object lookup fails (e.g., stale id, network error)
 *   - the engine type attribute is missing or set to a non-serverless value
 *
 * Callers should treat this as a runtime capability check: serverless
 * collections do not support several AD features (historical analysis,
 * default result index, flattened-index ingest pipelines) and UI flows
 * must branch on this value.
 */
export const isServerlessDataSource = async (
  dataSourceId?: string
): Promise<boolean> => {
  if (!dataSourceId) return false;
  try {
    const dataSource = await getSavedObjectsClient().get(
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
