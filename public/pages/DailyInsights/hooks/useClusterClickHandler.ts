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

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getDetector } from '../../../redux/reducers/ad';
import { searchResults } from '../../../redux/reducers/anomalyResults';
import { predictModel } from '../../../redux/reducers/ml';
import { InsightCluster, ClusterAnomaly } from '../components/EventDetailModal';

export const buildLLMPrompt = (
  cluster: InsightCluster,
  configs: Record<string, any>,
): Record<string, any> => {
  const detectors = cluster.detector_ids.map((id, i) => {
    const name = cluster.detector_names?.[i] || id;
    const config = configs[id];
    if (config) {
      const features = (config.featureAttributes || [])
        .filter((f: any) => f.featureEnabled)
        .map((f: any) => `${f.featureName} (${Object.keys(f.aggregationQuery?.[Object.keys(f.aggregationQuery)[0]] || {})[0] || 'agg'} on ${Object.values(f.aggregationQuery?.[Object.keys(f.aggregationQuery)[0]] || {})[0]?.['field'] || 'unknown'})`)
        .join(', ');
      const interval = config.detectionInterval?.period
        ? `${config.detectionInterval.period.interval} ${config.detectionInterval.period.unit}`
        : 'unknown';
      const category = config.categoryField?.length
        ? `split by ${config.categoryField.join(', ')}`
        : 'single entity (no split)';
      const desc = config.description ? `\n  Description: ${config.description}` : '';
      return `- ${name}${desc}\n  Index: ${config.indices?.join(', ') || 'unknown'}\n  Interval: ${interval}\n  Category: ${category}\n  Features: ${features || 'none'}`;
    }
    return `- ${name}`;
  }).join('\n');

  const entities = cluster.entities?.length
    ? `Affected entities: ${cluster.entities.map((e) => {
        const sep = e.includes('=') ? e.indexOf('=') : e.indexOf(':');
        return sep > -1 ? e.substring(sep + 1).trim() : e;
      }).join(', ')}`
    : 'No specific entities affected.';

  const userMessage = `Event details:
- Time: ${cluster.event_start} to ${cluster.event_end}
- ${cluster.anomalies?.length || 0} anomalies detected
- Indices: ${cluster.indices?.join(', ')}
- ${entities}

Detectors that fired:
${detectors}`;

  return {
    system_prompt: 'You are an observability expert. Summarize this anomaly event in 1-2 sentences for an operations engineer. Be specific about what happened and what might be impacted. Do not use technical jargon about anomaly detection itself. Provide only the summary, no preamble.',
    messages: JSON.stringify([
      { role: 'user', content: [{ text: userMessage, type: 'text' }] }
    ]),
  };
};

