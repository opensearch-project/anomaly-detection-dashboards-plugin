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

import {
  EuiSpacer,
  EuiText,
  EuiSmallButton,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiBadge,
  EuiTitle,
  EuiPanel,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiCodeBlock,
} from '@elastic/eui';
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { createRoot, Root } from 'react-dom/client';
import { RouteComponentProps } from 'react-router-dom';
import queryString from 'querystring';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { executeAutoCreateAgent } from '../../../redux/reducers/ml';
import {
  getInsightsResults as getInsightsResultsAction,
  getInsightsStatus as getInsightsStatusAction,
  startInsightsJob as startInsightsJobAction,
  stopInsightsJob as stopInsightsJobAction,
} from '../../../redux/reducers/insights';
import { getErrorMessage } from '../../../utils/utils';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { MDSStates } from '../../../models/interfaces';
import { 
  getDataSourceFromURL,
  isDataSourceCompatible,
} from '../../utils/helpers';
import { BREADCRUMBS, MDS_BREADCRUMBS, USE_NEW_HOME_PAGE } from '../../../utils/constants';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { DataSourceSelectableConfig } from '../../../../../../src/plugins/data_source_management/public';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
  getNavigationUI,
  getApplication,
  getUISettings,
} from '../../../services';
import { DAILY_INSIGHTS_ENABLED } from '../../../../utils/constants';
import moment from 'moment';
import { EnhancedSelectionModal } from '../components/EnhancedSelectionModal';

interface DailyInsightsProps extends RouteComponentProps {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
  landingDataSourceId: string | undefined;
}

interface InsightResult {
  window_start: string;
  window_end: string;
  generated_at: string;
  doc_detector_names: string[];
  doc_detector_ids: string[];
  doc_indices: string[];
  doc_model_ids: string[];
  clusters: InsightCluster[];
}

interface InsightCluster {
  indices: string[];
  detector_ids: string[];
  detector_names: string[];
  entities: string[];
  model_ids: string[];
  num_anomalies?: number;
  event_start: string;
  event_end: string;
  cluster_text: string;
  anomalies?: ClusterAnomaly[];
}

interface ClusterAnomaly {
  model_id: string;
  detector_id: string;
  data_start_time: string;
  data_end_time: string;
}

interface InsightsSchedule {
  interval: {
    start_time: number;
    period: number;
    unit: string;
  };
}

const normalizeStringArray = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
};

const getClusterAnomalyCount = (cluster: any): number => {
  const fromNum = cluster?.num_anomalies;
  if (typeof fromNum === 'number' && Number.isFinite(fromNum)) {
    return fromNum;
  }
  const anomalies = cluster?.anomalies;
  return Array.isArray(anomalies) ? anomalies.length : 0;
};

const getClusterDetectorIdCount = (cluster: any): number => {
  return normalizeStringArray(cluster?.detector_ids).length;
};

// Returns top N clusters sorted by:
// 1) num_anomalies (desc; falls back to anomalies.length)
// 2) detector_ids count (desc; after normalization)
const selectTopClusters = (clusters: any[], topN = 3): any[] => {
  if (!Array.isArray(clusters) || topN <= 0) {
    return [];
  }

  type Entry = {
    cluster: any;
    anomalyCount: number;
    detectorIdCount: number;
  };

  const shouldComeBefore = (a: Entry, b: Entry): boolean => {
    if (a.anomalyCount !== b.anomalyCount) {
      return a.anomalyCount > b.anomalyCount;
    }
    return a.detectorIdCount > b.detectorIdCount;
  };

  // Maintain a small sorted array of size <= topN. O(topN) per cluster.
  const top: Entry[] = [];
  for (const cluster of clusters) {
    const entry: Entry = {
      cluster,
      anomalyCount: getClusterAnomalyCount(cluster),
      detectorIdCount: getClusterDetectorIdCount(cluster),
    };

    let insertAt = top.length;
    for (let i = 0; i < top.length; i++) {
      if (shouldComeBefore(entry, top[i])) {
        insertAt = i;
        break;
      }
    }
    top.splice(insertAt, 0, entry);
    if (top.length > topN) {
      top.pop();
    }
  }

  return top.map((e) => e.cluster);
};

