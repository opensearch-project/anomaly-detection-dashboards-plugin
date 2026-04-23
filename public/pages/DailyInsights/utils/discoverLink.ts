/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds a Discover deep-link URL for a given anomaly.
 * Follows the same pattern as AnomalyResultsTable.handleOpenDiscover
 * but extracted as a reusable utility.
 */

import { first } from 'rxjs/operators';
import { CoreStart } from '../../../../../../src/core/public';
import { setStateToOsdUrl } from '../../../../../../src/plugins/opensearch_dashboards_utils/public';
import { opensearchFilters, IIndexPattern } from '../../../../../../src/plugins/data/public';
import { getSavedObjectsClient, getDataSourceEnabled, getNotifications } from '../../../services';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

// Fallback when caller doesn't provide a time field.
// Works for OTel data; indices using @timestamp need the caller to pass timeField.
const DEFAULT_TIME_FIELD = 'time';

interface DiscoverLinkParams {
  indices: string[];
  startTime: number | string;
  endTime: number | string;
  entities?: string[];
  timeField?: string;
  dataSourceId?: string;
}

/**
 * Build a Discover URL for an anomaly, with time range ±30 min and entity filters.
 * Returns the full URL string, or null on failure.
 */
export async function buildDiscoverUrl(
  core: CoreStart,
  params: DiscoverLinkParams
): Promise<string | null> {
  try {
    const { indices, entities, dataSourceId, timeField } = params;
    const resolvedTimeField = timeField || DEFAULT_TIME_FIELD;
    const startMs = typeof params.startTime === 'string' ? new Date(params.startTime).getTime() : params.startTime;
    const endMs = typeof params.endTime === 'string' ? new Date(params.endTime).getTime() : params.endTime;
    const startISO = new Date(startMs - THIRTY_MINUTES_MS).toISOString();
    const endISO = new Date(endMs + THIRTY_MINUTES_MS).toISOString();

    const basePath = `${window.location.origin}${window.location.pathname.split('/app/')[0]}`;
    const savedObjectsClient = getSavedObjectsClient();
    const indexPatternTitle = indices.join(',');
    const isMDS = getDataSourceEnabled().enabled && !!dataSourceId;

    // Find or create index pattern
    const indexPatternId = await findOrCreateIndexPattern(
      core, savedObjectsClient, indexPatternTitle, resolvedTimeField, dataSourceId
    );
    if (!indexPatternId) return null;

    // Build entity filters
    const filters = buildEntityFilters(entities || [], indexPatternId, indexPatternTitle);

    // Build URL states
    const globalState = {
      filters: [],
      refreshInterval: { pause: true, value: 0 },
      time: { from: startISO, to: endISO },
    };

    const appState = {
      discover: { columns: ['_source'], isDirty: false, sort: [] },
      metadata: isMDS ? { view: 'discover' } : { indexPattern: indexPatternId, view: 'discover' },
      filters,
    };

    const queryState: any = {
      filters,
      query: {
        language: 'kuery',
        query: '',
      },
    };

    // Add dataset info to query state
    if (isMDS) {
      const dsObj = await savedObjectsClient.get('data-source', dataSourceId!);
      const dsAttrs = dsObj.attributes as any;
      queryState.query.dataset = {
        dataSource: {
          id: dataSourceId,
          title: dsAttrs?.title,
          type: dsAttrs?.dataSourceEngineType,
        },
        id: indexPatternId,
        isRemoteDataset: false,
        timeFieldName: resolvedTimeField,
        title: indexPatternTitle,
        type: 'INDEX_PATTERN',
      };
    } else {
      queryState.query.dataset = {
        id: indexPatternId,
        timeFieldName: resolvedTimeField,
        title: indexPatternTitle,
        type: 'INDEX_PATTERN',
      };
    }

    let url = `${basePath}/app/data-explorer/discover#/`;
    url = setStateToOsdUrl('_a', appState, { useHash: false }, url);
    url = setStateToOsdUrl('_g', globalState, { useHash: false }, url);
    url = setStateToOsdUrl('_q', queryState, { useHash: false }, url);

    return url;
  } catch (error: any) {
    getNotifications().toasts.addDanger('Error building Discover link');
    return null;
  }
}

async function findOrCreateIndexPattern(
  core: CoreStart,
  savedObjectsClient: any,
  title: string,
  timeFieldName: string,
  dataSourceId?: string
): Promise<string | null> {
  const isMDS = getDataSourceEnabled().enabled && !!dataSourceId;

  if (isMDS) {
    const currentWorkspace = await core.workspaces.currentWorkspace$.pipe(first()).toPromise();
    const workspaceId = currentWorkspace?.id;

    const findOpts: any = { type: 'index-pattern', fields: ['title', 'timeFieldName'], perPage: 10000 };
    if (workspaceId) findOpts.workspaces = [workspaceId];

    const resp = await savedObjectsClient.find(findOpts);
    const match = resp.savedObjects.find((obj: any) => {
      const titleMatch = obj.attributes.title === title;
      const timeMatch = obj.attributes.timeFieldName === timeFieldName;
      const dsRef = obj.references?.find((r: any) => r.type === 'data-source' && r.name === 'dataSource');
      return titleMatch && timeMatch && dsRef?.id === dataSourceId;
    });

    if (match) return match.id;

    // Create new
    const createOpts: any = {
      references: [{ id: dataSourceId!, type: 'data-source', name: 'dataSource' }],
    };
    if (workspaceId) createOpts.workspaces = [workspaceId];

    const created = await savedObjectsClient.create(
      'index-pattern',
      { title, timeFieldName },
      createOpts
    );
    return created.id;
  } else {
    const resp = await savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title', 'timeFieldName'],
      search: `"${title}"`,
      searchFields: ['title'],
    });

    const match = resp.savedObjects.find(
      (obj: any) => obj.attributes.title === title && obj.attributes.timeFieldName === timeFieldName
    );
    if (match) return match.id;

    const created = await savedObjectsClient.create('index-pattern', {
      title,
      timeFieldName,
    });
    return created.id;
  }
}

function buildEntityFilters(
  entities: string[],
  indexPatternId: string,
  indexPatternTitle: string
): any[] {
  // Group entity values by field name (e.g., serviceName.keyword → [checkout, fraud-detection])
  const fieldValues: Record<string, string[]> = {};
  for (const entity of entities) {
    const sepIdx = entity.includes(':') ? entity.indexOf(':') : entity.indexOf('=');
    if (sepIdx === -1) continue;
    const field = entity.substring(0, sepIdx).trim();
    const value = entity.substring(sepIdx + 1).trim();
    if (!field || !value) continue;
    if (!fieldValues[field]) fieldValues[field] = [];
    fieldValues[field].push(value);
  }

  const mockIndexPattern = {
    id: indexPatternId,
    title: indexPatternTitle,
    fields: [],
    getFieldByName: () => undefined,
    getComputedFields: () => [],
    getScriptedFields: () => [],
    getSourceFilter: () => undefined,
    getTimeField: () => undefined,
    isTimeBased: () => false,
  } as unknown as IIndexPattern;

  return Object.entries(fieldValues).map(([field, values]) => {
    const mockField = { name: field, type: 'string' };
    if (values.length === 1) {
      return opensearchFilters.buildPhraseFilter(mockField, values[0], mockIndexPattern);
    }
    return opensearchFilters.buildPhrasesFilter(mockField, values, mockIndexPattern);
  });
}
