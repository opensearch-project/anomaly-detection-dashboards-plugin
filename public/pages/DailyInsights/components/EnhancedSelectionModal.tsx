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
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiPanel,
  EuiSpacer,
  EuiFieldSearch,
  EuiFieldText,
  EuiCheckbox,
  EuiText,
  EuiSmallButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiIcon,
  EuiBasicTable,
  EuiCompressedComboBox,
  EuiFormRow,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { debounce, get } from 'lodash';
import { AppState } from '../../../redux/reducers';
import {
  getClustersInfo,
  getIndicesAndAliases,
  getPrioritizedIndices,
} from '../../../redux/reducers/opensearch';
import {
  CatIndex,
  ClusterInfo,
  IndexAlias,
} from '../../../../server/models/types';
import {
  getDataSourceFromURL,
  getLocalCluster,
  sanitizeSearchText,
  getVisibleOptions,
} from '../../utils/helpers';
import { getClusterOptionLabel } from '../../DefineDetector/utils/helpers';
import { getDataSourceEnabled } from '../../../../public/services';

export interface ClusterOption {
  label: string;
  cluster: string;
  localcluster: string;
}

interface EnhancedSelectionModalProps {
  isVisible: boolean;
  selectedIndices: string[];
  onSelectionChange: (indices: string[]) => void;
  onCancel: () => void;
  onConfirm: (agentId?: string) => void; // Pass agentId when immediateExecute is true
  onStartInsights?: (indices: string[], agentId: string) => Promise<void>;
  isLoading?: boolean;
  immediateExecute?: boolean; // If true, executes on confirm; if false, returns selection
  modalTitle?: string; // Custom modal title
  confirmButtonText?: string; // Custom confirm button text
}

