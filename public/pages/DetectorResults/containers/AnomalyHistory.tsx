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

/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  Fragment,
  useRef,
} from 'react';

import { isEmpty, get } from 'lodash';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiTabs,
  EuiTab,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';
import moment from 'moment';
import { useDispatch } from 'react-redux';
import {
  AnomalyData,
  Detector,
  Monitor,
  DateRange,
  AnomalySummary,
  Anomalies,
  EntityOptionsMap,
  EntityOption,
} from '../../../models/interfaces';
import {
  filterWithDateRange,
  getAnomalySummaryQuery,
  getBucketizedAnomalyResultsQuery,
  parseBucketizedAnomalyResults,
  parseAnomalySummary,
  parsePureAnomalies,
  buildParamsForGetAnomalyResultsWithDateRange,
  FEATURE_DATA_CHECK_WINDOW_OFFSET,
  getTopAnomalousEntitiesQuery,
  parseTopEntityAnomalySummaryResults,
  getEntityAnomalySummariesQuery,
  parseEntityAnomalySummaryResults,
  convertToEntityString,
  parseAggTopEntityAnomalySummaryResults,
  parseTopChildEntityCombos,
} from '../../utils/anomalyResultUtils';
import { AnomalyResultsTable } from './AnomalyResultsTable';
import { AnomaliesChart } from '../../AnomalyCharts/containers/AnomaliesChart';
import { FeatureBreakDown } from '../../AnomalyCharts/containers/FeatureBreakDown';
import { minuteDateFormatter } from '../../utils/helpers';
import {
  ANOMALY_HISTORY_TABS,
  DEFAULT_TOP_CHILD_ENTITIES_TO_DISPLAY,
  DEFAULT_TOP_CHILD_ENTITIES_TO_FETCH,
} from '../utils/constants';
import { MIN_IN_MILLI_SECS } from '../../../../server/utils/constants';
import { INITIAL_ANOMALY_SUMMARY } from '../../AnomalyCharts/utils/constants';
import { MAX_ANOMALIES } from '../../../utils/constants';
import {
  searchResults,
  getDetectorResults,
  getTopAnomalyResults,
} from '../../../redux/reducers/anomalyResults';
import { AnomalyOccurrenceChart } from '../../AnomalyCharts/containers/AnomalyOccurrenceChart';
import {
  HeatmapCell,
  HeatmapDisplayOption,
  INITIAL_HEATMAP_DISPLAY_OPTION,
} from '../../AnomalyCharts/containers/AnomalyHeatmapChart';
import {
  getAnomalyHistoryWording,
  NUM_CELLS,
  getHCTitle,
  getCategoryFieldOptions,
  getMultiCategoryFilters,
  AnomalyHeatmapSortType,
  getAllEntityCombos,
} from '../../AnomalyCharts/utils/anomalyChartUtils';
import { darkModeEnabled } from '../../../utils/opensearchDashboardsUtils';
import {
  EntityAnomalySummaries,
  Entity,
} from '../../../../server/models/interfaces';
import { CoreStart } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';

interface AnomalyHistoryProps {
  detector: Detector;
  monitor: Monitor | undefined;
  isFeatureDataMissing?: boolean;
  isHistorical?: boolean;
  taskId?: string;
  isNotSample?: boolean;
  openOutOfRangeModal?(): void;
}

const useAsyncRef = (value: any) => {
  const ref = useRef(value);
  ref.current = value;
  return ref;
};