export function useClusterClickHandler(dataSourceId: string) {
  const dispatch = useDispatch();

  const [detectorConfigs, setDetectorConfigs] = useState<Record<string, any>>({});
  const [detectorTimeFields, setDetectorTimeFields] = useState<Record<string, string>>({});
  const [detectorResultIndices, setDetectorResultIndices] = useState<Record<string, string>>({});
  const [detectorFeatures, setDetectorFeatures] = useState<Record<string, string[]>>({});
  const [detectorDescriptions, setDetectorDescriptions] = useState<Record<string, string>>({});
  const [anomalyEntities, setAnomalyEntities] = useState<Record<string, string[]>>({});
  const [llmSummaries, setLlmSummaries] = useState<Record<string, string>>({});
  const [llmLoadingKeys, setLlmLoadingKeys] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<{ cluster: InsightCluster; result: any } | null>(null);

  const llmInFlightRef = useRef(new Set<string>());

  // Clear all caches when data source changes (MDS switching)
  useEffect(() => {
    setDetectorConfigs({});
    setDetectorTimeFields({});
    setDetectorResultIndices({});
    setDetectorFeatures({});
    setDetectorDescriptions({});
    setAnomalyEntities({});
    setLlmSummaries({});
    setSelectedEvent(null);
    llmInFlightRef.current.clear();
  }, [dataSourceId]);


  const handleClusterClick = useCallback(async (cluster: InsightCluster, result: any) => {
    const dsId = dataSourceId || '';

    // Step 1: Fetch detector configs (cached)
    const idsToFetch = cluster.detector_ids.filter((id) => !detectorConfigs[id]);
    let newResultIndices: Record<string, string> = {};
    let newConfigs: Record<string, any> = {};
    if (idsToFetch.length > 0) {
      const results = await Promise.all(
        idsToFetch.map(async (id) => {
          try {
            const resp: any = await dispatch(getDetector(id, dsId));
            return { id, config: resp?.response };
          } catch (err) {
            console.warn('Failed to fetch detector config:', id, err);
            return { id, config: null };
          }
        })
      );
      const newTimeFields: Record<string, string> = {};
      const newFeatures: Record<string, string[]> = {};
      const newDescriptions: Record<string, string> = {};
      results.forEach(({ id, config }) => {
        if (!config) return;
        newConfigs[id] = config;
        if (config.timeField) newTimeFields[id] = config.timeField;
        if (config.resultIndex) newResultIndices[id] = config.resultIndex;
        if (config.description) newDescriptions[id] = config.description;
        const feats = (config.featureAttributes || [])
          .filter((f: any) => f.featureEnabled)
          .map((f: any) => f.featureName);
        if (feats.length > 0) newFeatures[id] = feats;
      });
      if (Object.keys(newConfigs).length > 0) setDetectorConfigs((prev) => ({ ...prev, ...newConfigs }));
      if (Object.keys(newTimeFields).length > 0) setDetectorTimeFields((prev) => ({ ...prev, ...newTimeFields }));
      if (Object.keys(newResultIndices).length > 0) setDetectorResultIndices((prev) => ({ ...prev, ...newResultIndices }));
      if (Object.keys(newFeatures).length > 0) setDetectorFeatures((prev) => ({ ...prev, ...newFeatures }));
      if (Object.keys(newDescriptions).length > 0) setDetectorDescriptions((prev) => ({ ...prev, ...newDescriptions }));
    }

    // Open modal immediately — Steps 2 & 3 run in background
    setSelectedEvent({ cluster, result });

    // Step 2: Fetch entity mapping (fire and forget)
    const modelIdsToFetch = (cluster.anomalies || [])
      .map((a: ClusterAnomaly) => a.model_id)
      .filter((mid: string) => mid && !anomalyEntities[mid]);
    if (modelIdsToFetch.length > 0) {
      const allResultIndices = { ...detectorResultIndices, ...newResultIndices };
      const resultIndex = [...new Set(
        cluster.detector_ids.map((id) => allResultIndices[id]).filter(Boolean)
      )][0] || '';
      dispatch(searchResults(
        { size: modelIdsToFetch.length, query: { terms: { model_id: modelIdsToFetch } }, _source: ['model_id', 'entity'], collapse: { field: 'model_id' } },
        resultIndex, dsId, !!resultIndex
      )).then((resp: any) => {
        if (resp?.response?.hits?.hits) {
          const newEntities: Record<string, string[]> = {};
          resp.response.hits.hits.forEach((hit: any) => {
            const src = hit._source || {};
            if (src.model_id && Array.isArray(src.entity) && src.entity.length > 0) {
              newEntities[src.model_id] = src.entity.map((e: any) => `${e.name}=${e.value}`);
            }
          });
          if (Object.keys(newEntities).length > 0) {
            setAnomalyEntities((prev) => ({ ...prev, ...newEntities }));
          }
        }
      }).catch((err: any) => { console.warn('Entity fetch failed:', err); });
    }

    // Step 3: Fetch LLM summary (fire and forget)
    const cacheKey = `${cluster.event_start}_${cluster.detector_ids.join(',')}`;
    if (!llmSummaries[cacheKey] && !llmInFlightRef.current.has(cacheKey)) {
      // LLM summary disabled by default. Set to a deployed model ID to enable.
      // See LLM_MODEL_CONFIG_OPTIONS.md for configuration options.
      const modelId = '';
      /* istanbul ignore next: disabled until a model ID is configured */
      if (modelId) {
        llmInFlightRef.current.add(cacheKey);
        setLlmLoadingKeys((prev) => new Set(prev).add(cacheKey));
        const allConfigs = { ...detectorConfigs, ...newConfigs };
        const prompt = buildLLMPrompt(cluster, allConfigs);
        dispatch(predictModel(modelId, { parameters: prompt }, dsId))
          .then((resp: any) => {
            const summary = resp?.response?.inference_results?.[0]?.output?.[0]?.dataAsMap?.response
              || resp?.response?.inference_results?.[0]?.output?.[0]?.dataAsMap?.output?.message?.content?.[0]?.text
              || resp?.response?.inference_results?.[0]?.output?.[0]?.result
              || '';
            if (summary) setLlmSummaries((prev) => ({ ...prev, [cacheKey]: summary }));
          })
          .catch((err: any) => { console.warn('LLM predict failed:', err); })
          .finally(() => {
            llmInFlightRef.current.delete(cacheKey);
            setLlmLoadingKeys((prev) => { const next = new Set(prev); next.delete(cacheKey); return next; });
          });
      }
    }
  }, [dataSourceId, detectorConfigs, detectorResultIndices, anomalyEntities, llmSummaries, dispatch]);

  return {
    selectedEvent,
    setSelectedEvent,
    detectorFeatures,
    detectorDescriptions,
    detectorTimeFields,
    anomalyEntities,
    llmSummaries,
    llmLoadingKeys,
    handleClusterClick,
  };
}
