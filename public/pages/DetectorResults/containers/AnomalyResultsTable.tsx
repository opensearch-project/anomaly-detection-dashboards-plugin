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
  EuiBasicTable as EuiBasicTableComponent,
  EuiEmptyPrompt,
  EuiText,
  EuiButton,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButtonEmpty,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { get } from 'lodash';
import React, { useEffect, useState, Dispatch } from 'react';
import { first } from 'rxjs/operators';
import { useDispatch } from 'react-redux';
import { SORT_DIRECTION } from '../../../../server/utils/constants';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import {
  entityValueColumn,
  staticColumn,
  ENTITY_VALUE_FIELD,
} from '../utils/tableUtils';
import { DetectorResultsQueryParams } from 'server/models/types';
import { AnomalyData, Anomalies } from '../../../models/interfaces';
import { getTitleWithCount } from '../../../utils/utils';
import { convertToCategoryFieldAndEntityString } from '../../utils/anomalyResultUtils';
import { HeatmapCell } from '../../AnomalyCharts/containers/AnomalyHeatmapChart';
import { getSavedObjectsClient, getNotifications, getDataSourceEnabled } from '../../../services';
import { CoreStart } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { useLocation } from 'react-router-dom';
import { getDataSourceFromURL } from '../../../../public/pages/utils/helpers';
import { setStateToOsdUrl } from '../../../../../../src/plugins/opensearch_dashboards_utils/public';
import { opensearchFilters, IIndexPattern } from '../../../../../../src/plugins/data/public';
import { AnomalyAnalysisGenerator, ComprehensiveAnalysis, formatAnalysisForDisplay } from '../utils/anomalyAnalysisGenerator';
import { LogEntry } from '../utils/statisticalAnalysis';
import { searchOpenSearch } from '../../../redux/reducers/opensearch';

//@ts-ignore
const EuiBasicTable = EuiBasicTableComponent as any;

interface AnomalyResultsTableProps {
  anomalies: AnomalyData[];
  isHCDetector?: boolean;
  isHistorical?: boolean;
  selectedHeatmapCell?: HeatmapCell | undefined;
  detectorIndices: string[];
  detectorTimeField: string;
  anomalyAndFeatureResults?: Anomalies[];
  detector?: any;
}

interface ListState {
  page: number;
  queryParams: DetectorResultsQueryParams;
}
const MAX_ANOMALIES = 10000;