export const AnomalyHistory = (props: AnomalyHistoryProps) => {
  const dispatch = useDispatch();
  const core = React.useContext(CoreServicesContext) as CoreStart;

  const taskId = useAsyncRef(props.taskId);

  const [isLoading, setIsLoading] = useState(false);
  const initialStartDate =
    props.isHistorical && props.detector?.detectionDateRange
      ? props.detector.detectionDateRange.startTime
      : moment().subtract(7, 'days').valueOf();
  const initialEndDate =
    props.isHistorical && props.detector?.detectionDateRange
      ? props.detector.detectionDateRange.endTime
      : moment().valueOf();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: initialStartDate,
    endDate: initialEndDate,
  });
  const [zoomRange, setZoomRange] = useState<DateRange>({
    startDate: initialStartDate,
    endDate: initialEndDate,
  });
  const [selectedTabId, setSelectedTabId] = useState<string>(
    ANOMALY_HISTORY_TABS.ANOMALY_OCCURRENCE
  );
  const [isLoadingAnomalyResults, setIsLoadingAnomalyResults] = useState<
    boolean
  >(false);
  const [bucketizedAnomalyResults, setBucketizedAnomalyResults] = useState<
    Anomalies[]
  >();
  const [pureAnomalies, setPureAnomalies] = useState<AnomalyData[][]>([]);
  const [bucketizedAnomalySummary, setBucketizedAnomalySummary] = useState<
    AnomalySummary
  >(INITIAL_ANOMALY_SUMMARY);

  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<HeatmapCell>();

  const [entityAnomalySummaries, setEntityAnomalySummaries] = useState<
    EntityAnomalySummaries[]
  >();

  const [heatmapDisplayOption, setHeatmapDisplayOption] = useState<
    HeatmapDisplayOption
  >(INITIAL_HEATMAP_DISPLAY_OPTION);

  const [childEntityCombos, setChildEntityCombos] = useState<Entity[][]>([]);

  const [selectedChildEntities, setSelectedChildEntities] = useState<
    EntityOptionsMap
  >({});

  // The selected anomaly results as an array of Anomalies, where each entry
  // is its own time series, containing anomaly results and feature results
  // We need to be able to store multiple, in the case of a user selecting a single
  // category field, and then selecting multiple child category fields,
  // resulting in multiple time series & sets of results
  // const [selectedAnomalyResults, setSelectedAnomalyResults] = useState<
  //   Anomalies[]
  // >([]);

  const detectorCategoryField = get(props.detector, 'categoryField', []);
  const isHCDetector = !isEmpty(detectorCategoryField);
  const isMultiCategory = detectorCategoryField.length > 1;
  const detectorId = get(props.detector, 'id', '');
  const backgroundColor = darkModeEnabled() ? '#29017' : '#F7F7F7';
  const resultIndex = get(props, 'detector.resultIndex', '');

  const [selectedCategoryFields, setSelectedCategoryFields] = useState(
    getCategoryFieldOptions(detectorCategoryField)
  );

  const handleCategoryFieldsChange = (selectedCategoryFieldOptions: any[]) => {
    // if clearing: default to all category fields
    if (isEmpty(selectedCategoryFieldOptions)) {
      setSelectedCategoryFields(getCategoryFieldOptions(detectorCategoryField));
    } else {
      setSelectedCategoryFields(selectedCategoryFieldOptions);
    }
  };

  // We load at most 10k AD result data points for one call. If user choose
  // a big time range which may have more than 10k AD results, will use bucket
  // aggregation to load data points in whole time range with larger interval.
  // If entity is specified, we only query AD result data points for this entity.
  async function getBucketizedAnomalyResults(
    entityLists: Entity[][] | undefined = undefined,
    modelId?: string
  ) {
    try {
      setIsLoadingAnomalyResults(true);

      // First, get all anomaly summaries, aggregate into a single anomaly summary
      //@ts-ignore
      const anomalySummaryPromises = entityLists.map(
        async (entityList: Entity[]) => {
          const params = getAnomalySummaryQuery(
            dateRange.startDate,
            dateRange.endDate,
            props.detector.id,
            entityList,
            props.isHistorical,
            taskId.current,
            modelId
          );
          return dispatch(searchResults(params, resultIndex));
        }
      );

      const allAnomalySummaryResponses = await Promise.all(
        anomalySummaryPromises
      ).catch((error) => {
        const errorMessage = `Error getting all anomaly summaries for all entities: ${error}`;
        console.error(errorMessage);
        core.notifications.toasts.addDanger(prettifyErrorMessage(errorMessage));
      });

      let allAnomalySummaries = [] as AnomalySummary[];
      let allPureAnomalies = [] as AnomalyData[][];
      //@ts-ignore
      allAnomalySummaryResponses.forEach((anomalySummaryResponse) => {
        allAnomalySummaries.push(parseAnomalySummary(anomalySummaryResponse));
        allPureAnomalies.push(parsePureAnomalies(anomalySummaryResponse));
      });

      // TODO: add helper fn to iterate through all anomaly summaries,
      // and return some aggregate anomaly summary that has correct global vals for avg/max grade, etc.
      // For now just setting the summary as the first one in the list
      const aggregateAnomalySummary = get(allAnomalySummaries, '0', undefined);

      setPureAnomalies(allPureAnomalies);
      setBucketizedAnomalySummary(aggregateAnomalySummary);

      // Next, get all bucketized anomaly results - one for each entity list
      //@ts-ignore
      const bucketizedAnomalyResultPromises = entityLists.map(
        async (entityList: Entity[]) => {
          const params = getBucketizedAnomalyResultsQuery(
            dateRange.startDate,
            dateRange.endDate,
            props.detector.id,
            entityList,
            props.isHistorical,
            taskId.current,
            modelId
          );
          return dispatch(searchResults(params, resultIndex));
        }
      );

      const allBucketizedAnomalyResultResponses = await Promise.all(
        bucketizedAnomalyResultPromises
      ).catch((error) => {
        const errorMessage = `Error getting bucketized anomaly results for all entities: ${error}`;
        console.error(errorMessage);
        core.notifications.toasts.addDanger(prettifyErrorMessage(errorMessage));
      });

      let allBucketizedAnomalyResults = [] as Anomalies[];
      //@ts-ignore
      allBucketizedAnomalyResultResponses.forEach(
        (bucketizedAnomalyResultResponse: any) => {
          allBucketizedAnomalyResults.push(
            parseBucketizedAnomalyResults(bucketizedAnomalyResultResponse)
          );
        }
      );

      setBucketizedAnomalyResults(allBucketizedAnomalyResults);
    } catch (err) {
      console.error(
        `Failed to get anomaly results for ${props.detector?.id}`,
        err
      );
    } finally {
      setIsLoadingAnomalyResults(false);
    }
  }

  useEffect(() => {
    fetchRawAnomalyResults(isHCDetector);

    if (
      !isHCDetector &&
      isDateRangeOversize(dateRange, detectorInterval, MAX_ANOMALIES)
    ) {
      getBucketizedAnomalyResults();
    } else {
      setBucketizedAnomalyResults(undefined);
    }
  }, [dateRange, props.detector]);

  const detectorInterval = get(
    props.detector,
    'detectionInterval.period.interval',
    1
  );
  const isDateRangeOversize = (
    dateRange: DateRange,
    intervalInMinute: number,
    maxSize: number
  ) => {
    return (
      dateRange.endDate - dateRange.startDate >
      intervalInMinute * MIN_IN_MILLI_SECS * maxSize
    );
  };

  const fetchRawAnomalyResults = async (showLoading: boolean) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const params = buildParamsForGetAnomalyResultsWithDateRange(
        dateRange.startDate -
          // for non HC detector, rawData is used for feature missing check
          // which needs window offset for time range.
          // But it is not needed for HC detector
          (isHCDetector
            ? 0
            : FEATURE_DATA_CHECK_WINDOW_OFFSET *
              detectorInterval *
              MIN_IN_MILLI_SECS),
        dateRange.endDate,
        // get anomaly only data if HC detector
        isHCDetector
      );
      const detectorResultResponse = props.isHistorical
        ? await dispatch(
            getDetectorResults(taskId.current || '', params, true, resultIndex)
          )
        : await dispatch(
            getDetectorResults(props.detector.id, params, false, resultIndex)
          );
      const rawAnomaliesData = get(detectorResultResponse, 'response', []);
      const rawAnomaliesResult = {
        anomalies: get(rawAnomaliesData, 'results', []),
        featureData: get(rawAnomaliesData, 'featureResults', []),
      } as Anomalies;
      setAtomicAnomalyResults([rawAnomaliesResult]);
      if (isHCDetector) {
        setHCDetectorAnomalyResults([rawAnomaliesResult]);
      } else {
        setRawAnomalyResults([rawAnomaliesResult]);
      }
    } catch (err) {
      console.error(
        `Failed to get atomic anomaly results for ${props.detector.id}`,
        err
      );
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // For any change, we will want to clear any selected heatmap cell to clear any populated charts / graphs
    setSelectedHeatmapCell(undefined);
    fetchHCAnomalySummaries();
  }, [selectedCategoryFields]);

  useEffect(() => {
    if (isHCDetector) {
      fetchHCAnomalySummaries();
    }
  }, [dateRange, heatmapDisplayOption]);

  useEffect(() => {
    if (selectedHeatmapCell) {
      // If subset: only get the possible entity pairs. Set them in some state variable
      // If not a subset: fetch data like normal / before
      if (
        isMultiCategory &&
        get(selectedCategoryFields, 'length', 0) <
          get(detectorCategoryField, 'length', 0)
      ) {
        fetchTopEntityCombinations(selectedHeatmapCell);
      } else {
        fetchEntityAnomalyData(selectedHeatmapCell.dateRange, [
          selectedHeatmapCell.entityList,
        ]);
      }
      handleZoomChange(
        selectedHeatmapCell.dateRange.startDate,
        selectedHeatmapCell.dateRange.endDate
      );
    } else {
      setAtomicAnomalyResults(hcDetectorAnomalyResults);
    }
  }, [selectedHeatmapCell]);

  // Getting the latest sets of time series based on the selected parent + child entities
  useEffect(() => {
    if (selectedHeatmapCell) {
      // Get a list of entity lists, where each list represents a unique entity combination of
      // all parent + child entities (a single model). And, for each one of these lists, fetch the time series data.
      const entityCombosToFetch = getAllEntityCombos(
        get(selectedHeatmapCell, 'entityList', []),
        selectedChildEntities
      );

      console.log(
        'child entities changed. fetching results for entity combos: ',
        entityCombosToFetch
      );
      fetchEntityAnomalyData(
        selectedHeatmapCell.dateRange,
        entityCombosToFetch
      );
    }
  }, [selectedChildEntities]);

  const fetchHCAnomalySummaries = async () => {
    setIsLoadingAnomalyResults(true);

    // Only call the new multi-category filtering API when a subset of category fields is requested.
    // If getting results when all category fields are selected (at a per-model granulariy),
    // it is cheaper to continue with the terms aggregation on model ID, rather than call the new API,
    // which will run the composite query and multiple terms aggregation using runtime fields under the hood.
    let topEntityAnomalySummaries = [] as EntityAnomalySummaries[];
    if (
      isMultiCategory &&
      get(selectedCategoryFields, 'length', 0) <
        get(detectorCategoryField, 'length', 0)
    ) {
      const query = {
        category_field: selectedCategoryFields.map(
          (categoryFieldOption: any) => categoryFieldOption.label
        ),
        order: get(
          heatmapDisplayOption,
          'sortType',
          AnomalyHeatmapSortType.SEVERITY
        ),
        size: get(heatmapDisplayOption, 'entityOption.value', 10),
        start_time_ms: dateRange.startDate,
        end_time_ms: dateRange.endDate,
      };
      const result = await dispatch(
        getTopAnomalyResults(
          detectorId,
          get(props, 'isHistorical', false),
          query
        )
      );
      topEntityAnomalySummaries = parseAggTopEntityAnomalySummaryResults(
        result
      );
    } else {
      const query = getTopAnomalousEntitiesQuery(
        dateRange.startDate,
        dateRange.endDate,
        props.detector.id,
        heatmapDisplayOption.entityOption.value,
        heatmapDisplayOption.sortType,
        isMultiCategory,
        props.isHistorical,
        taskId.current
      );
      const result = await dispatch(searchResults(query, resultIndex));
      topEntityAnomalySummaries = parseTopEntityAnomalySummaryResults(
        result,
        isMultiCategory
      );
    }

    const promises = topEntityAnomalySummaries.map(
      async (summary: EntityAnomalySummaries) => {
        const entityResultQuery = getEntityAnomalySummariesQuery(
          dateRange.startDate,
          dateRange.endDate,
          props.detector.id,
          NUM_CELLS,
          summary.entityList,
          summary.modelId,
          props.isHistorical,
          taskId.current
        );
        return dispatch(searchResults(entityResultQuery, resultIndex));
      }
    );

    const allEntityAnomalySummaries = await Promise.all(promises).catch(
      (error) => {
        const errorMessage = `Error getting anomaly summaries for all entities: ${error}`;
        console.error(errorMessage);
        core.notifications.toasts.addDanger(prettifyErrorMessage(errorMessage));
      }
    );
    const entitiesAnomalySummaries = [] as EntityAnomalySummaries[];

    if (!isEmpty(allEntityAnomalySummaries)) {
      const entityLists = topEntityAnomalySummaries.map(
        (summary) => summary.entityList
      );
      //@ts-ignore
      allEntityAnomalySummaries.forEach((entityResponse, i) => {
        const entityAnomalySummariesResult = parseEntityAnomalySummaryResults(
          entityResponse,
          entityLists[i]
        );
        entitiesAnomalySummaries.push(entityAnomalySummariesResult);
      });
    }

    setEntityAnomalySummaries(entitiesAnomalySummaries);
    setIsLoadingAnomalyResults(false);
  };

  const fetchEntityAnomalyData = async (
    dateRange: DateRange,
    entityLists: Entity[][]
  ) => {
    setIsLoadingAnomalyResults(true);
    try {
      if (isDateRangeOversize(dateRange, detectorInterval, MAX_ANOMALIES)) {
        fetchBucketizedEntityAnomalyData(entityLists);
      } else {
        fetchAllEntityAnomalyData(dateRange, entityLists);
        setBucketizedAnomalyResults(undefined);
      }
    } catch (err) {
      console.error(
        `Failed to get anomaly results for the following entities: ${entityLists.forEach(
          (entityList: Entity[]) => {
            convertToEntityString(entityList, ', ');
          }
        )}`,
        err
      );
    } finally {
      setIsLoadingAnomalyResults(false);
    }
  };

  const fetchAllEntityAnomalyData = async (
    dateRange: DateRange,
    entityLists: Entity[][]
  ) => {
    const promises = entityLists.map(async (entityList: Entity[]) => {
      const params = buildParamsForGetAnomalyResultsWithDateRange(
        dateRange.startDate,
        dateRange.endDate,
        false,
        entityList
      );
      return dispatch(
        getDetectorResults(
          props.isHistorical ? taskId.current : props.detector?.id,
          params,
          props.isHistorical ? true : false
        )
      );
    });

    const allAnomalyResultResponses = await Promise.all(promises).catch(
      (error) => {
        const errorMessage = `Error getting all anomaly results for all entities: ${error}`;
        console.error(errorMessage);
        core.notifications.toasts.addDanger(prettifyErrorMessage(errorMessage));
      }
    );

    let anomalyResults = [] as Anomalies[];
    //@ts-ignore
    allAnomalyResultResponses.forEach((anomalyResultResponse: any) => {
      const anomalyData = get(anomalyResultResponse, 'response', []);
      const entityAnomaliesResult = {
        anomalies: get(anomalyData, 'results', []),
        featureData: get(anomalyData, 'featureResults', []),
      } as Anomalies;
      anomalyResults.push(entityAnomaliesResult);
    });
    setAtomicAnomalyResults(anomalyResults);
  };

  const fetchBucketizedEntityAnomalyData = async (entityLists: Entity[][]) => {
    getBucketizedAnomalyResults(entityLists);
  };
  const [atomicAnomalyResults, setAtomicAnomalyResults] = useState<
    Anomalies[]
  >();
  const [rawAnomalyResults, setRawAnomalyResults] = useState<Anomalies[]>([]);
  const [hcDetectorAnomalyResults, setHCDetectorAnomalyResults] = useState<
    Anomalies[]
  >([]);

  const anomalyResults = bucketizedAnomalyResults
    ? bucketizedAnomalyResults
    : atomicAnomalyResults;
  const handleDateRangeChange = useCallback(
    (startDate: number, endDate: number) => {
      if (
        !props.isHistorical &&
        startDate < get(props, 'detector.enabledTime') &&
        props.openOutOfRangeModal
      ) {
        props.openOutOfRangeModal();
      }
      setDateRange({
        startDate: startDate,
        endDate: endDate,
      });
      if (isHCDetector) {
        setSelectedHeatmapCell(undefined);
      }
    },
    []
  );

  const fetchTopEntityCombinations = async (heatmapCell: HeatmapCell) => {
    const query = getTopAnomalousEntitiesQuery(
      heatmapCell.dateRange.startDate,
      heatmapCell.dateRange.endDate,
      props.detector.id,
      DEFAULT_TOP_CHILD_ENTITIES_TO_FETCH,
      heatmapDisplayOption.sortType,
      isMultiCategory,
      props.isHistorical,
      taskId.current,
      heatmapCell.entityList
    );
    const result = await dispatch(searchResults(query));

    // Gets top child entities as an Entity[][],
    // where each entry in the array is a unique combination of entity values
    const topChildEntityCombos = parseTopChildEntityCombos(
      result,
      heatmapCell.entityList
    );
    setChildEntityCombos(topChildEntityCombos);

    const parentEntityFields = heatmapCell.entityList.map(
      (entity: Entity) => entity.name
    );
    const childCategoryFields = detectorCategoryField.filter(
      (categoryField: string) => !parentEntityFields.includes(categoryField)
    );

    // Setting up the selected child entities map. Default to selecting the single
    // top entity for each child category field.
    const selectedChildEntitiesMap = {} as EntityOptionsMap;
    childCategoryFields.forEach((childCategoryField: string) => {
      selectedChildEntitiesMap[childCategoryField] = [];
    });
    if (!isEmpty(topChildEntityCombos)) {
      const topChildEntityCombo = topChildEntityCombos[0];
      topChildEntityCombo.forEach((childEntity: Entity) => {
        selectedChildEntitiesMap[childEntity.name] = [
          {
            label: childEntity.value,
          },
        ];
      });
    }
    setSelectedChildEntities(selectedChildEntitiesMap);
  };

  const handleChildEntitiesOptionChanged = (
    childCategoryField: string,
    options: EntityOption[]
  ) => {
    setSelectedChildEntities({
      ...selectedChildEntities,
      [childCategoryField]: options,
    });
  };

  const handleZoomChange = useCallback((startDate: number, endDate: number) => {
    setZoomRange({
      startDate: startDate,
      endDate: endDate,
    });
  }, []);

  const handleHeatmapCellSelected = useCallback((heatmapCell: HeatmapCell) => {
    setSelectedHeatmapCell(heatmapCell);
  }, []);

  const handleHeatmapDisplayOptionChanged = useCallback(
    (option: HeatmapDisplayOption) => {
      setHeatmapDisplayOption(option);
    },
    []
  );

  const annotations = anomalyResults
    ? get(anomalyResults, 'anomalies', [])
        //@ts-ignore
        .filter((anomaly: AnomalyData) => anomaly.anomalyGrade > 0)
        .map((anomaly: AnomalyData) => ({
          coordinates: {
            x0: anomaly.startTime,
            x1: anomaly.endTime,
          },
          details: `There is an anomaly with confidence ${
            anomaly.confidence
          } between ${minuteDateFormatter(
            anomaly.startTime
          )} and ${minuteDateFormatter(anomaly.endTime)}`,
          entity: get(anomaly, 'entity', []),
        }))
    : [];

  const tabs = [
    {
      id: ANOMALY_HISTORY_TABS.ANOMALY_OCCURRENCE,
      name: 'Anomaly occurrences',
      disabled: false,
    },
    {
      id: ANOMALY_HISTORY_TABS.FEATURE_BREAKDOWN,
      name: 'Feature breakdown',
      disabled: false,
    },
  ];

  const onSelectedTabChanged = (tabId: string) => {
    setSelectedTabId(tabId);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <Fragment>
      <AnomaliesChart
        title={getAnomalyHistoryWording(true, props.isHistorical)}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onZoomRangeChange={handleZoomChange}
        bucketizedAnomalies={bucketizedAnomalyResults !== undefined}
        anomalySummary={bucketizedAnomalySummary}
        isLoading={isLoading || isLoadingAnomalyResults}
        showAlerts={props.isHistorical ? false : true}
        isNotSample={props.isNotSample}
        detector={props.detector}
        monitor={props.monitor}
        isHCDetector={isHCDetector}
        isHistorical={props.isHistorical}
        detectorCategoryField={detectorCategoryField}
        onHeatmapCellSelected={handleHeatmapCellSelected}
        selectedHeatmapCell={selectedHeatmapCell}
        // TODO: change to handle multi results
        anomaliesResult={get(anomalyResults, '0', [])}
        onDisplayOptionChanged={handleHeatmapDisplayOptionChanged}
        heatmapDisplayOption={heatmapDisplayOption}
        entityAnomalySummaries={entityAnomalySummaries}
        selectedCategoryFields={selectedCategoryFields}
        handleCategoryFieldsChange={handleCategoryFieldsChange}
      >
        <div style={{ padding: '20px' }}>
          {isHCDetector
            ? [
                <AnomalyOccurrenceChart
                  title={
                    selectedHeatmapCell
                      ? // if a subset of category fields is selected for multi-HC detectors: show combo box to select
                        // individual entity combos / times series
                        isMultiCategory &&
                        get(selectedCategoryFields, 'length', 0) <
                          get(detectorCategoryField, 'length', 0)
                        ? getMultiCategoryFilters(
                            selectedHeatmapCell.entityList,
                            childEntityCombos,
                            detectorCategoryField,
                            selectedChildEntities,
                            handleChildEntitiesOptionChanged
                          )
                        : getHCTitle(selectedHeatmapCell.entityList)
                      : '-'
                  }
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  onZoomRangeChange={handleZoomChange}
                  // TODO: change to handle multi results
                  anomalies={
                    anomalyResults ? get(anomalyResults, '0.anomalies', []) : []
                  }
                  bucketizedAnomalies={bucketizedAnomalyResults !== undefined}
                  anomalySummary={bucketizedAnomalySummary}
                  isLoading={isLoading || isLoadingAnomalyResults}
                  anomalyGradeSeriesName="Anomaly grade"
                  confidenceSeriesName="Confidence"
                  showAlerts={true}
                  isNotSample={true}
                  detector={props.detector}
                  monitor={props.monitor}
                  isHCDetector={isHCDetector}
                  isHistorical={props.isHistorical}
                  selectedHeatmapCell={selectedHeatmapCell}
                />,
                <EuiSpacer size="m" />,
              ]
            : null}
          <EuiTabs>{renderTabs()}</EuiTabs>

          {isLoading || isLoadingAnomalyResults ? (
            <EuiFlexGroup
              justifyContent="spaceAround"
              style={{ height: '500px', paddingTop: '100px' }}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <div style={{ backgroundColor: backgroundColor }}>
              <EuiPanel
                title=""
                style={{ padding: '20px', backgroundColor: backgroundColor }}
              >
                {selectedTabId === ANOMALY_HISTORY_TABS.FEATURE_BREAKDOWN ? (
                  <FeatureBreakDown
                    detector={props.detector}
                    // TODO: change to handle multi results
                    anomaliesResult={get(anomalyResults, '0', [])}
                    // TODO: change to handle multi results
                    rawAnomalyResults={get(rawAnomalyResults, '0', [])}
                    annotations={annotations}
                    isLoading={isLoading}
                    dateRange={zoomRange}
                    featureDataSeriesName="Feature output"
                    showFeatureMissingDataPointAnnotation={
                      props.detector.enabled &&
                      // disable showing missing feature alert when it is HC Detector
                      !isHCDetector
                    }
                    isFeatureDataMissing={props.isFeatureDataMissing}
                    isHCDetector={isHCDetector}
                    selectedHeatmapCell={selectedHeatmapCell}
                  />
                ) : (
                  <AnomalyResultsTable
                    anomalies={
                      bucketizedAnomalyResults === undefined
                        ? anomalyResults
                          ? filterWithDateRange(
                              // TODO: change to handle multi results
                              get(anomalyResults, '0.anomalies', []),
                              zoomRange,
                              'plotTime'
                            )
                          : []
                        : pureAnomalies
                    }
                    isHCDetector={isHCDetector}
                    isHistorical={props.isHistorical}
                    selectedHeatmapCell={selectedHeatmapCell}
                  />
                )}
              </EuiPanel>
            </div>
          )}
        </div>
      </AnomaliesChart>
    </Fragment>
  );
};
