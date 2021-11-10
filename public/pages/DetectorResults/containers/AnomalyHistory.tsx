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

import React, {
  useState,
  useEffect,
  useCallback,
  Fragment,
  useRef,
} from 'react';

import { isEmpty, get, stubTrue } from 'lodash';
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
  Anomalies,
  EntityOptionsMap,
  EntityOption,
} from '../../../models/interfaces';
import {
  filterAnomaliesWithDateRange,
  getAnomalySummaryQuery,
  getBucketizedAnomalyResultsQuery,
  parseBucketizedAnomalyResults,
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
  flattenData,
} from '../../utils/anomalyResultUtils';
import { AnomalyResultsTable } from './AnomalyResultsTable';
import { AnomaliesChart } from '../../AnomalyCharts/containers/AnomaliesChart';
import { FeatureBreakDown } from '../../AnomalyCharts/containers/FeatureBreakDown';
import { minuteDateFormatter } from '../../utils/helpers';
import {
  ANOMALY_HISTORY_TABS,
  MAX_TIME_SERIES_TO_DISPLAY,
  TOP_CHILD_ENTITIES_TO_FETCH,
} from '../utils/constants';
import { MIN_IN_MILLI_SECS } from '../../../../server/utils/constants';
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
  getAnomalySummary,
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
  const [isLoadingAnomalyResults, setIsLoadingAnomalyResults] =
    useState<boolean>(false);
  const [bucketizedAnomalyResults, setBucketizedAnomalyResults] =
    useState<Anomalies[]>();

  // Used for storing the raw anomaly data in the bucketized scenario, where we
  // only show a bucketized view of results in the chart, but use the pure
  // anomalies to derive the correct anomaly summary and populate the results table with.
  const [pureAnomalies, setPureAnomalies] = useState<AnomalyData[][]>([]);

  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<HeatmapCell>();

  // Array of summaries, used to populate each cell in the heatmap chart.
  // Each summary is a separate list of summaries for one unique model / entity combo.
  const [entityAnomalySummaries, setEntityAnomalySummaries] =
    useState<EntityAnomalySummaries[]>();

  const [heatmapDisplayOption, setHeatmapDisplayOption] =
    useState<HeatmapDisplayOption>(INITIAL_HEATMAP_DISPLAY_OPTION);

  // The top child entity combinations when filtering by a subset of category fields &
  // selecting a parent entity combination.
  const [childEntityCombos, setChildEntityCombos] = useState<Entity[][]>([]);

  // Map to keep track of the selected child entities. The key is a child category field,
  // and the value is an array of selected entities.
  const [selectedChildEntities, setSelectedChildEntities] =
    useState<EntityOptionsMap>({});

  const detectorCategoryField = get(props.detector, 'categoryField', []);
  const isHCDetector = !isEmpty(detectorCategoryField);
  const isMultiCategory = detectorCategoryField.length > 1;
  const detectorId = get(props.detector, 'id', '');
  const backgroundColor = darkModeEnabled() ? '#29017' : '#F7F7F7';
  const resultIndex = get(props, 'detector.resultIndex', '');

  // Tracking which parent category fields the user has selected to filter by.
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

      let allPureAnomalies = [] as AnomalyData[][];
      let allBucketizedAnomalyResults = [] as Anomalies[];

      // If entityLists exists: then fetch results for each set of entity lists. There may be
      // multiple if the user has selected multiple entities to view.
      if (!isEmpty(entityLists)) {
        // First, get all anomaly summaries, aggregate into a single anomaly summary
        const anomalySummaryPromises =
          entityLists !== undefined
            ? entityLists.map(async (entityList: Entity[]) => {
                const params = getAnomalySummaryQuery(
                  dateRange.startDate,
                  dateRange.endDate,
                  props.detector.id,
                  entityList,
                  props.isHistorical,
                  taskId.current,
                  modelId
                );
                return dispatch(searchResults(params, resultIndex, true));
              })
            : [];

        const allAnomalySummaryResponses = await Promise.all(
          anomalySummaryPromises
        ).catch((error) => {
          const errorMessage = `Error getting all anomaly summaries for all entities: ${error}`;
          console.error(errorMessage);
          core.notifications.toasts.addDanger(
            prettifyErrorMessage(errorMessage)
          );
        });

        //@ts-ignore
        allAnomalySummaryResponses.forEach((anomalySummaryResponse) => {
          allPureAnomalies.push(parsePureAnomalies(anomalySummaryResponse));
        });
      } else if (!isHCDetector) {
        const anomalySummaryQuery = getAnomalySummaryQuery(
          dateRange.startDate,
          dateRange.endDate,
          props.detector.id,
          undefined,
          props.isHistorical,
          taskId.current,
          modelId
        );
        const anomalySummaryResponse = await dispatch(
          searchResults(anomalySummaryQuery, resultIndex, true)
        );
        allPureAnomalies.push(parsePureAnomalies(anomalySummaryResponse));
      }

      setPureAnomalies(allPureAnomalies);

      // If entityLists exists: then fetch results for each set of entity lists. There may be
      // multiple if the user has selected multiple entities to view.
      if (!isEmpty(entityLists)) {
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
            return dispatch(searchResults(params, resultIndex, true));
          }
        );

        const allBucketizedAnomalyResultResponses = await Promise.all(
          bucketizedAnomalyResultPromises
        ).catch((error) => {
          const errorMessage = `Error getting bucketized anomaly results for all entities: ${error}`;
          console.error(errorMessage);
          core.notifications.toasts.addDanger(
            prettifyErrorMessage(errorMessage)
          );
        });

        //@ts-ignore
        allBucketizedAnomalyResultResponses.forEach(
          (bucketizedAnomalyResultResponse: any) => {
            allBucketizedAnomalyResults.push(
              parseBucketizedAnomalyResults(bucketizedAnomalyResultResponse)
            );
          }
        );
      } else if (!isHCDetector) {
        const bucketizedAnomalyResultsQuery = getBucketizedAnomalyResultsQuery(
          dateRange.startDate,
          dateRange.endDate,
          props.detector.id,
          undefined,
          props.isHistorical,
          taskId.current,
          modelId
        );
        const bucketizedAnomalyResultResponse = await dispatch(
          searchResults(bucketizedAnomalyResultsQuery, resultIndex, true)
        );
        allBucketizedAnomalyResults.push(
          parseBucketizedAnomalyResults(bucketizedAnomalyResultResponse)
        );
      }

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

  // Custom hook if the user zooms in on bucketized results, where the range
  // is now less than the bucket threshold, where raw results can be fetched now
  useEffect(() => {
    if (
      !isEmpty(bucketizedAnomalyResults) &&
      !isDateRangeOversize(zoomRange, detectorInterval, MAX_ANOMALIES)
    ) {
      setBucketizedAnomalyResults(undefined);
      if (isHCDetector && selectedHeatmapCell) {
        if (
          isMultiCategory &&
          get(selectedCategoryFields, 'length', 0) <
            get(detectorCategoryField, 'length', 0)
        ) {
          // Get top child entities if a subset of category fields are selected
          const entityCombosToFetch = getAllEntityCombos(
            get(selectedHeatmapCell, 'entityList', []),
            selectedChildEntities
          );
          fetchEntityAnomalyData(zoomRange, entityCombosToFetch);
        } else {
          fetchEntityAnomalyData(zoomRange, [selectedHeatmapCell.entityList]);
        }
      } else {
        fetchRawAnomalyResults(isHCDetector);
      }
    }
  }, [zoomRange]);

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
            getDetectorResults(
              taskId.current || '',
              params,
              true,
              resultIndex,
              true
            )
          )
        : await dispatch(
            getDetectorResults(
              props.detector.id,
              params,
              false,
              resultIndex,
              true
            )
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
      // After fetching raw results, re-fetch the latest HC anomaly summaries, if applicable.
      // Also clear any selected heatmap cell data in all of the child charts,
      // in case a user selected one while the job was still running.
      if (isHCDetector) {
        setSelectedHeatmapCell(undefined);
        fetchHCAnomalySummaries();
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
      if (
        isMultiCategory &&
        get(selectedCategoryFields, 'length', 0) <
          get(detectorCategoryField, 'length', 0)
      ) {
        // Get top child entities if a subset of category fields are selected
        fetchTopChildEntityCombinations(selectedHeatmapCell);
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
      fetchEntityAnomalyData(zoomRange, entityCombosToFetch);
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
      topEntityAnomalySummaries =
        parseAggTopEntityAnomalySummaryResults(result);
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
      const result = await dispatch(searchResults(query, resultIndex, true));
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
        return dispatch(searchResults(entityResultQuery, resultIndex, true));
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
          props.isHistorical ? true : false,
          resultIndex,
          true
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
  const [atomicAnomalyResults, setAtomicAnomalyResults] =
    useState<Anomalies[]>();
  const [rawAnomalyResults, setRawAnomalyResults] = useState<Anomalies[]>([]);
  const [hcDetectorAnomalyResults, setHCDetectorAnomalyResults] = useState<
    Anomalies[]
  >([]);

  const anomalyAndFeatureResults = bucketizedAnomalyResults
    ? bucketizedAnomalyResults
    : atomicAnomalyResults;

  let anomalyResults = [] as AnomalyData[][];
  if (anomalyAndFeatureResults !== undefined) {
    anomalyAndFeatureResults.forEach((anomalyAndFeatureResult: Anomalies) => {
      anomalyResults.push(anomalyAndFeatureResult.anomalies);
    });
  }
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

  // Fetches the top child entity combinations, in the case the user selects a subset of category
  // fields to filter on, and wants to get the top child entities for some unselected child category
  // field. Note that the heatmap cell only contains the prefiltered / parent entities.
  const fetchTopChildEntityCombinations = async (heatmapCell: HeatmapCell) => {
    const query = getTopAnomalousEntitiesQuery(
      heatmapCell.dateRange.startDate,
      heatmapCell.dateRange.endDate,
      props.detector.id,
      TOP_CHILD_ENTITIES_TO_FETCH,
      heatmapDisplayOption.sortType,
      isMultiCategory,
      props.isHistorical,
      taskId.current,
      heatmapCell.entityList
    );

    const result = await dispatch(searchResults(query, resultIndex, true));

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
    const tempSelectedChildEntities = {
      ...selectedChildEntities,
      [childCategoryField]: options,
    };

    const entityCombosToFetch = getAllEntityCombos(
      get(selectedHeatmapCell, 'entityList', []),
      tempSelectedChildEntities
    );

    // Limit the number of entities to display on the charts at once
    if (entityCombosToFetch.length > MAX_TIME_SERIES_TO_DISPLAY) {
      core.notifications.toasts.addWarning(
        `A maximum of ${MAX_TIME_SERIES_TO_DISPLAY} sets of results can be displayed at one time`
      );
    } else {
      setSelectedChildEntities(tempSelectedChildEntities);
    }
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

  // Deriving the anomaly summary based on the raw set of all anomalies
  const flattenedAnomalies =
    bucketizedAnomalyResults === undefined
      ? anomalyResults
        ? flattenData(
            filterAnomaliesWithDateRange(anomalyResults, zoomRange, 'plotTime')
          )
        : []
      : pureAnomalies
      ? flattenData(pureAnomalies)
      : [];
  const anomalySummary = getAnomalySummary(flattenedAnomalies);

  return (
    <Fragment>
      <AnomaliesChart
        title={getAnomalyHistoryWording(true, props.isHistorical)}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onZoomRangeChange={handleZoomChange}
        bucketizedAnomalies={bucketizedAnomalyResults !== undefined}
        anomalySummary={anomalySummary}
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
        anomalyAndFeatureResults={anomalyAndFeatureResults}
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
                            handleChildEntitiesOptionChanged,
                            get(
                              heatmapDisplayOption,
                              'sortType',
                              AnomalyHeatmapSortType.SEVERITY
                            )
                          )
                        : getHCTitle(selectedHeatmapCell.entityList)
                      : '-'
                  }
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  onZoomRangeChange={handleZoomChange}
                  anomalies={anomalyResults}
                  bucketizedAnomalies={bucketizedAnomalyResults !== undefined}
                  anomalySummary={anomalySummary}
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
                    //@ts-ignore
                    anomalyAndFeatureResults={anomalyAndFeatureResults}
                    rawAnomalyResults={rawAnomalyResults}
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
                    anomalies={flattenedAnomalies}
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