export function AnomalyResultsTable(props: AnomalyResultsTableProps) {
  const [state, setState] = useState<ListState>({
    page: 0,
    queryParams: {
      from: 0,
      size: 10,
      sortDirection: SORT_DIRECTION.DESC,
      sortField: 'startTime',
    },
  });
  const [targetAnomalies, setTargetAnomalies] = useState<any[]>([] as any[]);

  // State for statistical analysis
  const [statisticalAnalysisResults, setStatisticalAnalysisResults] = useState<{[key: string]: ComprehensiveAnalysis[]}>({});
  const [loadingStatisticalAnalysis, setLoadingStatisticalAnalysis] = useState<{[key: string]: boolean}>({});
  const [statisticalAnalysisErrors, setStatisticalAnalysisErrors] = useState<{[key: string]: string}>({});
  const [openStatisticalPopovers, setOpenStatisticalPopovers] = useState<{[key: string]: boolean}>({});
  
  // Initialize anomaly analysis generator
  const anomalyAnalysisGenerator = React.useMemo(() => new AnomalyAnalysisGenerator(), []);
  
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch() as Dispatch<any>;

  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;
  
  // Only return anomalies if they exist. If high-cardinality: only show when a heatmap cell is selected
  const totalAnomalies =
    props.anomalies &&
    ((props.isHCDetector && props.selectedHeatmapCell) || !props.isHCDetector)
      ? props.anomalies.filter((anomaly) => anomaly.anomalyGrade > 0)
      : [];

  // find feature output values for a specific anomaly
  const getFeatureOutputValues = (anomalyTime: number, anomalyEntity?: any) => {
    const featureValues: { [featureName: string]: number } = {};
    
    if (!props.anomalyAndFeatureResults || !props.detector?.featureAttributes) {
      return featureValues;
    }

    // find the feature data that matches the anomaly time and entity
    props.anomalyAndFeatureResults.forEach((timeSeries: any) => {
      if (timeSeries.featureData) {
        Object.keys(timeSeries.featureData).forEach((featureId: string) => {
          const featureDataPoints = timeSeries.featureData[featureId];
          
          const matchingFeaturePoint = featureDataPoints.find((point: any) => {
            return Math.abs(point.plotTime - anomalyTime) < 30000; // 30 second tolerance
          });
          
          if (matchingFeaturePoint) {
            const featureConfig = props.detector.featureAttributes.find((attr: any) => 
              attr.featureId === featureId
            );
            
            if (featureConfig) {
              let fieldName = featureConfig.featureName || featureId;
              let aggregationMethod = '';
              
              if (featureConfig.aggregationQuery) {
                try {
                  const aggregationKeys = Object.keys(featureConfig.aggregationQuery);
                  if (aggregationKeys.length > 0) {
                    const firstAggregation = featureConfig.aggregationQuery[aggregationKeys[0]];
                    const methodKeys = Object.keys(firstAggregation);
                    if (methodKeys.length > 0) {
                      aggregationMethod = methodKeys[0];
                      const method = firstAggregation[methodKeys[0]];
                      if (method && method.field) {
                        fieldName = method.field;
                      }
                    }
                  }
                } catch (error) {
                  console.warn('Error extracting field name from aggregation query:', error);
                }
              }
              
              // Only add feature filter for min/max aggregation methods
              if (aggregationMethod === 'min' || aggregationMethod === 'max') {
                featureValues[fieldName] = matchingFeaturePoint.data;
              }
            } else {
              // fallback: use the feature name from the data point if available
              const fieldName = matchingFeaturePoint.name || featureId;
              featureValues[fieldName] = matchingFeaturePoint.data;
            }
          }
        });
      }
    });
    
    return featureValues;
  };

  // fetch logs for statistical analysis
  const fetchLogsForStatisticalAnalysis = async (startTime: number, endTime: number, item: any) => {
    try {
      const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
      const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
      const fromTime = startTime - TEN_MINUTES_IN_MS; // 10 minutes before
      const toTime = endTime + FIVE_MINUTES_IN_MS;    // 5 minutes after

      const query: any = {
        query: {
          bool: {
            must: [
              {
                range: {
                  [props.detectorTimeField]: {
                    gte: fromTime,
                    lte: toTime,
                  }
                }
              }
            ]
          }
        },
        sort: [{ [props.detectorTimeField]: { order: 'desc' } }],
        size: 500, // Increased limit for better analysis
        _source: true
      };

      const indexPattern = props.detectorIndices.join(',');

      const requestData = {
        index: indexPattern,
        size: 500,
        rawQuery: query,
      };

      const response: any = await dispatch(
        // @ts-ignore dispatch typing
        searchOpenSearch(requestData)
      );

      const hits = get(response, 'response.hits.hits', []);
      if (hits && hits.length > 0) {
        return hits.map((hit: any) => hit._source);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching logs for statistical analysis:', error);
      return [];
    }
  };

  // analyze logs with statistical analysis
  const analyzeLogsStatistically = async (logs: LogEntry[], anomalyContext: any) => {
    try {
      const result = await anomalyAnalysisGenerator.generateAnalysis(logs, anomalyContext, props.detector);

      // for historical analysis, confidence is always 0, so avoid generating confidence-based analysis
      const insights = props.isHistorical
        ? result.insights.filter(
            (insight) => insight.title !== 'Low Confidence Anomaly'
          )
        : result.insights;

      return insights;
    } catch (error: any) {
      console.error('Error in statistical analysis:', error);
      throw new Error(`Failed to analyze logs statistically: ${error.message || 'Unknown error'}`);
    }
  };

  // handle statistical analysis for an anomaly
  const handleStatisticalAnalysis = async (item: any) => {
    const anomalyKey = `${item.startTime}-${item.endTime}-${item[ENTITY_VALUE_FIELD] || 'no-entity'}`;
    
    // check if already analyzed
    if (statisticalAnalysisResults[anomalyKey]) {
      return;
    }

    setLoadingStatisticalAnalysis(prev => ({ ...prev, [anomalyKey]: true }));
    setStatisticalAnalysisErrors(prev => ({ ...prev, [anomalyKey]: '' }));

    try {
      // fetch logs for analysis
      const logs = await fetchLogsForStatisticalAnalysis(item.startTime, item.endTime, item);
      
      const logEntries: LogEntry[] = logs.map((log: any) => ({
        timestamp: new Date(log['@timestamp'] || log.timestamp || log._timestamp).getTime(),
        level: log.level || log.severity,
        message: log.message || log.msg || JSON.stringify(log),
        ...log
      }));
      const insights = await analyzeLogsStatistically(logEntries, item);
      setStatisticalAnalysisResults(prev => ({ ...prev, [anomalyKey]: insights }));
    } catch (error: any) {
      console.error(`Statistical Analysis failed:`, error);
      setStatisticalAnalysisErrors(prev => ({ 
        ...prev, 
        [anomalyKey]: error.message || 'Failed to analyze logs statistically' 
      }));
    } finally {
      setLoadingStatisticalAnalysis(prev => ({ ...prev, [anomalyKey]: false }));
    }
  };

  const handleOpenDiscover = async (startTime: number, endTime: number, item: any) => {
    try {
      // calculate time range with 10-minute buffer on each side per customer request
      const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
      const startISO = new Date(startTime - TEN_MINUTES_IN_MS).toISOString();
      const endISO = new Date(endTime + TEN_MINUTES_IN_MS).toISOString();

      const basePath = `${window.location.origin}${window.location.pathname.split('/app/')[0]}`;
      const savedObjectsClient = getSavedObjectsClient();
      const indexPatternTitle = props.detectorIndices.join(',');
      
      let discoverUrl = '';
      let indexPatternId = '';

      if (getDataSourceEnabled().enabled) {
        const currentWorkspace = await core.workspaces.currentWorkspace$.pipe(first()).toPromise();
        const currentWorkspaceId = currentWorkspace?.id;

        // try to find an existing index pattern with this title
        let findExistingIndexPatternOptions: any = {
          type: 'index-pattern',
          fields: ['title'],
          perPage: 10000,
        };

        if (currentWorkspaceId) {
          findExistingIndexPatternOptions.workspaces = [currentWorkspaceId];
        }

        const indexPatternResponse = await savedObjectsClient.find(findExistingIndexPatternOptions);
        
        // Filter by title and data source id
        const matchingIndexPatterns = indexPatternResponse.savedObjects.filter(
          (obj: any) => {
            const titleMatches = obj.attributes.title === indexPatternTitle;
            
            const dataSourceRef = obj.references?.find(
              (ref: any) => ref.type === 'data-source' && ref.name === 'dataSource'
            );
            const dataSourceMatches = dataSourceRef?.id === dataSourceId;
            
            return titleMatches && dataSourceMatches;
          }
        );
        
        if (matchingIndexPatterns.length > 0) {
          indexPatternId = matchingIndexPatterns[0].id;
        } else {
          // try to create a new index pattern
          try {
            const createPayload: any = {
              attributes: {
                title: indexPatternTitle,
                timeFieldName: props.detectorTimeField,
              },
            };

            createPayload.references = [
              {
                id: dataSourceId,
                type: 'data-source',
                name: 'dataSource'
              }
            ];

            if (currentWorkspaceId) {
              createPayload.workspaces = [currentWorkspaceId];
            }

            const newIndexPattern = await savedObjectsClient.create('index-pattern', createPayload.attributes, {
              references: createPayload.references,
              workspaces: createPayload.workspaces,
            });
            indexPatternId = newIndexPattern.id;

            getNotifications().toasts.addSuccess(`Created new index pattern: ${indexPatternTitle}`);
          } catch (error: any) {
            getNotifications().toasts.addDanger(`Failed to create index pattern: ${error.message}`);
            return;
          }
        }

        if (dataSourceId) {
          try {
            const dataSourceObject = await savedObjectsClient.get('data-source', dataSourceId);
            const attributes = dataSourceObject.attributes as any;
            const dataSourceTitle = attributes?.title;
            const dataSourceEngineType = attributes?.dataSourceEngineType;

            // Build filters for HC detector
            let filters: any[] = [];
            if (props.isHCDetector && item[ENTITY_VALUE_FIELD]) {
              const entityValues = item[ENTITY_VALUE_FIELD].split('\n').map((s: string) => s.trim()).filter(Boolean);
              filters = entityValues.map((entityValue: string) => {
                const [field, value] = entityValue.split(': ').map((s: string) => s.trim());
                const mockField = { name: field, type: 'string' };
                const mockIndexPattern = { 
                  id: indexPatternId, 
                  title: indexPatternTitle,
                  fields: [],
                  getFieldByName: () => undefined,
                  getComputedFields: () => [],
                  getScriptedFields: () => [],
                  getSourceFilter: () => undefined,
                  getTimeField: () => undefined,
                  isTimeBased: () => false
                } as unknown as IIndexPattern;
                return opensearchFilters.buildPhraseFilter(mockField, value, mockIndexPattern);
              });
            }

            // Get feature output values for this anomaly and add them as filters
            const featureValues = getFeatureOutputValues(item.plotTime || item.endTime, item.entity);
            Object.keys(featureValues).forEach((featureName: string) => {
              const featureValue = featureValues[featureName];
              const mockField = { name: featureName, type: 'number' };
              const mockIndexPattern = { 
                id: indexPatternId, 
                title: indexPatternTitle,
                fields: [],
                getFieldByName: () => undefined,
                getComputedFields: () => [],
                getScriptedFields: () => [],
                getSourceFilter: () => undefined,
                getTimeField: () => undefined,
                isTimeBased: () => false
              } as unknown as IIndexPattern;
              filters.push(opensearchFilters.buildPhraseFilter(mockField, featureValue, mockIndexPattern));
            });

            // Build app state with filters
            const appState = {
              discover: {
                columns: ['_source'],
                isDirty: false,
                sort: []
              },
              metadata: {
                view: 'discover'
              },
              filters: filters
            };

            // Build global state with time range
            const globalState = {
              filters: [],
              refreshInterval: {
                pause: true,
                value: 0
              },
              time: {
                from: startISO,
                to: endISO
              }
            };

            // Build query state
            const queryState = {
              filters: filters,
              query: {
                dataset: {
                  dataSource: {
                    id: dataSourceId,
                    title: dataSourceTitle,
                    type: dataSourceEngineType
                  },
                  id: indexPatternId,
                  isRemoteDataset: false,
                  timeFieldName: props.detectorTimeField,
                  title: indexPatternTitle,
                  type: 'INDEX_PATTERN'
                },
                language: 'kuery',
                query: ''
              }
            };

            // Generate URL using setStateToOsdUrl
            let url = `${basePath}/app/data-explorer/discover#/`;
            url = setStateToOsdUrl('_a', appState, { useHash: false }, url);
            url = setStateToOsdUrl('_g', globalState, { useHash: false }, url);
            url = setStateToOsdUrl('_q', queryState, { useHash: false }, url);
            
            discoverUrl = url;
            
            window.open(discoverUrl, '_blank');
            
          } catch (error: any) {
            console.error("Error fetching data source details:", error);
          }
        }

      } else {
        // try to find an existing index pattern with this title
        const indexPatternResponse = await savedObjectsClient.find({
          type: 'index-pattern',
          fields: ['title'],
          search: `"${indexPatternTitle}"`,
          searchFields: ['title'],
        });
        
        if (indexPatternResponse.savedObjects.length > 0) {
          indexPatternId = indexPatternResponse.savedObjects[0].id;
        } else {
          // try to create a new index pattern
          try {
            const newIndexPattern = await savedObjectsClient.create('index-pattern', {
              title: indexPatternTitle,
              timeFieldName: props.detectorTimeField,
            });
            
            indexPatternId = newIndexPattern.id;

            getNotifications().toasts.addSuccess(`Created new index pattern: ${indexPatternTitle}`);
          } catch (error: any) {
            getNotifications().toasts.addDanger(`Failed to create index pattern: ${error.message}`);
            return;
          }
        }
        
        // Build filters for HC detector
        let filters: any[] = [];
        if (props.isHCDetector && item[ENTITY_VALUE_FIELD]) {
          const entityValues = item[ENTITY_VALUE_FIELD].split('\n').map((s: string) => s.trim()).filter(Boolean);
          filters = entityValues.map((entityValue: string) => {
            const [field, value] = entityValue.split(': ').map((s: string) => s.trim());
            const mockField = { name: field, type: 'string' };
            const mockIndexPattern = { 
              id: indexPatternId, 
              title: indexPatternTitle,
              fields: [],
              getFieldByName: () => undefined,
              getComputedFields: () => [],
              getScriptedFields: () => [],
              getSourceFilter: () => undefined,
              getTimeField: () => undefined,
              isTimeBased: () => false
            } as unknown as IIndexPattern;
            return opensearchFilters.buildPhraseFilter(mockField, value, mockIndexPattern);
          });
        }

        // Get feature output values for this anomaly and add them as filters
        const featureValues = getFeatureOutputValues(item.plotTime || item.endTime, item.entity);
        Object.keys(featureValues).forEach((featureName: string) => {
          const featureValue = featureValues[featureName];
          const mockField = { name: featureName, type: 'number' };
          const mockIndexPattern = { 
            id: indexPatternId, 
            title: indexPatternTitle,
            fields: [],
            getFieldByName: () => undefined,
            getComputedFields: () => [],
            getScriptedFields: () => [],
            getSourceFilter: () => undefined,
            getTimeField: () => undefined,
            isTimeBased: () => false
          } as unknown as IIndexPattern;
          filters.push(opensearchFilters.buildPhraseFilter(mockField, featureValue, mockIndexPattern));
        });

        // Build app state with filters
        const appState = {
          discover: {
            columns: ['_source'],
            isDirty: false,
            sort: []
          },
          metadata: {
            indexPattern: indexPatternId,
            view: 'discover'
          },
          filters: filters
        };

        // Build global state with time range
        const globalState = {
          filters: [],
          refreshInterval: {
            pause: true,
            value: 0
          },
          time: {
            from: startISO,
            to: endISO
          }
        };

        // Build query state
        const queryState = {
          filters: filters,
          query: {
            language: 'kuery',
            query: ''
          }
        };

        // Generate URL using setStateToOsdUrl
        let url = `${basePath}/app/data-explorer/discover#/`;
        url = setStateToOsdUrl('_a', appState, { useHash: false }, url);
        url = setStateToOsdUrl('_g', globalState, { useHash: false }, url);
        url = setStateToOsdUrl('_q', queryState, { useHash: false }, url);
        
        discoverUrl = url;
        
        window.open(discoverUrl, '_blank');
      }
    } catch (error: any) {
      getNotifications().toasts.addDanger('Error opening discover view');
    }
  };

  const renderInsightsSummary = (summary: string) => {
    const HEADER_LINES = new Set([
      'What Was Happening During This Issue?',
      'What Might Have Caused This Problem?',
      'What Patterns Did We Find?',
      'What Should We Do Next?',
    ]);

    return summary.split('\n').map((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <br key={index} />;
      }

      if (HEADER_LINES.has(trimmed)) {
        return (
          <p key={index} style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {trimmed}
          </p>
        );
      }

      return (
        <p key={index} style={{ marginBottom: 2 }}>
          {trimmed}
        </p>
      );
    });
  };

  const getCustomColumns = () => {
    const columns = [...staticColumn] as any[];

    // Add Anomaly analysis column
    const anomalyAnalysisColumn = {
      field: 'anomalyAnalysis',
      name: (
        <EuiText size="xs" style={{ fontWeight: 'bold' }}>
          <b>Anomaly analysis</b>{' '}
          <EuiToolTip content="Automated analysis of the anomaly and surrounding logs to highlight potential patterns and causes.">
            <EuiIcon type="iInCircle" />
          </EuiToolTip>
        </EuiText>
      ),
      align: 'center',
      truncateText: false,
      width: '200px',
      render: (value: any, item: any) => {
        const anomalyKey = `${item.startTime}-${item.endTime}-${item[ENTITY_VALUE_FIELD] || 'no-entity'}`;
        const isLoading = loadingStatisticalAnalysis[anomalyKey];
        const insights = statisticalAnalysisResults[anomalyKey];
        const error = statisticalAnalysisErrors[anomalyKey];
        const isPopoverOpen = openStatisticalPopovers[anomalyKey];

        if (isLoading) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <EuiLoadingSpinner size="s" />
              <EuiText size="xs">Analyzing...</EuiText>
            </div>
          );
        }

        if (error) {
          return (
            <EuiToolTip content={error}>
              <EuiButton
                size="s"
                color="danger"
                onClick={() => handleStatisticalAnalysis(item)}
                iconType="refresh"
              >
                Retry
              </EuiButton>
            </EuiToolTip>
          );
        }

        if (insights && insights.length > 0) {
          const criticalInsights = insights.filter(i => i.severity === 'critical').length;
          const highInsights = insights.filter(i => i.severity === 'high').length;
          const actionableInsights = insights.filter(i => i.actionable).length;
          
          const buttonColor = criticalInsights > 0 ? 'danger' : highInsights > 0 ? 'warning' : 'primary';
          const buttonText = criticalInsights > 0 ? `${criticalInsights} Critical` : 
                           highInsights > 0 ? `${highInsights} High` : 
                           `${insights.length} Insights`;

          return (
            <EuiPopover
              button={
                <EuiButton
                  size="s"
                  color={buttonColor}
                  iconType="stats"
                  onClick={() => setOpenStatisticalPopovers(prev => ({ ...prev, [anomalyKey]: !isPopoverOpen }))}
                >
                  {buttonText}
                </EuiButton>
              }
              isOpen={isPopoverOpen}
              closePopover={() => setOpenStatisticalPopovers(prev => ({ ...prev, [anomalyKey]: false }))}
              anchorPosition="rightCenter"
              panelPaddingSize="m"
              style={{ maxWidth: '500px' }}
            >
              <EuiPopoverTitle>
                Statistical Analysis Summary
                <EuiText size="xs" color="subdued">
                  {insights.length} insights • {actionableInsights} actionable
                </EuiText>
              </EuiPopoverTitle>
              <div style={{ maxWidth: '450px', maxHeight: '400px', overflow: 'auto' }}>
                  <EuiText
                    size="s"
                    style={{
                      lineHeight: '1.5',
                      fontFamily: 'monospace',
                      backgroundColor: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    {renderInsightsSummary(formatAnalysisForDisplay(insights))}
                  </EuiText>
              </div>
              <EuiPopoverFooter>
                <EuiButtonEmpty
                  size="xs"
                  onClick={() => navigator.clipboard.writeText(formatAnalysisForDisplay(insights))}
                  iconType="copy"
                >
                  Copy summary
                </EuiButtonEmpty>
              </EuiPopoverFooter>
            </EuiPopover>
          );
        }

        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <EuiButton
              size="s"
              color="primary"
              onClick={() => handleStatisticalAnalysis(item)}
              iconType="stats"
            >
              Analyze
            </EuiButton>
          </div>
        );
      }
    };

    // Insert Statistical Insights column before Actions column
    const actionsColumnIndex = columns.findIndex((column: any) => column.field === 'actions');
    if (actionsColumnIndex !== -1) {
      columns.splice(actionsColumnIndex, 0, anomalyAnalysisColumn);

      // Update actions column to open Discover
      const actionsColumn = { ...columns[actionsColumnIndex + 1] } as any;

      if (actionsColumn.actions && Array.isArray(actionsColumn.actions)) {
        actionsColumn.actions = [
          {
            ...actionsColumn.actions[0],
            onClick: (item: any) => handleOpenDiscover(item.startTime, item.endTime, item),
          },
        ];
      }

      columns[actionsColumnIndex + 1] = actionsColumn;
    } else {
      // If no actions column, just add Statistical Insights column at the end
      columns.push(anomalyAnalysisColumn);
    }

    return columns;
  };

  const sortFieldCompare = (field: string, sortDirection: SORT_DIRECTION) => {
    return (a: any, b: any) => {
      if (get(a, `${field}`) > get(b, `${field}`))
        return sortDirection === SORT_DIRECTION.ASC ? 1 : -1;
      if (get(a, `${field}`) < get(b, `${field}`))
        return sortDirection === SORT_DIRECTION.ASC ? -1 : 1;
      return 0;
    };
  };

  useEffect(() => {
    // Only return anomalies if they exist. If high-cardinality: only show when a heatmap cell is selected
    let anomalies =
      props.anomalies &&
      ((props.isHCDetector && props.selectedHeatmapCell) || !props.isHCDetector)
        ? props.anomalies.filter((anomaly) => anomaly.anomalyGrade > 0)
        : [];

    if (props.isHCDetector) {
      anomalies = anomalies.map((anomaly) => {
        return {
          ...anomaly,
          [ENTITY_VALUE_FIELD]: convertToCategoryFieldAndEntityString(
            get(anomaly, 'entity', [])
          ),
        };
      });
    }

    anomalies.sort(
      sortFieldCompare(
        state.queryParams.sortField,
        state.queryParams.sortDirection
      )
    );

    setTargetAnomalies(
      anomalies.slice(
        state.page * state.queryParams.size,
        (state.page + 1) * state.queryParams.size
      )
    );
  }, [props.anomalies, state]);

  const isLoading = false;

  const handleTableChange = ({ page: tablePage = {}, sort = {} }: any) => {
    const { index: page, size } = tablePage;
    const { field: sortField, direction: sortDirection } = sort;
    setState({
      page,
      queryParams: {
        ...state.queryParams,
        size,
        sortField,
        sortDirection,
      },
    });
  };

  const sorting = {
    sort: {
      direction: state.queryParams.sortDirection,
      field: state.queryParams.sortField,
    },
  };
  const pagination = {
    pageIndex: state.page,
    pageSize: state.queryParams.size,
    totalItemCount: Math.min(MAX_ANOMALIES, totalAnomalies.length),
    pageSizeOptions: [10, 30, 50, 100],
  };
  
  const customColumns = getCustomColumns();

  return (
    <ContentPanel
      title={getTitleWithCount('Anomaly occurrences', totalAnomalies.length)}
      titleDataTestSubj="anomalyOccurrencesHeader"
      titleSize="xs"
      titleClassName="preview-title"
    >
      <EuiBasicTable
        items={targetAnomalies}
        columns={
          props.isHCDetector && props.isHistorical
            ? [
                ...customColumns.slice(0, 2),
                entityValueColumn,
                ...customColumns.slice(3),
              ]
            : props.isHCDetector
            ? [
                ...customColumns.slice(0, 2),
                entityValueColumn,
                ...customColumns.slice(2),
              ]
            : props.isHistorical
            ? [...customColumns.slice(0, 2), ...customColumns.slice(3)]
            : customColumns
        }
        onChange={handleTableChange}
        sorting={sorting}
        pagination={pagination}
        noItemsMessage={
          isLoading ? (
            'Loading anomaly results...'
          ) : (
            <EuiEmptyPrompt
              style={{ maxWidth: '45em' }}
              body={
                <EuiText data-test-subj="noAnomaliesMessage" size="s">
                  <p>There are no anomalies currently.</p>
                </EuiText>
              }
            />
          )
        }
      />
    </ContentPanel>
  );
}