export function EnhancedSelectionModal({
  isVisible,
  selectedIndices,
  onSelectionChange,
  onCancel,
  onConfirm,
  onStartInsights,
  isLoading = false,
  immediateExecute = false,
  modalTitle = 'Select Indices for Daily Insights',
  confirmButtonText = 'Confirm Selected Indices',
}: EnhancedSelectionModalProps) {
  const dispatch = useDispatch();
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  
  // Step tracking: 'selection' or 'confirmation'
  const [currentStep, setCurrentStep] = useState<'selection' | 'confirmation'>('selection');
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [agentId, setAgentId] = useState('auto-create-detector-agent');
  const dataSourceEnabled = getDataSourceEnabled().enabled;

  // Reset to selection step when modal opens
  useEffect(() => {
    if (isVisible) {
      setCurrentStep('selection');
      setIsStartingJob(false);
    }
  }, [isVisible]);

  const handleAddSelectedIndices = () => {
    if (immediateExecute) {
      // Skip confirmation step, execute immediately with agent ID
      onConfirm(agentId);
    } else {
      // Two-step flow: update parent state and show confirmation
      onConfirm();
      setCurrentStep('confirmation');
    }
  };

  const handleBackToSelection = () => {
    setCurrentStep('selection');
  };

  const handleStartInsights = async () => {
    if (!onStartInsights) return;
    
    setIsStartingJob(true);
    try {
      await onStartInsights(selectedIndices, agentId);
      // Modal will close from parent component after successful start
    } catch (error) {
      console.error('Error starting insights:', error);
    } finally {
      setIsStartingJob(false);
    }
  };
  const dataSourceId = MDSQueryParams.dataSourceId;
  
  const opensearchState = useSelector((state: AppState) => state.opensearch);
  
  const [searchText, setSearchText] = useState('');
  const [queryText, setQueryText] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedClusters, setSelectedClusters] = useState<ClusterOption[]>([]);

  useEffect(() => {
    if (isVisible) {
      // Load clusters when modal opens
      dispatch(getClustersInfo(dataSourceId));
    }
  }, [isVisible, dataSourceId, dispatch]);

  useEffect(() => {
    // Set default cluster selection (local cluster)
    if (opensearchState.clusters && opensearchState.clusters.length > 0) {
      const localCluster = getLocalCluster(opensearchState.clusters);
      setSelectedClusters(getVisibleClusterOptions(localCluster));
    }
  }, [opensearchState.clusters]);

  // Load indices when clusters change (initial load)
  useEffect(() => {
    if (selectedClusters.length > 0) {
      const clustersString = getClustersStringForSearchQuery(selectedClusters);
      const localClusterExists = selectedClusters.some(
        (cluster) => cluster.localcluster === 'true'
      );
      dispatch(getIndicesAndAliases('', dataSourceId, clustersString, localClusterExists));
    }
  }, [selectedClusters, dataSourceId, dispatch]);

  // Stable debounced search handler to prevent flickering
  const debouncedSearch = useCallback(
    debounce(async (searchValue: string, clusters: ClusterOption[], dataSource: string) => {
      if (searchValue !== queryText) {
        const sanitizedQuery = sanitizeSearchText(searchValue);
        setQueryText(sanitizedQuery);
        
        if (clusters.length > 0) {
          const clustersString = clusters
            .filter((cluster) => cluster.localcluster === 'false')
            .map((cluster) => cluster.cluster)
            .join(',');
          await dispatch(getPrioritizedIndices(sanitizedQuery, dataSource, clustersString));
        }
        setPageIndex(0);
      }
    }, 300),
    [queryText, dispatch]
  );

  const handleSearchChange = (searchValue: string) => {
    setSearchText(searchValue);
    debouncedSearch(searchValue, selectedClusters, dataSourceId);
  };

  const getClustersStringForSearchQuery = (clusters: ClusterOption[]) => {
    return clusters
      .filter((cluster) => cluster.localcluster === 'false')
      .map((cluster) => cluster.cluster)
      .join(',');
  };

  const getVisibleClusterOptions = (clusters: ClusterInfo[]): ClusterOption[] => {
    if (clusters.length > 0) {
      const visibleClusters = clusters.map((value) => ({
        label: getClusterOptionLabel(value),
        cluster: value.name,
        localcluster: value.localCluster.toString(),
      }));
      return visibleClusters.sort((a, b) => {
        if (a.localcluster === 'true' && b.localcluster === 'false') return -1;
        if (a.localcluster === 'false' && b.localcluster === 'true') return 1;
        return a.label.localeCompare(b.label);
      });
    }
    return [];
  };

  // Get real indices and aliases from redux state
  const visibleIndices = get(opensearchState, 'indices', []) as CatIndex[];
  const visibleAliases = get(opensearchState, 'aliases', []) as IndexAlias[];
  const localClusterName = selectedClusters.find(c => c.localcluster === 'true')?.cluster || '';

  // Use same ordering as DataSource.tsx
  const groupedOptions = useMemo(() => {
    return getVisibleOptions(visibleIndices, visibleAliases, localClusterName);
  }, [visibleIndices, visibleAliases, localClusterName]);

  // Flatten grouped options with proper cluster ordering (indices, aliases per cluster)
  const allIndices = useMemo(() => {
    const flattenedItems: Array<{name: string, displayName: string, type: 'index' | 'alias', cluster: string, docCount?: number, size?: string}> = [];
    
    // Group by cluster first, then by type within each cluster
    const clusterGroups = new Map<string, {indices: any[], aliases: any[]}>();
    
    groupedOptions.forEach(group => {
      const isAlias = group.label.toLowerCase().includes('alias');
      const type = isAlias ? 'aliases' : 'indices';
      
      // Extract cluster name from group label (e.g., "Indices: [Local]" or "Aliases: cluster-name")
      const clusterMatch = group.label.match(/:\s*(.+)$/);
      const clusterName = clusterMatch ? clusterMatch[1] : 'unknown';
      
      if (!clusterGroups.has(clusterName)) {
        clusterGroups.set(clusterName, { indices: [], aliases: [] });
      }
      
      clusterGroups.get(clusterName)![type] = group.options;
    });
    
    // Process each cluster: indices first, then aliases
    clusterGroups.forEach((groupData, clusterName) => {
      const isLocal = clusterName.includes('[Local]') || clusterName.includes('(Local)');
      
      // Process indices first
      groupData.indices.forEach((option: any) => {
        const indexName = option.label; // Keep original name (remote already has cluster:index format)
        const displayName = `${indexName}`;
        
        let docCount = 0;
        let size = '';
        const indexInfo = visibleIndices.find(i => i.index === option.label);
        if (indexInfo) {
          docCount = parseInt(indexInfo['docs.count'] || '0');
          size = indexInfo['store.size'] || '0b';
        }
        
        flattenedItems.push({
          name: indexName,
          displayName,
          type: 'index',
          cluster: clusterName,
          docCount,
          size,
        });
      });
      
      // Then process aliases
      groupData.aliases.forEach((option: any) => {
        const aliasName = option.label; // Keep original name
        const displayName = `${aliasName} (alias)`;
        
        let size = '';
        const aliasInfo = visibleAliases.find(a => a.alias === option.label);
        size = aliasInfo ? `Alias for: ${aliasInfo.index}` : 'Alias';
        
        flattenedItems.push({
          name: aliasName,
          displayName,
          type: 'alias',
          cluster: clusterName,
          docCount: 0,
          size,
        });
      });
    });
    
    return flattenedItems;
  }, [groupedOptions, visibleIndices, visibleAliases]);

  const filteredIndices = useMemo(() => {
    return allIndices.filter(item => 
      item.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [allIndices, searchText]);

  const { pageOfItems, totalItemCount } = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return {
      pageOfItems: filteredIndices.slice(startIndex, endIndex),
      totalItemCount: filteredIndices.length,
    };
  }, [filteredIndices, pageIndex, pageSize]);

  const onTableChange = ({ page = {} }) => {
    const { index: newPageIndex, size: newPageSize } = page;
    setPageIndex(newPageIndex);
    setPageSize(newPageSize);
  };

  const handleToggleIndex = (indexName: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIndices, indexName]);
    } else {
      onSelectionChange(selectedIndices.filter(i => i !== indexName));
    }
  };

  const handleClusterChange = (clusters: ClusterOption[]) => {
    setSelectedClusters(clusters);
    setPageIndex(0);
  };

  const handleClose = () => {
    setSearchText('');
    setPageIndex(0);
    onCancel();
  };

  if (!isVisible) {
    return null;
  }

  const visibleClusters = get(opensearchState, 'clusters', []) as ClusterInfo[];

  return (
    <EuiModal onClose={handleClose} style={{ width: 1200, minHeight: 600 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {modalTitle}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      
      <EuiModalBody style={{ maxHeight: '70vh', overflowY: 'auto', minHeight: 400 }}>
        {currentStep === 'selection' ? (
          // Step 1: Index selection
          <>
        {/* Cluster Selection */}
        <EuiFormRow label="Clusters">
          <EuiCompressedComboBox
            placeholder="Select clusters"
            options={getVisibleClusterOptions(visibleClusters)}
            selectedOptions={selectedClusters}
            onChange={handleClusterChange}
            isLoading={opensearchState.requesting}
            isClearable={false}
          />
        </EuiFormRow>

        <EuiSpacer size="s" />
        
        {/* Selection Summary */}
        {selectedIndices.length > 0 && (
          <>
            <EuiPanel color="success" paddingSize="s">
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" style={{ padding: '0 12px' }}>
                <EuiFlexItem>
                  <EuiText size="xs"><strong>{selectedIndices.length} selected</strong></EuiText>
                  <EuiFlexGroup wrap gutterSize="xs">
                    {selectedIndices.slice(0, 3).map(index => (
                      <EuiFlexItem grow={false} key={index}>
                        <EuiBadge color="success" style={{ fontSize: '11px' }}>{index}</EuiBadge>
                      </EuiFlexItem>
                    ))}
                    {selectedIndices.length > 3 && (
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          content={
                            <div>
                              <strong>Additional selected indices:</strong>
                              <br />
                              {selectedIndices.slice(3).join(', ')}
                            </div>
                          }
                        >
                          <EuiBadge color="hollow" style={{ fontSize: '11px', cursor: 'help' }}>
                            +{selectedIndices.length - 3}
                          </EuiBadge>
                        </EuiToolTip>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSmallButton fill size="s" onClick={() => onSelectionChange([])}>
                    Clear
                  </EuiSmallButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="xs" />
          </>
        )}
        
        {/* Search */}
        <EuiFieldSearch 
          placeholder="Search indices..." 
          compressed 
          value={searchText}
          onChange={(e) => {
            const value = e.target.value;
            handleSearchChange(value);
          }}
        />
        <EuiSpacer size="s" />
        
        {/* Simple Paginated Table */}
        <div style={{ height: '500px', overflow: 'hidden' }}>
          <EuiBasicTable
            items={pageOfItems.map(item => ({ 
              ...item,
              isSelected: selectedIndices.includes(item.name) 
            }))}
            columns={[
              {
                field: 'name',
                name: `Indices, Aliases & Patterns (${totalItemCount} total, ${selectedIndices.length} selected)`,
                render: (name: string, item: any) => (
                  <EuiCheckbox
                    id={`index-${name}-${pageIndex}`}
                    label={
                      <EuiFlexGroup alignItems="center" gutterSize="xs">
                        <EuiFlexItem grow={false}>
                          <EuiIcon type={item.type === 'alias' ? 'alias' : 'indexManagementApp'} size="s" />
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="xs">{item.displayName || name}</EuiText>
                          {item.type === 'alias' && (
                            <EuiText size="xs" color="subdued" style={{ fontSize: '10px' }}>{item.size}</EuiText>
                          )}
                        </EuiFlexItem>
                        {item.type === 'index' && item.docCount > 0 && (
                          <EuiFlexItem grow={false}>
                            <EuiBadge color="hollow" style={{ fontSize: '10px' }}>{item.docCount.toLocaleString()}</EuiBadge>
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    }
                    checked={item.isSelected}
                    onChange={(e) => handleToggleIndex(name, e.target.checked)}
                  />
                ),
              },
            ]}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount,
              pageSizeOptions: [5, 10, 20, 50],
            }}
            onChange={onTableChange}
            rowProps={(item) => ({
              style: {
                backgroundColor: item.isSelected ? '#F0F9FF' : 'transparent',
                borderLeft: item.isSelected ? '3px solid #0071C2' : '3px solid transparent',
              },
            })}
          />
        </div>
        
        {/* Agent ID field - show in selection step when immediateExecute is true */}
        {immediateExecute && dataSourceEnabled && (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow label="ML Agent ID" helpText="The ML Commons agent ID for creating detectors">
              <EuiFieldText
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Enter agent ID"
              />
            </EuiFormRow>
          </>
        )}
          </>
        ) : (
          // Step 2: Confirmation
          <>
            <EuiText>
              <h3>Confirm Auto Insights Setup</h3>
              <p>
                You're about to start auto insights for <strong>{selectedIndices.length} indices</strong>. 
                This will automatically create anomaly detectors and begin generating daily insights.
              </p>
            </EuiText>
            
            <EuiSpacer size="m" />
            {dataSourceEnabled && (
              <>
      <EuiFormRow label="ML Agent ID" helpText="The ML Commons agent ID for creating detectors">
              <EuiFieldText
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Enter agent ID"
              />
            </EuiFormRow>
            </>
            )}        
            <EuiSpacer size="m" />
            
            <EuiPanel paddingSize="m" color="subdued">
              <EuiText size="s">
                <strong>Selected Indices ({selectedIndices.length}):</strong>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGroup wrap gutterSize="s">
                {selectedIndices.map((index, i) => (
                  <EuiFlexItem grow={false} key={i}>
                    <EuiBadge color="primary">{index}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        {currentStep === 'selection' ? (
          // Step 1: Selection buttons
          <>
            <EuiSmallButton onClick={handleClose}>
              Cancel
            </EuiSmallButton>
            <EuiSmallButton
              fill
              color="primary"
              disabled={selectedIndices.length === 0}
              onClick={handleAddSelectedIndices}
              isLoading={isLoading}
            >
              {confirmButtonText} ({selectedIndices.length})
            </EuiSmallButton>
          </>
        ) : (
          // Step 2: Confirmation buttons
          <>
            <EuiSmallButton onClick={handleBackToSelection}>
              Back to Selection
            </EuiSmallButton>
            <EuiSmallButton onClick={handleClose}>
              Cancel
            </EuiSmallButton>
            <EuiSmallButton
              fill
              color="success"
              onClick={handleStartInsights}
              isLoading={isStartingJob}
              iconType="play"
            >
              Start Auto Insights
            </EuiSmallButton>
          </>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
}
