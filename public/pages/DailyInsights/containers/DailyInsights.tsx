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
import ReactDOM from 'react-dom';
import { RouteComponentProps } from 'react-router-dom';
import queryString from 'querystring';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { AD_NODE_API } from '../../../../utils/constants';
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
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { DAILY_INSIGHTS_ENABLED } from '../../../../utils/constants';
import moment from 'moment';

interface DailyInsightsProps extends RouteComponentProps {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
  landingDataSourceId: string | undefined;
}

interface InsightResult {
  task_id: string;
  window_start: string;
  window_end: string;
  generated_at: string;
  doc_detector_ids: string[];
  doc_indices: string[];
  doc_series_keys: string[];
  paragraphs: Paragraph[];
}

interface Paragraph {
  indices: string[];
  detector_ids: string[];
  entities: string[];
  series_keys: string[];
  start: string;
  end: string;
  text: string;
}

interface InsightsSchedule {
  interval: {
    start_time: number;
    period: number;
    unit: string;
  };
}

export function DailyInsights(props: DailyInsightsProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [insightsEnabled, setInsightsEnabled] = useState(false);
  const [insightsSchedule, setInsightsSchedule] = useState<InsightsSchedule | null>(null);
  const [insightsResults, setInsightsResults] = useState<InsightResult[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<{paragraph: Paragraph, result: InsightResult} | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState<boolean>(false);
  
  const useUpdatedUX = getUISettings().get(USE_NEW_HOME_PAGE);
  const { HeaderControl } = getNavigationUI();
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
      const statusPath = MDSInsightsState.selectedDataSourceId
        ? `${AD_NODE_API.INSIGHTS_STATUS}/${MDSInsightsState.selectedDataSourceId}`
        : AD_NODE_API.INSIGHTS_STATUS;
      
      const statusResponse = await core?.http.get(statusPath);
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
      const resultsPath = MDSInsightsState.selectedDataSourceId
        ? `${AD_NODE_API.INSIGHTS_RESULTS}/${MDSInsightsState.selectedDataSourceId}`
        : AD_NODE_API.INSIGHTS_RESULTS;
      
      const resultsResponse = await core?.http.get(resultsPath);
      
      const allResults = resultsResponse?.response?.results || [];
      
      // use current job schedule, or default to 24 hours
      let filterPeriod = 24;
      let filterUnit: moment.unitOfTime.DurationConstructor = 'hours';
      
      if (insightsSchedule?.interval) {
        filterPeriod = insightsSchedule.interval.period;
        const apiUnit = insightsSchedule.interval.unit.toLowerCase();
        filterUnit = apiUnit as moment.unitOfTime.DurationConstructor;
      }
      
      const cutoffTime = moment().subtract(filterPeriod, filterUnit);
      
      const mappedResults = allResults;

      const filteredResults = mappedResults
        .filter((result: InsightResult) => {
          const generatedAt = moment(result.generated_at);
          
          const isRecentlyGenerated = generatedAt.isAfter(cutoffTime);
          
          return isRecentlyGenerated;
        })
        .sort((a: InsightResult, b: InsightResult) => {
          return moment(b.generated_at).valueOf() - moment(a.generated_at).valueOf();
        });

      const mostRecentInsight = filteredResults.length > 0 ? filteredResults[0] : null;
      
      // get top 3 clusters by detector count
      let processedResults: InsightResult[] = [];
      if (mostRecentInsight) {
        const sortedParagraphs = [...mostRecentInsight.paragraphs]
          .sort((a, b) => b.detector_ids.length - a.detector_ids.length)
          .slice(0, 3);
        
        processedResults = [{
          ...mostRecentInsight,
          paragraphs: sortedParagraphs
        }];
      }
      
      setInsightsResults(processedResults);
    } catch (error: any) {
      core?.notifications.toasts.addDanger({
        title: 'Failed to fetch insights results',
        text: error?.body?.message || error?.message || 'An error occurred.',
      });
    }
  };

  const handleStartInsights = async () => {
    setIsStarting(true);
    try {
      const apiPath = MDSInsightsState.selectedDataSourceId
        ? `${AD_NODE_API.INSIGHTS_START}/${MDSInsightsState.selectedDataSourceId}`
        : AD_NODE_API.INSIGHTS_START;
      
      const frequencyString = '24h';
      
      const response = await core?.http.post(apiPath, {
        body: JSON.stringify({ frequency: frequencyString })
      });
      
      core?.notifications.toasts.addSuccess({
        title: 'Insights job started successfully',
        text: response?.message || 'The insights generation job has been initiated.',
      });

      setIsRefreshing(true);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchInsightsStatus();
      
      setIsRefreshing(false);
    } catch (error: any) {
      setIsRefreshing(false);
      core?.notifications.toasts.addDanger({
        title: 'Failed to start insights job',
        text: error?.body?.message || error?.message || 'An error occurred while starting the insights job.',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopInsights = async () => {
    setIsStarting(true);
    try {
      const apiPath = MDSInsightsState.selectedDataSourceId
        ? `${AD_NODE_API.INSIGHTS_STOP}/${MDSInsightsState.selectedDataSourceId}`
        : AD_NODE_API.INSIGHTS_STOP;
      
      const response = await core?.http.post(apiPath);
      
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
        <EuiSmallButton
          color={insightsEnabled ? 'danger' : 'success'}
          onClick={insightsEnabled ? handleStopInsights : handleStartInsights}
          isLoading={isStarting}
          iconType={insightsEnabled ? 'stop' : 'play'}
        >
          {insightsEnabled ? 'Stop Insights Job' : 'Start Insights Job'}
        </EuiSmallButton>
      );
      (ReactDOM as any).render(button, buttonElement);
      const unmountPicker = mountPoint(pickerElement);

      return () => {
        if (unmountPicker) unmountPicker();
        (ReactDOM as any).unmountComponentAtNode(buttonElement);
      };
    });
  };

  let renderDataSourceComponent = null;
  if (dataSourceEnabled) {
    const DataSourceMenu =
      getDataSourceManagementPlugin()?.ui.getDataSourceMenu<DataSourceSelectableConfig>();
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
            onSelectedDataSources: (dataSources) =>
              handleDataSourceChange(dataSources),
            dataSourceFilter: isDataSourceCompatible,
          }}
        />
      );
    }, [getSavedObjectsClient(), getNotifications(), MDSInsightsState.selectedDataSourceId, insightsEnabled, isStarting]);
  }

  const renderEventModal = () => {
    if (!selectedEvent) return null;

    const { paragraph, result } = selectedEvent;
    
    const descriptionListItems = [
      {
        title: 'Time Range',
        description: `${moment(paragraph.start).format('lll')} → ${moment(paragraph.end).format('lll')}`,
      },
      {
        title: 'Duration',
        description: moment.duration(moment(paragraph.end).diff(moment(paragraph.start))).humanize(),
      },
      {
        title: 'Detectors',
        description: paragraph.detector_ids.join(', '),
      },
      {
        title: 'Indices',
        description: paragraph.indices.join(', '),
      },
      {
        title: 'Number of Entities',
        description: paragraph.entities.length.toString(),
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
            <p>{paragraph.text}</p>
          </EuiText>
          
          <EuiSpacer size="m" />
          
          <EuiDescriptionList
            listItems={descriptionListItems}
            type="column"
            compressed={false}
          />
          
          <EuiSpacer size="m" />
          
          <EuiText>
            <h3>Affected Entities ({paragraph.entities.length})</h3>
          </EuiText>
          <EuiSpacer size="s" />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {paragraph.entities.map((entity, index) => (
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
                title: 'Total Events in Report',
                description: result.paragraphs.length.toString(),
              },
            ]}
            type="column"
          />
          
          <EuiSpacer size="m" />
          
          <EuiText>
            <h3>Series Keys</h3>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" paddingSize="s" isCopyable>
            {JSON.stringify(paragraph.series_keys, null, 2)}
          </EuiCodeBlock>
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

    return (
      <Fragment>
        {insightsResults.map((result) => (
          <Fragment key={result.task_id}>
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
                <EuiBadge color="success">
                  {result.doc_indices.length} Index Pattern{result.doc_indices.length !== 1 ? 's' : ''}
                </EuiBadge>
                <EuiBadge color="warning">
                  {result.doc_series_keys.length} Series
                </EuiBadge>
              </div>

              <EuiPanel hasBorder paddingSize="s" color="subdued">
                <EuiText size="s">
                  <strong>Analysis Window:</strong> {moment(result.window_start).format('lll')} → {moment(result.window_end).format('lll')}
                </EuiText>
              </EuiPanel>
            </div>

            {result.paragraphs && result.paragraphs.length > 0 && (
              <div>
                <EuiTitle size="s">
                  <h3>Top {result.paragraphs.length} Correlated Anomaly Events</h3>
                </EuiTitle>
                <EuiText size="xs" color="subdued">
                  <p>Showing the most significant correlation clusters by detector count</p>
                </EuiText>
                <EuiSpacer size="m" />
                    {result.paragraphs.map((paragraph, pIndex) => (
                      <EuiPanel 
                        key={pIndex} 
                        hasBorder 
                        style={{ marginBottom: '12px', cursor: 'pointer' }}
                        onClick={() => setSelectedEvent({ paragraph, result })}
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.backgroundColor = '#F5F7FA')}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</span>
                          <div style={{ flex: 1 }}>
                            <EuiTitle size="xxs">
                              <h5>Event {pIndex + 1}: {paragraph.entities.length} {paragraph.entities.length === 1 ? 'entity' : 'entities'}</h5>
                            </EuiTitle>
                            <EuiSpacer size="s" />
                            <EuiText size="s">
                              <p>{paragraph.text}</p>
                            </EuiText>
                            {paragraph.entities.length > 0 && (
                              <Fragment>
                                <EuiSpacer size="s" />
                                <EuiText size="xs" color="subdued">
                                  <strong>Affected entities:</strong>
                                </EuiText>
                                <EuiSpacer size="xs" />
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {paragraph.entities.slice(0, 5).map((entity, eIndex) => (
                                    <EuiBadge key={eIndex} color="hollow">{entity}</EuiBadge>
                                  ))}
                                  {paragraph.entities.length > 5 && (
                                    <EuiBadge color="hollow">+{paragraph.entities.length - 5} more</EuiBadge>
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
      icon={<span style={{ fontSize: '64px' }}>🔍</span>}
      title={<h2>Daily Insights Not Configured</h2>}
      body={
        <p>
          Daily Insights analyzes your anomaly detection results to identify patterns and correlations across your detectors.
          Click the "Start Insights Job" button in the top-right corner to begin generating daily summaries.
        </p>
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
          {renderSetupView()}
        </div>
      )}
    </Fragment>
  );
}
