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
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSmallButton,
  EuiSpacer,
  EuiText,
  EuiHealth,
  EuiBadge,
  EuiEmptyPrompt,
  EuiPanel,
  EuiTitle,
  EuiLink,
  EuiToolTip,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { EnhancedSelectionModal } from './EnhancedSelectionModal';
import { getDataSourceFromURL, getAllDetectorsQueryParamsWithDataSourceId, isDataSourceCompatible } from '../../utils/helpers';
import { getDetectorList } from '../../../redux/reducers/ad';
import { executeAutoCreateAgent } from '../../../redux/reducers/ml';
import { AppState } from '../../../redux/reducers';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { getDataSourceEnabled, getApplication, getNotifications, getDataSourceManagementPlugin, getSavedObjectsClient } from '../../../services';
import { DataSourceSelectableConfig } from '../../../../../../src/plugins/data_source_management/public';
import { BREADCRUMBS, MDS_BREADCRUMBS, DAILY_INSIGHTS_OVERVIEW_PAGE_NAV_ID, PLUGIN_NAME } from '../../../utils/constants';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'querystring';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { DetectorListItem, MDSStates } from '../../../models/interfaces';
import { AD_NODE_API } from '../../../../utils/constants';


interface IndexInsightData {
  indexName: string;
  detectors: DetectorListItem[];
  overallStatus: string;
}

interface IndicesManagementProps extends RouteComponentProps {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

export function IndicesManagement(props: IndicesManagementProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const location = useLocation();
  const queryParams = getDataSourceFromURL(location);
  
  const dataSourceId = queryParams.dataSourceId || undefined;
  const dataSourceEnabled = !!getDataSourceEnabled().enabled;
  
  const adState = useSelector((state: AppState) => state.ad);
  const [indicesData, setIndicesData] = useState<IndexInsightData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingInsights, setIsStartingInsights] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [insightsEnabled, setInsightsEnabled] = useState(false);
  const [MDSInsightsState, setMDSInsightsState] = useState<MDSStates>({
    queryParams,
    selectedDataSourceId: dataSourceEnabled
      ? (dataSourceId || undefined)
      : undefined,
  });

  const history = useHistory();