export function DailyInsights(props: DailyInsightsProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [insightsEnabled, setInsightsEnabled] = useState(false);
  const [insightsSchedule, setInsightsSchedule] = useState<InsightsSchedule | null>(null);
  const [insightsResults, setInsightsResults] = useState<InsightResult[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<{cluster: InsightCluster, result: InsightResult} | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);
  
  // Index selection for setup flow
  const [selectedIndicesForSetup, setSelectedIndicesForSetup] = useState<string[]>([]);

  const [isIndexSelectionModalVisible, setIsIndexSelectionModalVisible] = useState(false);
  
  const useUpdatedUX = getUISettings().get(USE_NEW_HOME_PAGE);
  const { HeaderControl } = getNavigationUI() as any;
  const { setAppDescriptionControls } = getApplication();
  
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  const queryParams = getDataSourceFromURL(props.location);
  
  const [MDSInsightsState, setMDSInsightsState] = useState<MDSStates>({
    queryParams,
    selectedDataSourceId: dataSourceEnabled
      ? (queryParams.dataSourceId || undefined)
      : undefined,
  });

  // Check if the feature is enabled via UI settings
  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        const isEnabled = core.uiSettings.get(DAILY_INSIGHTS_ENABLED, false);
        setFeatureEnabled(isEnabled);
        if (!isEnabled) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking Daily Insights feature flag:', error);
        setFeatureEnabled(false);
      }
    };
    checkFeatureFlag();
  }, [core]);

  const handleDataSourceChange = (dataSources: any[]) => {
    const dataSourceId = dataSources[0]?.id;
    if (dataSourceEnabled && dataSourceId === undefined) {
      getNotifications().toasts.addDanger(
        prettifyErrorMessage('Unable to set data source.')
      );
    } else {
      setMDSInsightsState({
        queryParams: { dataSourceId: dataSourceId ?? '' },
        selectedDataSourceId: dataSourceId,
      });
    }
  };

  // Update URL params when data source changes
  useEffect(() => {
    const { history, location } = props;
    if (dataSourceEnabled) {
      const updatedParams = {
        dataSourceId: MDSInsightsState.selectedDataSourceId,
      };
      history.replace({
        ...location,
        search: queryString.stringify(updatedParams),
      });
    }
  }, [MDSInsightsState]);

  // Set breadcrumbs
  useEffect(() => {
    if (dataSourceEnabled) {
      core.chrome.setBreadcrumbs([
        MDS_BREADCRUMBS.ANOMALY_DETECTOR(MDSInsightsState.selectedDataSourceId),
        { text: 'Daily Insights' },
      ]);
    } else {
      core.chrome.setBreadcrumbs([
        BREADCRUMBS.ANOMALY_DETECTOR,
        { text: 'Daily Insights' },
      ]);
    }
  }, [MDSInsightsState]);

  // Fetch status and results
  useEffect(() => {
    fetchInsightsStatus();
  }, [MDSInsightsState]);

  const fetchInsightsStatus = async () => {
    setIsLoading(true);
    try {
      const statusResponse = await dispatch(
        getInsightsStatusAction(MDSInsightsState.selectedDataSourceId || '')
      );
      const enabled = statusResponse?.response?.enabled || false;
      const schedule = statusResponse?.response?.schedule || null;
      
      setInsightsEnabled(enabled);
      setInsightsSchedule(schedule);
    } catch (error: any) {
      console.error('Error fetching insights status:', error);
      setInsightsEnabled(false);
      setInsightsSchedule(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (insightsEnabled) {
      fetchInsightsResults();
    }
  }, [insightsEnabled, insightsSchedule, MDSInsightsState.selectedDataSourceId]);

  const fetchInsightsResults = async () => {
    try {
      const resultsResponse = await dispatch(
        getInsightsResultsAction(MDSInsightsState.selectedDataSourceId || '')
      );
      
      const allResults = Array.isArray(resultsResponse?.response?.results)
        ? resultsResponse.response.results
        : [];
      
      // use current job schedule, or default to 24 hours
      let filterPeriod = 24;
      let filterUnit: moment.unitOfTime.DurationConstructor = 'hours';
      
      if (insightsSchedule?.interval) {
        filterPeriod = insightsSchedule.interval.period;
        const apiUnit = insightsSchedule.interval.unit.toLowerCase();
        filterUnit = apiUnit as moment.unitOfTime.DurationConstructor;
      }
      
      const cutoffTime = moment().subtract(filterPeriod, filterUnit);
      const cutoffTs = cutoffTime.valueOf();
      
      // We only render the latest insight and its top 3 clusters, so avoid normalizing/sorting everything.
      let mostRecentRaw: any = null;
      let mostRecentTs = -Infinity;
      for (const result of allResults) {
        const ts = moment((result as any)?.generated_at).valueOf();
        if (!Number.isFinite(ts) || ts <= cutoffTs) {
          continue;
        }
        if (ts > mostRecentTs) {
          mostRecentTs = ts;
          mostRecentRaw = result;
        }
      }

      if (!mostRecentRaw) {
        setInsightsResults([]);
        return;
      }

      const rawClusters = Array.isArray((mostRecentRaw as any)?.clusters)
        ? (mostRecentRaw as any).clusters
        : [];
      const top3RawClusters = selectTopClusters(rawClusters, 3);
      const normalizedTopClusters = top3RawClusters.map((cluster: any) => ({
        ...cluster,
        indices: normalizeStringArray(cluster?.indices),
        detector_ids: normalizeStringArray(cluster?.detector_ids),
        detector_names: normalizeStringArray(cluster?.detector_names),
        entities: normalizeStringArray(cluster?.entities),
        model_ids: normalizeStringArray(cluster?.model_ids),
        anomalies: Array.isArray(cluster?.anomalies) ? cluster.anomalies : [],
      }));

      const normalizedMostRecent: InsightResult = {
        ...(mostRecentRaw as any),
        doc_detector_names: normalizeStringArray((mostRecentRaw as any).doc_detector_names),
        doc_detector_ids: normalizeStringArray((mostRecentRaw as any).doc_detector_ids),
        doc_indices: normalizeStringArray((mostRecentRaw as any).doc_indices),
        doc_model_ids: normalizeStringArray((mostRecentRaw as any).doc_model_ids),
        clusters: normalizedTopClusters,
      };

      setInsightsResults([normalizedMostRecent]);
    } catch (error: any) {
      core?.notifications.toasts.addDanger({
        title: 'Failed to fetch insights results',
        text: error?.body?.message || error?.message || 'An error occurred.',
      });
    }
  };

  const handleStartInsights = async (agentId?: string) => {
    if (selectedIndicesForSetup.length === 0) {
      setIsIndexSelectionModalVisible(true);
      return;
    }

    setIsStarting(true);
    
    if (agentId) {
      // Step 1: Execute ML agent - following ReviewAndCreate pattern exactly
      dispatch(
        executeAutoCreateAgent(selectedIndicesForSetup, agentId, MDSInsightsState.selectedDataSourceId || '')
      ).then((resp: any) => {
          // Check if response indicates success
          if (!resp || resp.error || !resp.response) {     
            core?.notifications.toasts.addDanger(
              'Failed to execute ML agent - API endpoint not available'
            );
            setIsStarting(false);
            return;
          }
          // Step 2: Start insights job after delay
          setTimeout(async () => {
            try {
              await dispatch(
                startInsightsJobAction(
                  '24h',
                  MDSInsightsState.selectedDataSourceId || ''
                )
              );
              
              core?.notifications.toasts.addSuccess({
                title: 'Insights job started successfully',
                text: `Auto-created detectors for ${selectedIndicesForSetup.length} indices.`,
              });
              
              await fetchInsightsStatus();
            } catch (error: any) {              
              core?.notifications.toasts.addDanger(
                prettifyErrorMessage(
                  getErrorMessage(error, 'There was a problem starting the insights job')
                )
              );
            } finally {
              setIsStarting(false);
            }
          }, 3000);
        })
        .catch((err: any) => {          
          core?.notifications.toasts.addDanger(
            prettifyErrorMessage(
              getErrorMessage(err, 'There was a problem executing the ML agent')
            )
          );
          setIsStarting(false);
        });
    }
  };

  const handleStopInsights = async () => {
    setIsStarting(true);
    try {
      const response = await dispatch(
        stopInsightsJobAction(MDSInsightsState.selectedDataSourceId || '')
      );
      core?.notifications.toasts.addSuccess({
        title: 'Insights job stopped successfully',
        text: response?.message || 'The insights job has been stopped.',
      });

      setIsRefreshing(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchInsightsStatus();
      
      setIsRefreshing(false);
    } catch (error: any) {
      setIsRefreshing(false);
      core?.notifications.toasts.addDanger({
        title: 'Failed to stop insights job',
        text: error?.body?.message || error?.message || 'An error occurred while stopping the insights job.',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const customSetMenuMountPoint = (mountPoint: any) => {
    props.setActionMenu((element: HTMLElement) => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.gap = '12px';
      element.appendChild(container);

      const pickerElement = document.createElement('div');
      container.appendChild(pickerElement);
      const buttonElement = document.createElement('div');
      container.appendChild(buttonElement);

      const button = (
        insightsEnabled ? (
          <EuiSmallButton
            color="danger"
            onClick={handleStopInsights}
            isLoading={isStarting}
            iconType="stop"
          >
            Stop Insights Job
          </EuiSmallButton>
        ) : null
      );
      let buttonRoot: Root | null = null;
      if (button) {
        buttonRoot = createRoot(buttonElement);
        buttonRoot.render(button);
      }
      const unmountPicker = mountPoint(pickerElement);

      return () => {
        if (unmountPicker) unmountPicker();
        buttonRoot?.unmount();
      };
    });
  };

  let renderDataSourceComponent = null;
  if (dataSourceEnabled) {
    const DataSourceMenu =
      getDataSourceManagementPlugin()?.ui.getDataSourceMenu<DataSourceSelectableConfig>() as any;
    renderDataSourceComponent = useMemo(() => {
  return (
        <DataSourceMenu
          setMenuMountPoint={customSetMenuMountPoint}
          componentType={'DataSourceSelectable'}
          componentConfig={{
            fullWidth: false,
            activeOption: props.landingDataSourceId === undefined
              || MDSInsightsState.selectedDataSourceId === undefined
                ? undefined
                : [{ id: MDSInsightsState.selectedDataSourceId }],
            savedObjects: getSavedObjectsClient(),
            notifications: getNotifications(),
            onSelectedDataSources: (dataSources: any[]) =>
              handleDataSourceChange(dataSources),
            dataSourceFilter: isDataSourceCompatible,
          }}
        />
      );
    }, [getSavedObjectsClient(), getNotifications(), MDSInsightsState.selectedDataSourceId, insightsEnabled, isStarting]);
  }

  const renderEventModal = () => {
    if (!selectedEvent) return null;

    const { cluster, result } = selectedEvent;
    const detectorNames = cluster.detector_names && cluster.detector_names.length > 0
      ? cluster.detector_names
      : cluster.detector_ids;
    const formattedAnomalies = (cluster.anomalies || []).map((anomaly) => ({
      detector_id: anomaly.detector_id,
      data_start_time: moment(anomaly.data_start_time).format('lll'),
      data_end_time: moment(anomaly.data_end_time).format('lll'),
    }));
    
    const descriptionListItems = [
      {
        title: 'Time Range',
        description: `${moment(cluster.event_start).format('lll')} → ${moment(cluster.event_end).format('lll')}`,
      },
      {
        title: 'Duration',
        description: moment.duration(moment(cluster.event_end).diff(moment(cluster.event_start))).humanize(),
      },
      {
        title: 'Detectors',
        description: detectorNames.join(', '),
      },
      {
        title: 'Indices',
        description: cluster.indices.join(', '),
      },
      {
        title: 'Number of Entities',
        description: cluster.entities.length.toString(),
      },
    ];

    return (
      <EuiModal onClose={() => setSelectedEvent(null)} style={{ minWidth: '600px' }}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h2>Event Details</h2>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>
            <h3>Summary</h3>
            <p>{cluster.cluster_text}</p>
          </EuiText>
          
          <EuiSpacer size="m" />
          
          <EuiDescriptionList
            listItems={descriptionListItems}
            type="column"
            compressed={false}
          />
          
          <EuiSpacer size="m" />
          
          <EuiText>
            <h3>Affected Entities ({cluster.entities.length})</h3>
          </EuiText>
          <EuiSpacer size="s" />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {cluster.entities.map((entity, index) => (
              <EuiBadge key={index} color="hollow">{entity}</EuiBadge>
            ))}
          </div>
          
          <EuiSpacer size="m" />
          
          <EuiText>
            <h3>Insight Context</h3>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            listItems={[
              {
                title: 'Generated At',
                description: moment(result.generated_at).format('LLLL'),
              },
              {
                title: 'Analysis Window',
                description: `${moment(result.window_start).format('lll')} to ${moment(result.window_end).format('lll')}`,
              },
              {
                title: 'Total Clusters in Report',
                description: result.clusters.length.toString(),
              },
            ]}
            type="column"
          />
          
          {formattedAnomalies.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiText>
                <h3>Anomalies ({formattedAnomalies.length})</h3>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                {JSON.stringify(formattedAnomalies, null, 2)}
              </EuiCodeBlock>
            </>
          )}
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={() => setSelectedEvent(null)}>Close</EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  };

  const renderInsightsView = () => {
    if (insightsResults.length === 0) {
      return (
        <Fragment>
          <EuiPanel hasBorder>
            <EuiText textAlign="center">
              <h3>No insights available</h3>
              <p>
                No insights have been generated in the recent time window. Check back later or run the insights job manually.
              </p>
            </EuiText>
          </EuiPanel>
        </Fragment>
      );
    }

    const getUniqueEntities = (clusters: InsightCluster[]) => {
      const entitySet = new Set<string>();
      clusters.forEach((cluster) => {
        cluster.entities?.forEach((entity) => entitySet.add(entity));
      });
      return entitySet;
    };

    return (
      <Fragment>
        {insightsResults.map((result) => (
          <Fragment key={`${result.generated_at}-${result.window_start}-${result.window_end}`}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <EuiTitle size="m">
                  <h2>Latest Insights</h2>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  Generated {moment(result.generated_at).fromNow()}
                </EuiText>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <EuiBadge color="primary">
                  {result.doc_detector_ids.length} Detector{result.doc_detector_ids.length !== 1 ? 's' : ''}
                </EuiBadge>
                <EuiBadge color="warning">
                  {getUniqueEntities(result.clusters).size} Entities
                </EuiBadge>
              </div>

              <EuiPanel hasBorder paddingSize="s" color="subdued">
                <EuiText size="s">
                  <strong>Analysis Window:</strong> {moment(result.window_start).format('lll')} → {moment(result.window_end).format('lll')}
                </EuiText>
              </EuiPanel>
            </div>

            {result.clusters && result.clusters.length > 0 && (
              <div>
                <EuiTitle size="s">
                  <h3>Top {result.clusters.length} Correlated Anomaly Clusters</h3>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  <p>Showing the most significant correlation clusters by anomaly count</p>
                </EuiText>
                <EuiSpacer size="m" />
                    {result.clusters.map((cluster, pIndex) => (
                      <EuiPanel 
                        key={pIndex} 
                        hasBorder 
                        style={{ marginBottom: '12px', cursor: 'pointer' }}
                        onClick={() => setSelectedEvent({ cluster, result })}
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.backgroundColor = '#F5F7FA')}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</span>
                          <div style={{ flex: 1 }}>
                            <EuiTitle size="xxs">
                              <h5>Cluster {pIndex + 1}: {cluster.entities.length} {cluster.entities.length === 1 ? 'entity' : 'entities'}</h5>
                            </EuiTitle>
                            <EuiSpacer size="s" />
                            <EuiText size="s">
                              <p>{cluster.cluster_text}</p>
                            </EuiText>
                            {cluster.entities.length > 0 && (
                              <Fragment>
                                <EuiSpacer size="s" />
                                <EuiText size="xs" color="subdued">
                                  <strong>Affected entities:</strong>
                                </EuiText>
                                <EuiSpacer size="xs" />
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {cluster.entities.slice(0, 5).map((entity, eIndex) => (
                                    <EuiBadge key={eIndex} color="hollow">{entity}</EuiBadge>
                                  ))}
                                  {cluster.entities.length > 5 && (
                                    <EuiBadge color="hollow">+{cluster.entities.length - 5} more</EuiBadge>
                                  )}
                                </div>
                              </Fragment>
                            )}
                            <EuiSpacer size="s" />
                            <EuiText size="xs" color="subdued" style={{ fontStyle: 'italic' }}>
                              Click for details →
                            </EuiText>
                          </div>
                        </div>
                      </EuiPanel>
                    ))}
              </div>
            )}
          </Fragment>
        ))}
      </Fragment>
    );
  };

  const renderSetupView = () => (
    <EuiEmptyPrompt
      data-test-subj="dailyInsightsSetupPrompt"
      icon={<span style={{ fontSize: '64px' }}>🔍</span>}
      title={<h2>Daily Insights Not Configured</h2>}
      body={
        <p data-test-subj="setupDescription">
          Daily Insights analyzes your anomaly detection results to identify patterns and correlations across your detectors.
          Select indices to monitor and we'll automatically create optimized detectors and start generating daily insights.
        </p>
      }
      actions={
        <EuiSmallButton
          color="primary"
          fill
          iconType="plus"
          onClick={() => {
            setIsIndexSelectionModalVisible(true);
          }}
          data-test-subj="selectIndicesToMonitorButton"
        >
          Select Indices to Monitor
        </EuiSmallButton>
      }
    />
  );

  // Render feature disabled message if the UI setting is disabled
  if (!featureEnabled) {
    return (
      <Fragment>
        {dataSourceEnabled && renderDataSourceComponent}
        <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
          <EuiEmptyPrompt
            title={<h2>Daily Insights Feature Disabled</h2>}
            body={
              <Fragment>
                <p>
                  The Daily Insights feature is currently disabled. Please contact your administrator to enable it.
                </p>
                <EuiSpacer size="m" />
                <EuiText size="s" color="subdued">
                  <p>
                    Administrators can enable this feature in <strong>Management → Advanced Settings</strong> by setting <code>anomalyDetection:dailyInsightsEnabled</code> to <code>true</code>.
                  </p>
                  <p>
                    Additionally, the backend cluster setting <code>plugins.anomaly_detection.insights_enabled</code> must also be enabled.
                  </p>
                </EuiText>
              </Fragment>
            }
          />
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      {dataSourceEnabled && renderDataSourceComponent}
      
      {selectedEvent && renderEventModal()}
      
      {isLoading || isRefreshing ? (
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
        />
      ) : insightsEnabled ? (
        <Fragment>
          {useUpdatedUX && (
            <HeaderControl
              setMountPoint={setAppDescriptionControls}
              controls={[
                {
                  description: 'Automated insights showing correlated anomalies across your detectors',
                },
              ]}
            />
          )}
          {!useUpdatedUX && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="s">
                Automated insights showing correlated anomalies across your detectors
              </EuiText>
            </>
          )}
          <EuiSpacer size="xl" />
          <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
            {renderInsightsView()}
          </div>
        </Fragment>
      ) : (
        <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
          <EuiSpacer size="l" />
          <EuiPanel hasBorder paddingSize="l" data-test-subj="dailyInsightsSetupPanel">
            {renderSetupView()}
            
          </EuiPanel>
        </div>
      )}

      {/* Index Selection Modal */}
      <EnhancedSelectionModal
        isVisible={isIndexSelectionModalVisible}
        selectedIndices={selectedIndicesForSetup}
        onSelectionChange={(indices) => {
          setSelectedIndicesForSetup(indices);
        }}
        onCancel={() => {
          setIsIndexSelectionModalVisible(false);
        }}
        onConfirm={() => {}}
        onStartInsights={async (indices, agentId) => {
          setSelectedIndicesForSetup(indices);
          try {
            await handleStartInsights(agentId);
            setIsIndexSelectionModalVisible(false);
          } catch (error: any) {
          }
        }}
        isLoading={isStarting}
      />
    </Fragment>
  );
}