  // Create datasource selector
  let renderDataSourceComponent = null;
  if (dataSourceEnabled) {
    const DataSourceMenu =
      getDataSourceManagementPlugin()?.ui.getDataSourceMenu<DataSourceSelectableConfig>();
    renderDataSourceComponent = useMemo(() => {
      return (
        <DataSourceMenu
          setMenuMountPoint={props.setActionMenu}
          componentType={'DataSourceSelectable'}
          componentConfig={{
            fullWidth: false,
            activeOption: MDSInsightsState.selectedDataSourceId === undefined
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
    }, [getSavedObjectsClient(), getNotifications(), MDSInsightsState.selectedDataSourceId, insightsEnabled]);
  }

  const handleDataSourceChange = (dataSources: any[]) => {
    const selectedDataSourceId = dataSources[0]?.id;
    if (dataSourceEnabled && selectedDataSourceId === undefined) {
      getNotifications().toasts.addDanger(
        prettifyErrorMessage('Unable to set data source.')
      );
    } else {
      setMDSInsightsState({
        queryParams: { dataSourceId: selectedDataSourceId ?? undefined },
        selectedDataSourceId: selectedDataSourceId,
      });
    }
  };

  // Update URL params when data source changes
  useEffect(() => {
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
    core.chrome.docTitle.change('Daily Insights');
  }, [MDSInsightsState]);

  // Fetch status and results
  useEffect(() => {
    fetchInsightsStatus();
  }, [MDSInsightsState]);

  useEffect(() => {
    // Initial load
    loadDetectors();
    
    // Set up 30-second refresh for async detector creation
    const interval = setInterval(loadDetectors, 30000);
    
    return () => clearInterval(interval);
  }, [MDSInsightsState.selectedDataSourceId]);

const fetchInsightsStatus = async () => {
  try {
      const statusPath = MDSInsightsState.selectedDataSourceId
        ? `${AD_NODE_API.INSIGHTS_STATUS}/${MDSInsightsState.selectedDataSourceId}`
        : AD_NODE_API.INSIGHTS_STATUS;
      
      const statusResponse = await core?.http.get(statusPath);
      const enabled = statusResponse?.response?.enabled || false;

    setInsightsEnabled(enabled);
  } catch (error: any) {
    console.error('Error fetching insights status:', error);
    setInsightsEnabled(false);
  }
};

  // Process detectors when they change
  useEffect(() => {
    if (adState.detectorList) {
      processDetectors();
    }
  }, [adState.detectorList]);

  const loadDetectors = async () => {
    try {
      await dispatch(getDetectorList(getAllDetectorsQueryParamsWithDataSourceId(MDSInsightsState.selectedDataSourceId)));
    } catch (error) {
      console.error('Error loading detectors:', error);
      setIndicesData([]);
      setIsLoading(false);
    }
  };

  const processDetectors = () => {
    setIsLoading(true);
    
    let detectors = [];
    if (adState.detectorList) {
      if (Array.isArray(adState.detectorList)) {
        detectors = adState.detectorList;
      } else {
        detectors = Object.values(adState.detectorList);
      }
    }
    
    const autoCreatedDetectors = detectors.filter(detector => 
      detector.auto_created === true || detector.autoCreated === true
    );
    
    const indexGroups = new Map<string, { detectors: DetectorListItem[] }>();
    
    autoCreatedDetectors.forEach(detector => {
      detector.indices.forEach(indexPattern => {
        if (!indexGroups.has(indexPattern)) {
          indexGroups.set(indexPattern, { detectors: [] });
        }
        indexGroups.get(indexPattern)!.detectors.push(detector);
      });
    });
    
    const indicesData: IndexInsightData[] = Array.from(indexGroups.entries()).map(([indexName, data]) => {
      const states = data.detectors.map(d => d.curState);
      const running = states.filter(s => s === 'Running').length;
      const stopped = states.filter(s => s === 'Stopped').length;
      const total = states.length;

      let overallStatus = '';
      if (running === total) {
        overallStatus = 'All Running';
      } else if (stopped === total) {
        overallStatus = 'All Stopped';
      } else if (running > 0 && stopped > 0) {
        overallStatus = `${running} Running, ${stopped} Stopped`;
      } else {
        overallStatus = `${total} Detectors`;
      }

      return {
        indexName,
        detectors: data.detectors,
        overallStatus,
      };
    });
    
    setIndicesData(indicesData);
    setIsLoading(false);
  };

  const [selectedModalIndices, setSelectedModalIndices] = useState<string[]>([]);
  const [agentId, setAgentId] = useState('auto-create-detector-agent');

  const handleStartAutoInsights = async (selectedIndices: string[], agentIdToUse: string) => {
    if (selectedIndices.length === 0) {
      getNotifications().toasts.addWarning('Please select at least one index');
      return;
    }

    setIsStartingInsights(true);
    
    // Execute ML agent to create detectors
    dispatch(
      executeAutoCreateAgent(
        selectedIndices, 
        agentIdToUse,
        MDSInsightsState.selectedDataSourceId || ''
      )
    ).then((resp: any) => {      
      if (!resp || resp.error) {
        const errorMsg = resp?.error?.message || resp?.error || 'Unknown error';
        getNotifications().toasts.addDanger(
          `Failed to execute ML agent: ${errorMsg}`
        );
        setIsStartingInsights(false);
        return;
      }

      getNotifications().toasts.addSuccess(
        `Started creating anomaly detectors for ${selectedIndices.length} ${selectedIndices.length === 1 ? 'index' : 'indices'}`
      );
      setIsModalVisible(false);
      setSelectedModalIndices([]);
      setIsStartingInsights(false);
      loadDetectors();
    }).catch((error: any) => {
      console.error('Error starting auto insights:', error);
      const errorMsg = error?.body?.message || error?.message || error?.toString() || 'Unknown error';
      getNotifications().toasts.addDanger(
        `Failed to start auto insights: ${errorMsg}`
      );
      setIsStartingInsights(false);
    });
  };


  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (indexName: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(indexName)) {
      newExpanded.delete(indexName);
    } else {
      newExpanded.add(indexName);
    }
    setExpandedRows(newExpanded);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Running': return 'success';
      case 'Stopped': return 'danger';
      case 'Initializing': return 'warning';
      case 'Failed': return 'danger';
      default: return 'subdued';
    }
  };

  const getOverallStatusColor = (status: string) => {
    if (status.includes('All Running')) return 'success';
    if (status.includes('All Stopped')) return 'danger';
    if (status.includes('Mixed')) return 'warning';
    return 'primary';
  };

  const columns = [
    {
      field: 'indexName',
      name: 'Index',
      sortable: true,
      render: (indexName: string) => (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="indexManagementApp" color="success" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>{indexName}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'detectors',
      name: 'Auto-Created Detectors',
      render: (detectors: DetectorListItem[], item: IndexInsightData) => {
        const isExpanded = expandedRows.has(item.indexName);
        const detectorsToShow = isExpanded ? detectors : detectors.slice(0, 3);
        
        return (
          <EuiFlexGroup direction="column" gutterSize="xs">
            {detectors && detectors.length > 0 ? (
              <>
                {detectorsToShow.map((detector, i) => (
                  <EuiFlexItem key={i}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiHealth color={getStateColor(detector.curState || 'Unknown')}>
                          {detector.curState || 'Unknown'}
                        </EuiHealth>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiLink 
                          href={`${PLUGIN_NAME}#/detectors/${detector.id}/results${dataSourceId ? `?dataSourceId=${dataSourceId}` : ''}`}
                          size="s"
                        >
                          {detector.name}
                        </EuiLink>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
                {detectors.length > 3 && (
                  <EuiFlexItem>
                    <EuiLink 
                      size="s" 
                      color="subdued"
                      onClick={() => toggleRowExpansion(item.indexName)}
                    >
                      {isExpanded 
                        ? 'Show less' 
                        : `+${detectors.length - 3} more detectors`
                      }
                    </EuiLink>
                  </EuiFlexItem>
                )}
              </>
            ) : (
              <EuiText size="s" color="subdued">
                No detectors created
              </EuiText>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'overallStatus',
      name: 'Overall Status',
      render: (status: string) => (
        <EuiBadge color={getOverallStatusColor(status)}>
          {status}
        </EuiBadge>
      ),
    },
  ];

  const renderAddIndicesPanel = () => (
    <EuiPanel paddingSize="m" data-test-subj="addNewIndicesPanel" style={{ margin: '0 24px' }}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Add New Indices for Auto Insights</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            Select indices where you want to automatically create anomaly detectors and generate daily insights.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSmallButton
            data-test-subj="addNewIndicesButton"
            fill
            color="primary"
            iconType="plus"
            onClick={() => setIsModalVisible(true)}
          >
            Add Indices
          </EuiSmallButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );

  const renderEmptyState = () => {
    // Scenario 1: Job inactive, no detectors - Show "Add Your First Index" button
    if (!insightsEnabled && indicesData.length === 0) {
      return (
        <EuiEmptyPrompt
          data-test-subj="noIndicesConfiguredPrompt"
          iconType="indexManagementApp"
          title={<h3>No indices configured for insights</h3>}
          body={
            <p>
              Start by selecting indices where you want to automatically create anomaly detectors
              and generate daily insights. The system will analyze your data patterns and create
              appropriate detectors for each index.
            </p>
          }
          actions={
            <EuiSmallButton
              data-test-subj="addFirstIndexButton"
              fill
              iconType="plus"
              onClick={() => {
                const application = getApplication();
                application.navigateToApp(DAILY_INSIGHTS_OVERVIEW_PAGE_NAV_ID, {
                  path: dataSourceId ? `?dataSourceId=${dataSourceId}` : ''
                });
              }}
            >
              Add Your First Index
            </EuiSmallButton>
          }
        />
      );
    }

    // Scenario 2: Job active, no detectors yet - Show "detectors being created" message
    if (insightsEnabled && indicesData.length === 0) {
      return (
        <EuiEmptyPrompt
          data-test-subj="detectorsBeingCreatedPrompt"
          icon={<EuiLoadingSpinner size="xl" />}
          title={<h3>Job has started and detectors are being created</h3>}
          body={
            <p>
              Please wait while we create detectors for your indices. This process may take a few minutes.
              The page will automatically refresh to show your detectors once they're ready.
            </p>
          }
        />
      );
    }

    // Fallback (shouldn't reach here if indicesData.length > 0)
    return null;
  };

  return (
    <React.Fragment>
        {dataSourceEnabled && renderDataSourceComponent}
        {insightsEnabled && renderAddIndicesPanel()}
      <EuiSpacer size="l" />

      <div style={{ margin: '0 24px' }}>
        <ContentPanel 
          title="Configured Indices" 
          titleSize="m"
          subTitle={`${indicesData.length} indices configured for daily insights`}
          data-test-subj="configuredIndicesPanel"
        actions={
          <EuiSmallButton
            iconType="refresh"
            onClick={loadDetectors}
            isLoading={isLoading}
          >
            Refresh
          </EuiSmallButton>
        }
      >
        {indicesData.length > 0 ? (
          <EuiBasicTable
            items={indicesData}
            columns={columns}
            tableLayout="fixed"
            loading={isLoading}
          />
        ) : (
          renderEmptyState()
        )}
      </ContentPanel>
      </div>

      <EnhancedSelectionModal
        isVisible={isModalVisible}
        selectedIndices={selectedModalIndices}
        onSelectionChange={setSelectedModalIndices}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedModalIndices([]);
        }}
        onConfirm={(agentIdFromModal) => {
          handleStartAutoInsights(selectedModalIndices, agentIdFromModal || agentId);
        }}
        isLoading={isStartingInsights}
        immediateExecute={true}
        modalTitle="Add Indices to Daily Insights"
        confirmButtonText="Add Indices"
      />
    </React.Fragment>
  );
}
