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

import { get, isEmpty, orderBy } from 'lodash';
import moment from 'moment';
import { Dispatch } from 'redux';
import {
  EntityAnomalySummaries,
  EntityAnomalySummary,
  Entity,
} from '../../../server/models/interfaces';
import {
  AD_DOC_FIELDS,
  DOC_COUNT_FIELD,
  ENTITY_FIELD,
  ENTITY_VALUE_PATH_FIELD,
  KEY_FIELD,
  MIN_IN_MILLI_SECS,
  DAY_IN_MILLI_SECS,
  SORT_DIRECTION,
  WEEK_IN_MILLI_SECS,
  MODEL_ID_FIELD,
  ENTITY_LIST_FIELD,
  ENTITY_LIST_DELIMITER,
  HEATMAP_CELL_ENTITY_DELIMITER,
  HEATMAP_CALL_ENTITY_KEY_VALUE_DELIMITER,
  ENTITY_NAME_PATH_FIELD,
  MAX_ANOMALY_GRADE_FIELD,
} from '../../../server/utils/constants';
import { toFixedNumberForAnomaly } from '../../../server/utils/helpers';
import {
  Anomalies,
  AnomalyData,
  AnomalySummary,
  DateRange,
  Detector,
  FeatureAggregationData,
  FeatureAttributes,
  FeatureContributionData,
  MonitorAlert,
  toDuration,
} from '../../models/interfaces';
import { getDetectorLiveResults } from '../../redux/reducers/liveAnomalyResults';
import {
  MAX_ANOMALIES,
  MISSING_FEATURE_DATA_SEVERITY,
} from '../../utils/constants';
import {
  AnomalyHeatmapSortType,
  NUM_CELLS,
} from '../AnomalyCharts/utils/anomalyChartUtils';
import { DETECTOR_INIT_FAILURES } from '../DetectorDetail/utils/constants';
import {
  COUNT_ANOMALY_AGGS,
  ENTITY_DATE_BUCKET_ANOMALY_AGGS,
  MAX_ANOMALY_AGGS,
  MAX_ANOMALY_SORT_AGGS,
  TOP_ANOMALY_GRADE_SORT_AGGS,
  TOP_ENTITIES_FIELD,
  TOP_ENTITY_AGGS,
  ANOMALY_AGG,
  AGGREGATED_ANOMALIES,
  MIN_END_TIME,
  MAX_END_TIME,
} from './constants';
import { dateFormatter, minuteDateFormatter } from './helpers';
import { HeatmapCell } from '../AnomalyCharts/containers/AnomalyHeatmapChart';
import { Schedule, UNITS } from '../../models/interfaces';

export const getQueryParamsForLiveAnomalyResults = (
  detectionInterval: number,
  intervals: number
) => {
  const startTime = moment()
    .subtract(intervals * detectionInterval, 'minutes')
    .valueOf();
  const updatedParams = {
    from: 0,
    size: intervals,
    sortDirection: SORT_DIRECTION.DESC,
    sortField: AD_DOC_FIELDS.DATA_START_TIME,
    startTime: startTime.valueOf(),
    fieldName: AD_DOC_FIELDS.DATA_START_TIME,
  };
  return updatedParams;
};

export const getLiveAnomalyResults = (
  dispatch: Dispatch<any>,
  detectorId: string,
  detectionInterval: number,
  intervals: number,
  resultIndex: string,
  onlyQueryCustomResultIndex: boolean
) => {
  const queryParams = getQueryParamsForLiveAnomalyResults(
    detectionInterval,
    intervals
  );
  dispatch(
    getDetectorLiveResults(
      detectorId,
      queryParams,
      false,
      resultIndex,
      onlyQueryCustomResultIndex
    )
  );
};

export const buildParamsForGetAnomalyResultsWithDateRange = (
  startTime: number,
  endTime: number,
  anomalyOnly: boolean = false,
  entityList: Entity[] | undefined = undefined
) => {
  return {
    from: 0,
    size: MAX_ANOMALIES,
    sortDirection: SORT_DIRECTION.DESC,
    sortField: AD_DOC_FIELDS.DATA_START_TIME,
    startTime: startTime,
    endTime: endTime,
    fieldName: AD_DOC_FIELDS.DATA_START_TIME,
    anomalyThreshold: anomalyOnly ? 0 : -1,
    entityList: JSON.stringify(entityList),
  };
};

const MAX_DATA_POINTS = 1000;
const MAX_FEATURE_ANNOTATIONS = 100;

const calculateStep = (total: number): number => {
  return Math.ceil(total / MAX_DATA_POINTS);
};

export const calculateTimeWindowsWithMaxDataPoints = (
  maxDataPoints: number,
  dateRange: DateRange
): DateRange[] => {
  const resultSampleWindows = [] as DateRange[];
  const rangeInMilliSec = dateRange.endDate - dateRange.startDate;
  const shingleSizeinMilliSec = Math.max(
    Math.ceil(rangeInMilliSec / maxDataPoints),
    MIN_IN_MILLI_SECS
  );
  for (
    let currentTime = dateRange.startDate;
    currentTime < dateRange.endDate;
    currentTime += shingleSizeinMilliSec
  ) {
    resultSampleWindows.push({
      startDate: currentTime,
      endDate: Math.min(currentTime + shingleSizeinMilliSec, dateRange.endDate),
    } as DateRange);
  }
  return resultSampleWindows;
};

// If array size is 100K, `findAnomalyWithMaxAnomalyGrade`
// takes less than 2ms by average, while `Array#reduce`
// takes about 16ms by average and`Array#sort`
// takes about 3ms by average.
// If array size is 1M, `findAnomalyWithMaxAnomalyGrade`
// takes less than 6ms by average, while `Array#reduce`
// takes about 170ms by average and`Array#sort` takes about
//  80ms by average.
// Considering performance impact, will not change this
// method currently.
function findAnomalyWithMaxAnomalyGrade(anomalies: any[]) {
  let anomalyWithMaxGrade = anomalies[0];
  for (let i = 1, len = anomalies.length; i < len; i++) {
    let anomaly = anomalies[i];
    anomalyWithMaxGrade =
      anomaly.anomalyGrade > anomalyWithMaxGrade.anomalyGrade
        ? anomaly
        : anomalyWithMaxGrade;
  }
  return anomalyWithMaxGrade;
}

const sampleMaxAnomalyGrade = (anomalies: any[]): any[] => {
  const step = calculateStep(anomalies.length);
  let index = 0;
  const sampledAnomalies = [];
  while (index < anomalies.length) {
    const arr = anomalies.slice(index, index + step);
    sampledAnomalies.push(findAnomalyWithMaxAnomalyGrade(arr));
    index = index + step;
  }
  return sampledAnomalies;
};

export const prepareDataForLiveChart = (
  data: any[],
  dateRange: DateRange,
  interval: number
) => {
  if (!data || data.length === 0) {
    return [];
  }

  let anomalies = [];
  for (
    let time = dateRange.endDate;
    time > dateRange.startDate;
    time -= MIN_IN_MILLI_SECS * interval
  ) {
    anomalies.push({
      startTime: time,
      endTime: time,
      plotTime: time,
      confidence: null,
      anomalyGrade: null,
    });
  }

  anomalies.push({
    startTime: dateRange.startDate,
    endTime: dateRange.startDate,
    plotTime: dateRange.startDate,
    confidence: null,
    anomalyGrade: null,
  });
  return anomalies;
};

// Converts all anomaly results or feature aggregation results time series and filters out data
// that is out of range
export const prepareDataForChart = (data: any[][], dateRange: DateRange) => {
  let preparedData = [] as any[][];
  data.forEach((timeSeries: any[]) => {
    if (timeSeries && timeSeries.length > 0) {
      timeSeries = timeSeries.filter(
        (data: AnomalyData | FeatureAggregationData) =>
          data.plotTime >= dateRange.startDate &&
          data.plotTime <= dateRange.endDate
      );
      if (timeSeries.length > MAX_DATA_POINTS) {
        timeSeries = sampleMaxAnomalyGrade(timeSeries);
      }
    }
    return preparedData.push(timeSeries);
  });
  return preparedData;
};

// Generates a set of annotations for each anomaly result time series.
// One time series is a single AnomalyData[]. We pass an array of time series
// since multiple time series may need to be processed.
export const generateAnomalyAnnotations = (
  anomalies: AnomalyData[][]
): any[][] => {
  let annotations = [] as any[];
  anomalies.forEach((anomalyTimeSeries: AnomalyData[]) => {
    annotations.push(
      anomalyTimeSeries
        .filter((anomaly: AnomalyData) => anomaly.anomalyGrade > 0)
        .map((anomaly: AnomalyData) => ({
          coordinates: {
            x0: anomaly.startTime,
            x1: anomaly.endTime,
          },
          details: `There is an anomaly with confidence ${
            anomaly.confidence
          } between ${moment(anomaly.startTime).format(
            'MM/DD/YY h:mm A'
          )} and ${moment(anomaly.endTime).format('MM/DD/YY h:mm A')}`,
          entity: get(anomaly, 'entity', []),
        }))
    );
  });
  return annotations;
};

export const filterAnomaliesWithDateRange = (
  data: AnomalyData[][],
  dateRange: DateRange,
  timeField: string
) => {
  let filteredData = [] as AnomalyData[][];
  data.forEach((anomalySeries: AnomalyData[]) => {
    const filteredAnomalies = anomalySeries
      ? anomalySeries.filter((anomaly: AnomalyData) => {
          const time = get(anomaly, `${timeField}`);
          return (
            time && time >= dateRange.startDate && time <= dateRange.endDate
          );
        })
      : [];
    filteredData.push(filteredAnomalies);
  });
  return filteredData;
};

// Sample data retrieved from preview API will contain all sample results for all entities (if applicable).
// Filter by zoom range and entity list (if applicable).
export const filterSampleData = (
  sampleData: Anomalies,
  dateRange: DateRange,
  timeField: string,
  selectedHeatmapCell: HeatmapCell | undefined
) => {
  const isFilteringByHeatmapCell = selectedHeatmapCell !== undefined;
  const heatmapCellEntityList = get(selectedHeatmapCell, 'entityList', []);
  const sampleAnomalyResults = get(
    sampleData,
    'anomalies',
    []
  ) as AnomalyData[];
  const sampleFeatureResults = get(sampleData, 'featureData', {}) as {
    [key: string]: FeatureAggregationData[];
  };
  const sampleFeatureIds = Object.keys(sampleFeatureResults);
  const filteredAnomalyResults = [] as AnomalyData[];
  const filteredFeatureResults = {} as {
    [key: string]: FeatureAggregationData[];
  };
  // init the sample feature results map
  sampleFeatureIds.forEach((sampleFeatureId: string) => {
    filteredFeatureResults[sampleFeatureId] = [];
  });
  for (let i = 0; i < sampleAnomalyResults.length; i++) {
    const curAnomalyData = sampleAnomalyResults[i];
    const curEntityList = get(curAnomalyData, 'entity', []) as Entity[];
    if (
      isFilteringByHeatmapCell
        ? entityListsMatch(curEntityList, heatmapCellEntityList) &&
          get(curAnomalyData, 'plotTime', 0) >= dateRange.startDate &&
          get(curAnomalyData, 'plotTime', 0) <= dateRange.endDate
        : get(curAnomalyData, 'plotTime', 0) >= dateRange.startDate &&
          get(curAnomalyData, 'plotTime', 0) <= dateRange.endDate
    ) {
      filteredAnomalyResults.push(curAnomalyData);
      sampleFeatureIds.forEach((sampleFeatureId: string) => {
        filteredFeatureResults[sampleFeatureId].push(
          sampleFeatureResults[sampleFeatureId][i]
        );
      });
    }
  }
  return {
    anomalies: filteredAnomalyResults,
    featureData: filteredFeatureResults,
  } as Anomalies;
};

export const filterWithDateRange = (
  data: any[],
  dateRange: DateRange,
  timeField: string
) => {
  const filteredData = data
    ? data.filter((item) => {
        const time = get(item, `${timeField}`);
        return time && time >= dateRange.startDate && time <= dateRange.endDate;
      })
    : [];
  return filteredData;
};

export const RETURNED_AD_RESULT_FIELDS = [
  'data_start_time',
  'data_end_time',
  'anomaly_grade',
  'confidence',
  'feature_data',
  'entity',
  'relevant_attribution',
  'expected_values',
];

export const getAnomalySummaryQuery = (
  startTime: number,
  endTime: number,
  detectorId: string,
  entityList: Entity[] | undefined = undefined,
  isHistorical?: boolean,
  taskId?: string,
  modelId?: string
) => {
  const termField =
    isHistorical && taskId ? { task_id: taskId } : { detector_id: detectorId };
  let requestBody = {
    size: MAX_ANOMALIES,
    query: {
      bool: {
        filter: [
          {
            range: {
              data_end_time: {
                gte: startTime,
                lte: endTime,
              },
            },
          },
          {
            range: {
              anomaly_grade: {
                gt: 0,
              },
            },
          },
          {
            term: termField,
          },
        ],
      },
    },
    aggs: {
      count_anomalies: {
        value_count: {
          field: 'anomaly_grade',
        },
      },
      max_confidence: {
        max: {
          field: 'confidence',
        },
      },
      min_confidence: {
        min: {
          field: 'confidence',
        },
      },
      max_anomaly_grade: {
        max: {
          field: 'anomaly_grade',
        },
      },
      min_anomaly_grade: {
        min: {
          field: 'anomaly_grade',
        },
      },
      avg_anomaly_grade: {
        avg: {
          field: 'anomaly_grade',
        },
      },
      max_data_end_time: {
        max: {
          field: 'data_end_time',
        },
      },
    },
    _source: {
      includes: RETURNED_AD_RESULT_FIELDS,
    },
  };

  // If querying RT results: remove any results that include a task_id, as this indicates
  // a historical result from a historical task.
  if (!isHistorical) {
    requestBody.query.bool = {
      ...requestBody.query.bool,
      ...{
        must_not: {
          exists: {
            field: 'task_id',
          },
        },
      },
    };
  }

  // Add entity filters if this is a HC detector
  if (entityList !== undefined && entityList.length > 0) {
    requestBody = appendEntityFilters(requestBody, entityList);
  }
  return requestBody;
};

export const getBucketizedAnomalyResultsQuery = (
  startTime: number,
  endTime: number,
  detectorId: string,
  entityList: Entity[] | undefined = undefined,
  isHistorical?: boolean,
  taskId?: string,
  modelId?: string
) => {
  const termField =
    isHistorical && taskId ? { task_id: taskId } : { detector_id: detectorId };
  const fixedInterval = Math.ceil(
    (endTime - startTime) / (MIN_IN_MILLI_SECS * MAX_DATA_POINTS)
  );
  let requestBody = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              data_end_time: {
                gte: startTime,
                lte: endTime,
              },
            },
          },
          {
            term: termField,
          },
        ],
      },
    },
    aggs: {
      bucketized_anomaly_grade: {
        date_histogram: {
          field: 'data_end_time',
          fixed_interval: `${fixedInterval}m`,
        },
        aggs: {
          top_anomaly_hits: {
            top_hits: {
              sort: [
                {
                  anomaly_grade: {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: RETURNED_AD_RESULT_FIELDS,
              },
              size: 1,
            },
          },
        },
      },
    },
  };

  // If querying RT results: remove any results that include a task_id, as this indicates
  // a historical result from a historical task.
  if (!isHistorical) {
    requestBody.query.bool = {
      ...requestBody.query.bool,
      ...{
        must_not: {
          exists: {
            field: 'task_id',
          },
        },
      },
    };
  }

  // Add entity filters if this is a HC detector
  if (entityList !== undefined && entityList.length > 0) {
    requestBody = appendEntityFilters(requestBody, entityList);
  }
  return requestBody;
};

export const parseBucketizedAnomalyResults = (result: any): Anomalies => {
  const rawAnomalies = get(
    result,
    'response.aggregations.bucketized_anomaly_grade.buckets',
    []
  ) as any[];
  let anomalies = [] as AnomalyData[];
  let featureData = {} as { [key: string]: FeatureAggregationData[] };
  rawAnomalies.forEach((item) => {
    if (get(item, 'top_anomaly_hits.hits.hits', []).length > 0) {
      const rawAnomaly = get(item, 'top_anomaly_hits.hits.hits.0._source');
      if (
        get(rawAnomaly, 'anomaly_grade') !== undefined &&
        get(rawAnomaly, 'feature_data', []).length > 0
      ) {
        const featureDataMap: { [key: string]: string } = {};
        get(rawAnomaly, 'feature_data', [])
          .filter(
            (element) =>
              get(element, 'feature_id') && get(element, 'feature_name')
          )
          .forEach((feature: any) => {
            featureDataMap[get(feature, 'feature_id')] = get(
              feature,
              'feature_name'
            );
          });
        const relevantAttributionMap: { [key: string]: number } = {};
        get(rawAnomaly, 'relevant_attribution', [])
          .filter(
            (element) => get(element, 'feature_id') && get(element, 'data')
          )
          .forEach((attribution: any) => {
            relevantAttributionMap[get(attribution, 'feature_id')] = get(
              attribution,
              'data'
            );
          });
        const contributions: { [key: string]: FeatureContributionData } = {};
        for (const [key] of Object.entries(featureDataMap)) {
          contributions[key] = {
            name: featureDataMap[key],
            attribution: relevantAttributionMap[key],
          };
        }
        anomalies.push({
          anomalyGrade: toFixedNumberForAnomaly(
            get(rawAnomaly, 'anomaly_grade')
          ),
          confidence: toFixedNumberForAnomaly(get(rawAnomaly, 'confidence')),
          startTime: get(rawAnomaly, 'data_start_time'),
          endTime: get(rawAnomaly, 'data_end_time'),
          plotTime: get(rawAnomaly, 'data_end_time'),
          entity: get(rawAnomaly, 'entity'),
          contributions:
            toFixedNumberForAnomaly(get(rawAnomaly, 'anomaly_grade')) > 0
              ? contributions
              : {},
        });

        const featureBreakdownAttributionMap: { [key: string]: number } = {};

        get(rawAnomaly, 'relevant_attribution', [])
          .filter(
            (element) => get(element, 'feature_id') && get(element, 'data')
          )
          .forEach((attribution: any) => {
            featureBreakdownAttributionMap[get(attribution, 'feature_id')] =
              toFixedNumberForAnomaly(get(attribution, 'data'));
          });

        const expectedValueMap: { [key: string]: number } = {};
        get(rawAnomaly, 'expected_values[0].value_list', []).forEach(
          (expect: any) => {
            expectedValueMap[get(expect, 'feature_id')] =
              toFixedNumberForAnomaly(get(expect, 'data'));
          }
        );

        get(rawAnomaly, 'feature_data', []).forEach((feature) => {
          if (!get(featureData, get(feature, 'feature_id'))) {
            featureData[get(feature, 'feature_id')] = [];
          }
          featureData[get(feature, 'feature_id')].push({
            data: toFixedNumberForAnomaly(get(feature, 'data')),
            startTime: get(rawAnomaly, 'data_start_time'),
            endTime: get(rawAnomaly, 'data_end_time'),
            plotTime: get(rawAnomaly, 'data_end_time'),
            attribution:
              featureBreakdownAttributionMap[get(feature, 'feature_id')],
            expectedValue: expectedValueMap[get(feature, 'feature_id')],
          });
        });
      }
    }
  });
  return {
    anomalies: anomalies,
    featureData: featureData,
  };
};

export const parseAnomalySummary = (
  anomalySummaryResult: any
): AnomalySummary => {
  const anomalyCount = get(
    anomalySummaryResult,
    'response.aggregations.count_anomalies.value',
    0
  );
  return {
    anomalyOccurrence: anomalyCount,
    minAnomalyGrade: anomalyCount
      ? toFixedNumberForAnomaly(
          get(
            anomalySummaryResult,
            'response.aggregations.min_anomaly_grade.value'
          )
        )
      : 0,
    maxAnomalyGrade: anomalyCount
      ? toFixedNumberForAnomaly(
          get(
            anomalySummaryResult,
            'response.aggregations.max_anomaly_grade.value'
          )
        )
      : 0,
    avgAnomalyGrade: anomalyCount
      ? toFixedNumberForAnomaly(
          get(
            anomalySummaryResult,
            'response.aggregations.avg_anomaly_grade.value'
          )
        )
      : 0,
    minConfidence: anomalyCount
      ? toFixedNumberForAnomaly(
          get(
            anomalySummaryResult,
            'response.aggregations.min_confidence.value'
          )
        )
      : 0,
    maxConfidence: anomalyCount
      ? toFixedNumberForAnomaly(
          get(
            anomalySummaryResult,
            'response.aggregations.max_confidence.value'
          )
        )
      : 0,
    lastAnomalyOccurrence: anomalyCount
      ? minuteDateFormatter(
          get(
            anomalySummaryResult,
            'response.aggregations.max_data_end_time.value'
          )
        )
      : '',
  };
};

export const parsePureAnomalies = (
  anomalySummaryResult: any
): AnomalyData[] => {
  const anomaliesHits = get(anomalySummaryResult, 'response.hits.hits', []);
  const anomalies = [] as AnomalyData[];
  if (anomaliesHits.length > 0) {
    anomaliesHits.forEach((item: any) => {
      const rawAnomaly = get(item, '_source');
      const featureDataMap: { [key: string]: string } = {};
      get(rawAnomaly, 'feature_data', [])
        .filter(
          (element) =>
            get(element, 'feature_id') && get(element, 'feature_name')
        )
        .forEach((feature: any) => {
          featureDataMap[get(feature, 'feature_id')] = get(
            feature,
            'feature_name'
          );
        });
      const relevantAttributionMap: { [key: string]: number } = {};
      get(rawAnomaly, 'relevant_attribution', [])
        .filter((element) => get(element, 'feature_id') && get(element, 'data'))
        .forEach((attribution: any) => {
          relevantAttributionMap[get(attribution, 'feature_id')] =
            toFixedNumberForAnomaly(get(attribution, 'data'));
        });
      const contributions: { [key: string]: FeatureContributionData } = {};
      for (const [key] of Object.entries(featureDataMap)) {
        contributions[key] = {
          name: featureDataMap[key],
          attribution: relevantAttributionMap[key],
        };
      }
      anomalies.push({
        anomalyGrade: toFixedNumberForAnomaly(get(rawAnomaly, 'anomaly_grade')),
        confidence: toFixedNumberForAnomaly(get(rawAnomaly, 'confidence')),
        startTime: get(rawAnomaly, 'data_start_time'),
        endTime: get(rawAnomaly, 'data_end_time'),
        plotTime: get(rawAnomaly, 'data_end_time'),
        entity: get(rawAnomaly, 'entity'),
        contributions: contributions,
      });
    });
  }
  return anomalies;
};

export type FeatureDataPoint = {
  isMissing: boolean;
  plotTime: number;
  startTime: number;
  endTime: number;
};

export const FEATURE_DATA_CHECK_WINDOW_OFFSET = 2;

/**
 * Returns feature data points array specified in a data range
 * @param featureData Feature aggregation data array
 * @param interval Detector interval
 * @param dateRange Plot date rage
 * @param windowDelay Detector window delay
 * @param windowDelayAdjusted Whether window delay time has been considered in the dateRange parameter
 *  If not, we have to consider that before declaring a feature point is missing.
 * @returns Feature data points including missing data information
 *
 */
export const getFeatureDataPoints = (
  featureData: FeatureAggregationData[],
  interval: number,
  dateRange: DateRange | undefined,
  windowDelay: Schedule | undefined,
  windowDelayAdjusted: boolean | undefined
): FeatureDataPoint[] => {
  const featureDataPoints = [] as FeatureDataPoint[];
  if (!dateRange) {
    return featureDataPoints;
  }

  const existingTimes = isEmpty(featureData)
    ? []
    : featureData
        .map((feature) => getRoundedTimeInMin(feature.startTime))
        .filter((featureTime) => featureTime != undefined);

  let windowDelayInMilliSecs = 0;

  if (!windowDelayAdjusted) {
    let windowDelayUnit = get(windowDelay, 'unit', UNITS.MINUTES);

    let windowDelayInterval = get(windowDelay, 'interval', 0);
    windowDelayInMilliSecs =
      windowDelayInterval * toDuration(windowDelayUnit).asMilliseconds();
  }

  for (
    let currentTime = getRoundedTimeInMin(dateRange.startDate);
    currentTime <
    // skip checking for latest interval as data point for it may not be delivered in time
    // in other words, we allow FEATURE_DATA_CHECK_WINDOW_OFFSET points to be missed
    // We also have to subtract window delay time. We query data using data start time within dateRange.
    // Thus, [dateRange.endDate - windowDelayInMilliSecs, dateRange.endDate] will not have data if
    // dateRange.endDate equals now.
    // If windowDelayAdjusted is true, windowDelayInMilliSecs is 0.
    getRoundedTimeInMin(
      dateRange.endDate -
        FEATURE_DATA_CHECK_WINDOW_OFFSET * interval * MIN_IN_MILLI_SECS -
        windowDelayInMilliSecs
    );
    currentTime += interval * MIN_IN_MILLI_SECS
  ) {
    const isExisting = findTimeExistsInWindow(
      existingTimes,
      getRoundedTimeInMin(currentTime),
      getRoundedTimeInMin(currentTime) + interval * MIN_IN_MILLI_SECS
    );
    featureDataPoints.push({
      isMissing: !isExisting,
      plotTime: currentTime + interval * MIN_IN_MILLI_SECS,
      startTime: currentTime,
      endTime: currentTime + interval * MIN_IN_MILLI_SECS,
    });
  }

  return featureDataPoints;
};

const findTimeExistsInWindow = (
  timestamps: any[],
  startTime: number,
  endTime: number
): boolean => {
  // timestamps is in desc order
  let result = false;
  if (isEmpty(timestamps)) {
    // if timestamps is empty, we have no way to verify. Prefer not to report mising data callout
    return result;
  }

  let left = 0;
  let right = timestamps.length - 1;
  while (left <= right) {
    let middle = Math.floor((right + left) / 2);
    if (timestamps[middle] >= startTime && timestamps[middle] < endTime) {
      result = true;
      break;
    }
    if (timestamps[middle] < startTime) {
      right = middle - 1;
    }
    if (timestamps[middle] >= endTime) {
      left = middle + 1;
    }
  }
  return result;
};

const getRoundedTimeInMin = (timestamp: number): number => {
  return Math.round(timestamp / MIN_IN_MILLI_SECS) * MIN_IN_MILLI_SECS;
};

/**
 * Make sure we don't have more than MAX_FEATURE_ANNOTATIONS missing feature annotations. We divide dataRange by MAX_FEATURE_ANNOTATIONS
 * divisions. If there is any missing data in that division, we will flag that division missing data.
 *
 * For example, assuming we miss one data point for an one-minute interval detector and the featureMissingDataPoints is
 * [{"isMissing":true,"plotTime":1655508900000,"startTime":1655508840000,"endTime":1655508900000}]
 *
 * The dataRange is last 7 days. We will devide the 7 days period to MAX_FEATURE_ANNOTATIONS divisions and return
 * [{"isMissing":true,"plotTime":1655508900000,"startTime":1655506137843,"endTime":1655512185843}]
 *
 * @param featureMissingDataPoints The actual missing feature data array
 * @param dateRange Plot date rage
 * @returns Sampleed feature data points including missing data information. The returned missing data time range might be bigger
 * than the input missing data time range due to the effect of sampling.
 *
 */
const sampleFeatureMissingDataPoints = (
  featureMissingDataPoints: FeatureDataPoint[],
  dateRange?: DateRange
): FeatureDataPoint[] => {
  if (!dateRange) {
    return featureMissingDataPoints;
  }
  const sampleTimeWindows = calculateTimeWindowsWithMaxDataPoints(
    MAX_FEATURE_ANNOTATIONS,
    dateRange
  );

  const sampledResults = [] as FeatureDataPoint[];
  for (const timeWindow of sampleTimeWindows) {
    const sampledDataPoint = getMiddleDataPoint(
      getDataPointsInWindow(featureMissingDataPoints, timeWindow)
    );
    if (sampledDataPoint) {
      sampledResults.push({
        ...sampledDataPoint,
        startTime: Math.min(timeWindow.startDate, sampledDataPoint.startTime),
        endTime: Math.max(timeWindow.endDate, sampledDataPoint.endTime),
      } as FeatureDataPoint);
    }
  }

  return sampledResults;
};

const getMiddleDataPoint = (arr: any[]) => {
  if (arr && arr.length > 0) {
    return arr[Math.floor(arr.length / 2)];
  }
  return undefined;
};

const getDataPointsInWindow = (
  dataPoints: FeatureDataPoint[],
  timeWindow: DateRange
) => {
  return dataPoints.filter(
    (dataPoint) =>
      get(dataPoint, 'plotTime', 0) >= timeWindow.startDate &&
      get(dataPoint, 'plotTime', 0) < timeWindow.endDate
  );
};

const generateFeatureMissingAnnotations = (
  featureMissingDataPoints: FeatureDataPoint[]
) => {
  return featureMissingDataPoints.map((feature) => ({
    dataValue: feature.plotTime,
    details: `There is feature data point missing between ${moment(
      feature.startTime
    ).format('MM/DD/YY h:mm A')} and ${moment(feature.endTime).format(
      'MM/DD/YY h:mm A'
    )}`,
    header: dateFormatter(feature.plotTime),
  }));
};

const finalizeFeatureMissingDataAnnotations = (
  featureMissingDataPoints: any[],
  dateRange?: DateRange
) => {
  const sampledFeatureMissingDataPoints = sampleFeatureMissingDataPoints(
    featureMissingDataPoints,
    dateRange
  );

  return generateFeatureMissingAnnotations(sampledFeatureMissingDataPoints);
};

/**
 *
 * @param featureData Feature aggregation data array
 * @param interval Detector interval
 * @param windowDelay Detector window delay
 * @param queryDateRange Date rage specified by customer
 * @param displayDateRange The actual display date range. displayDateRange is different from queryDateRange
 *  when the queryDateRange has timestamps older than detector enabled time
 * @param windowDelayAdjusted Whether window delay time has been considered in the dateRange parameter
 *  If not, we have to consider that before declaring a feature point is missing.
 * @returns Returns feature data points array with missing data information
 *
 */
export const getFeatureMissingDataAnnotations = (
  featureData: FeatureAggregationData[],
  interval: number,
  windowDelay: Schedule,
  queryDateRange?: DateRange,
  displayDateRange?: DateRange,
  windowDelayAdjusted?: boolean
) => {
  const featureMissingDataPoints = getFeatureDataPoints(
    featureData,
    interval,
    queryDateRange,
    windowDelay,
    windowDelayAdjusted
  ).filter((dataPoint) => get(dataPoint, 'isMissing', false));

  const featureMissingAnnotations = finalizeFeatureMissingDataAnnotations(
    featureMissingDataPoints,
    displayDateRange
  );

  return featureMissingAnnotations;
};

/**
 * returns feature data points(missing/existing both included) for detector in a map like
 * {
 *    'featureName': data points[]
 * }
 *
 * @param detector Detector config
 * @param featureData Feature aggregation data array
 * @param interval Detector interval
 * @param dateRange Plot date rage
 * @param windowDelayAdjusted Whether window delay time has been considered in the dateRange parameter
 *  If not, we have to consider that before declaring a feature point is missing.
 * @returns Feature data points including missing data information
 *
 */
export const getFeatureDataPointsForDetector = (
  detector: Detector,
  featuresData: { [key: string]: FeatureAggregationData[] },
  interval: number,
  dateRange?: DateRange,
  windowDelayAdjusted?: boolean
) => {
  let featureDataPointsForDetector = {} as {
    [key: string]: FeatureDataPoint[];
  };

  const allFeatures = get(
    detector,
    'featureAttributes',
    [] as FeatureAttributes[]
  );
  allFeatures.forEach((feature) => {
    //@ts-ignore
    const featureData = featuresData[feature.featureId];
    const featureDataPoints = getFeatureDataPoints(
      featureData,
      interval,
      dateRange,
      get(detector, `windowDelay.period`, {
        period: { interval: 0, unit: UNITS.MINUTES },
      }),
      windowDelayAdjusted
    );
    featureDataPointsForDetector = {
      ...featureDataPointsForDetector,
      [feature.featureName]: featureDataPoints,
    };
  });
  return featureDataPointsForDetector;
};

export const getFeatureMissingSeverities = (featuresDataPoint: {
  [key: string]: FeatureDataPoint[];
}): Map<MISSING_FEATURE_DATA_SEVERITY, string[]> => {
  const featureMissingSeverities = new Map();

  for (const [featureName, featureDataPoints] of Object.entries(
    featuresDataPoint
  )) {
    // all feature data points should have same length
    let featuresWithMissingData = [] as string[];
    if (featureDataPoints.length <= 1) {
      // return empty map
      return featureMissingSeverities;
    }
    if (
      featureDataPoints.length === 2 &&
      featureDataPoints[0].isMissing &&
      featureDataPoints[1].isMissing
    ) {
      if (featureMissingSeverities.has(MISSING_FEATURE_DATA_SEVERITY.YELLOW)) {
        featuresWithMissingData = featureMissingSeverities.get(
          MISSING_FEATURE_DATA_SEVERITY.YELLOW
        );
      }
      featuresWithMissingData.push(featureName);
      featureMissingSeverities.set(
        MISSING_FEATURE_DATA_SEVERITY.YELLOW,
        featuresWithMissingData
      );
      continue;
    }

    const orderedFeatureDataPoints = orderBy(
      featureDataPoints,
      // sort by plot time in desc order
      (dataPoint) => get(dataPoint, 'plotTime', 0),
      SORT_DIRECTION.DESC
    );
    // feature has >= 3 data points
    if (
      orderedFeatureDataPoints.length >= 3 &&
      orderedFeatureDataPoints[0].isMissing &&
      orderedFeatureDataPoints[1].isMissing
    ) {
      // at least latest 2 ones are missing
      let currentSeverity = MISSING_FEATURE_DATA_SEVERITY.YELLOW;
      if (orderedFeatureDataPoints[2].isMissing) {
        // all the latest 3 ones are missing
        currentSeverity = MISSING_FEATURE_DATA_SEVERITY.RED;
      }
      if (featureMissingSeverities.has(currentSeverity)) {
        featuresWithMissingData = featureMissingSeverities.get(currentSeverity);
      }
      featuresWithMissingData.push(featureName);
      featureMissingSeverities.set(currentSeverity, featuresWithMissingData);
    }
  }

  return featureMissingSeverities;
};

export const getFeatureDataMissingMessageAndActionItem = (
  featureMissingSev: MISSING_FEATURE_DATA_SEVERITY | undefined,
  featuresWithMissingData: string[],
  hideFeatureMessage: boolean
) => {
  switch (featureMissingSev) {
    case MISSING_FEATURE_DATA_SEVERITY.YELLOW:
      return {
        message: `Recent data is missing for feature${
          featuresWithMissingData.length > 1 ? 's' : ''
        }: ${featuresWithMissingData.join(
          ', '
        )}. So, anomaly result is missing during this time.`,
        actionItem:
          'Make sure your data is ingested correctly.' + hideFeatureMessage
            ? ''
            : ' See the feature data shown below for more details.',
      };
    case MISSING_FEATURE_DATA_SEVERITY.RED:
      return {
        message: `Data is not being ingested correctly for feature${
          featuresWithMissingData.length > 1 ? 's' : ''
        }: ${featuresWithMissingData.join(
          ', '
        )}. So, anomaly result is missing during this time.`,
        actionItem:
          `${DETECTOR_INIT_FAILURES.NO_TRAINING_DATA.actionItem}` +
          hideFeatureMessage
            ? ''
            : ' See the feature data shown below for more details.',
      };
    default:
      return {
        message: '',
        actionItem: '',
      };
  }
};

// Generates query to get the top anomalous entities (or entity pairs)
// for some detector, sorting by severity or occurrence.
export const getTopAnomalousEntitiesQuery = (
  startTime: number,
  endTime: number,
  detectorId: string,
  size: number,
  sortType: AnomalyHeatmapSortType,
  isMultiCategory: boolean,
  isHistorical?: boolean,
  taskId?: string,
  includedEntities?: Entity[]
) => {
  const termField =
    isHistorical && taskId ? { task_id: taskId } : { detector_id: detectorId };

  // To handle BWC, we will return 2 possible queries based on the # of categorical fields:
  // (1) legacy way (1 category field): bucket aggregate over the single, nested, 'entity.value' field
  // (2) new way (>= 2 category fields): bucket aggregate over the new 'model_id' field
  let requestBody = isMultiCategory
    ? {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [AD_DOC_FIELDS.ANOMALY_GRADE]: {
                    gt: 0,
                  },
                },
              },
              {
                range: {
                  data_end_time: {
                    gte: startTime,
                    lte: endTime,
                  },
                },
              },
              {
                term: termField,
              },
            ],
          },
        },
        aggs: {
          [TOP_ENTITY_AGGS]: {
            terms: {
              field: MODEL_ID_FIELD,
              size: size,
              ...(sortType === AnomalyHeatmapSortType.SEVERITY
                ? {
                    order: {
                      [MAX_ANOMALY_AGGS]: SORT_DIRECTION.DESC,
                    },
                  }
                : {}),
            },
            aggs: {
              [MAX_ANOMALY_AGGS]: {
                max: {
                  field: AD_DOC_FIELDS.ANOMALY_GRADE,
                },
              },
              [ENTITY_LIST_FIELD]: {
                top_hits: {
                  size: 1,
                  _source: {
                    include: [ENTITY_FIELD],
                  },
                },
              },
              ...(sortType === AnomalyHeatmapSortType.SEVERITY
                ? {
                    [MAX_ANOMALY_SORT_AGGS]: {
                      bucket_sort: {
                        sort: [
                          {
                            [`${MAX_ANOMALY_AGGS}`]: {
                              order: SORT_DIRECTION.DESC,
                            },
                          },
                        ],
                      },
                    },
                  }
                : {}),
            },
          },
        },
      }
    : {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [AD_DOC_FIELDS.ANOMALY_GRADE]: {
                    gt: 0,
                  },
                },
              },
              {
                range: {
                  data_end_time: {
                    gte: startTime,
                    lte: endTime,
                  },
                },
              },
              {
                term: termField,
              },
            ],
          },
        },
        aggs: {
          [TOP_ENTITIES_FIELD]: {
            nested: {
              path: ENTITY_FIELD,
            },
            aggs: {
              [TOP_ENTITY_AGGS]: {
                terms: {
                  field: ENTITY_VALUE_PATH_FIELD,
                  size: size,
                  ...(sortType === AnomalyHeatmapSortType.SEVERITY
                    ? {
                        order: {
                          [TOP_ANOMALY_GRADE_SORT_AGGS]: SORT_DIRECTION.DESC,
                        },
                      }
                    : {}),
                },
                aggs: {
                  [TOP_ANOMALY_GRADE_SORT_AGGS]: {
                    reverse_nested: {},
                    aggs: {
                      [MAX_ANOMALY_AGGS]: {
                        max: {
                          field: AD_DOC_FIELDS.ANOMALY_GRADE,
                        },
                      },
                    },
                  },
                  ...(sortType === AnomalyHeatmapSortType.SEVERITY
                    ? {
                        [MAX_ANOMALY_SORT_AGGS]: {
                          bucket_sort: {
                            sort: [
                              {
                                [`${TOP_ANOMALY_GRADE_SORT_AGGS}.${MAX_ANOMALY_AGGS}`]:
                                  {
                                    order: SORT_DIRECTION.DESC,
                                  },
                              },
                            ],
                          },
                        },
                      }
                    : {}),
                  [ENTITY_LIST_FIELD]: {
                    top_hits: {
                      size: 1,
                      _source: {
                        include: [ENTITY_FIELD],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

  if (!isHistorical) {
    requestBody.query.bool = {
      ...requestBody.query.bool,
      ...{
        must_not: {
          exists: {
            field: 'task_id',
          },
        },
      },
    };
  }

  // In the HC filtering case, in order to fetch the top entity combos after a specific entity has been selected,
  // we need to add a filter to only match results that include at least the user-specified entity values.
  // Consider a detector with category fields [region, IP]. If user selects region 'us-west-1' and wants
  // top IPs from that region, we return the top entity combos that have a region set to 'us-west-1', such as
  // ('us-west-1', '1.2.3.4), ('us-west-1', '5.6.7.8'), and so on.
  if (includedEntities !== undefined && !isEmpty(includedEntities)) {
    requestBody = appendEntityFilters(requestBody, includedEntities);
  }

  return requestBody;
};

export const parseTopEntityAnomalySummaryResults = (
  result: any,
  isMultiCategory: boolean
): EntityAnomalySummaries[] => {
  const rawEntityAnomalySummaries = isMultiCategory
    ? get(result, `response.aggregations.${TOP_ENTITY_AGGS}.buckets`, [])
    : (get(
        result,
        `response.aggregations.${TOP_ENTITIES_FIELD}.${TOP_ENTITY_AGGS}.buckets`,
        []
      ) as any[]);
  let topEntityAnomalySummaries = [] as EntityAnomalySummaries[];
  rawEntityAnomalySummaries.forEach((item: any) => {
    const anomalyCount = get(item, DOC_COUNT_FIELD, 0);
    const entityList = isMultiCategory
      ? get(item, `${ENTITY_LIST_FIELD}.hits.hits.0._source.entity`, [])
      : ([
          get(item, `${ENTITY_LIST_FIELD}.hits.hits.0._source`, {}),
        ] as Entity[]);

    const maxAnomalyGrade = isMultiCategory
      ? get(item, MAX_ANOMALY_AGGS, 0)
      : get(item, [TOP_ANOMALY_GRADE_SORT_AGGS, MAX_ANOMALY_AGGS].join('.'), 0);
    const entityAnomalySummary = {
      maxAnomaly: maxAnomalyGrade,
      anomalyCount: anomalyCount,
    } as EntityAnomalySummary;
    const entityAnomalySummaries = {
      entityList: entityList,
      anomalySummaries: [entityAnomalySummary],
    } as EntityAnomalySummaries;
    if (isMultiCategory) {
      entityAnomalySummaries.modelId = get(item, KEY_FIELD, '');
    }
    topEntityAnomalySummaries.push(entityAnomalySummaries);
  });
  return topEntityAnomalySummaries;
};

// Parsing the results from the multi-category filter API, which
// returns summaries of the top parent entities
export const parseAggTopEntityAnomalySummaryResults = (
  result: any
): EntityAnomalySummaries[] => {
  const rawEntityAnomalySummaries = get(result, `response.buckets`, []);
  let topEntityAnomalySummaries = [] as EntityAnomalySummaries[];
  rawEntityAnomalySummaries.forEach((item: any) => {
    // Loop through the K/V pairs in the "key" dict returned in the composite
    // agg bucket key from multi-category filter API
    const entityListAsKey = get(item, `${KEY_FIELD}`, {}) as {
      [key: string]: string;
    };
    let entityList = [] as Entity[];
    for (var entity in entityListAsKey) {
      entityList.push({
        name: entity,
        value: entityListAsKey[entity] as string,
      });
    }

    const anomalyCount = get(item, DOC_COUNT_FIELD, 0);
    const maxAnomalyGrade = get(item, MAX_ANOMALY_GRADE_FIELD, 0);
    const entityAnomalySummary = {
      maxAnomaly: maxAnomalyGrade,
      anomalyCount: anomalyCount,
    } as EntityAnomalySummary;
    const entityAnomalySummaries = {
      entityList: entityList,
      anomalySummaries: [entityAnomalySummary],
    } as EntityAnomalySummaries;
    topEntityAnomalySummaries.push(entityAnomalySummaries);
  });
  return topEntityAnomalySummaries;
};

export const getEntityAnomalySummariesQuery = (
  startTime: number,
  endTime: number,
  detectorId: string,
  size: number,
  entityList: Entity[],
  modelId: string | undefined,
  isHistorical?: boolean,
  taskId?: string
) => {
  const termField =
    isHistorical && taskId ? { task_id: taskId } : { detector_id: detectorId };
  const fixedInterval = Math.max(
    Math.ceil((endTime - startTime) / (size * MIN_IN_MILLI_SECS)),
    1
  );
  // bucket key is calculated below
  // https://www.elastic.co/guide/en/elasticsearch/reference/7.10/search-aggregations-bucket-datehistogram-aggregation.html
  // bucket_key = Math.floor(value / interval) * interval
  // if startTime is not divisible by fixedInterval, there will be remainder,
  // this can be offset for bucket_key
  const offsetInMillisec = startTime % (fixedInterval * MIN_IN_MILLI_SECS);

  let requestBody = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [AD_DOC_FIELDS.ANOMALY_GRADE]: {
                gt: 0,
              },
            },
          },
          {
            range: {
              data_end_time: {
                gte: startTime,
                lte: endTime,
              },
            },
          },
          {
            term: termField,
          },
        ],
      },
    },
    aggs: {
      [ENTITY_DATE_BUCKET_ANOMALY_AGGS]: {
        date_histogram: {
          field: AD_DOC_FIELDS.DATA_END_TIME,
          fixed_interval: `${fixedInterval}m`,
          offset: `${offsetInMillisec}ms`,
        },
        aggs: {
          [MAX_ANOMALY_AGGS]: {
            max: {
              field: AD_DOC_FIELDS.ANOMALY_GRADE,
            },
          },
          [COUNT_ANOMALY_AGGS]: {
            value_count: {
              field: AD_DOC_FIELDS.ANOMALY_GRADE,
            },
          },
        },
      },
    },
  };

  // If querying RT results: remove any results that include a task_id, as this indicates
  // a historical result from a historical task.
  if (!isHistorical) {
    requestBody.query.bool = {
      ...requestBody.query.bool,
      ...{
        must_not: {
          exists: {
            field: 'task_id',
          },
        },
      },
    };
  }

  // Add entity filters if this is a HC detector
  if (entityList !== undefined && entityList.length > 0) {
    requestBody = appendEntityFilters(requestBody, entityList);
  }

  return requestBody;
};

export const parseEntityAnomalySummaryResults = (
  result: any,
  entityList: Entity[]
): EntityAnomalySummaries => {
  const rawEntityAnomalySummaries = get(
    result,
    `response.aggregations.${ENTITY_DATE_BUCKET_ANOMALY_AGGS}.buckets`,
    []
  ) as any[];
  let anomalySummaries = [] as EntityAnomalySummary[];
  rawEntityAnomalySummaries.forEach((item) => {
    const anomalyCount = get(item, `${COUNT_ANOMALY_AGGS}.value`, 0);
    const startTime = get(item, 'key', 0);
    const maxAnomalyGrade = get(item, `${MAX_ANOMALY_AGGS}.value`, 0);
    const entityAnomalySummary = {
      startTime: startTime,
      maxAnomaly: maxAnomalyGrade,
      anomalyCount: anomalyCount,
    } as EntityAnomalySummary;
    anomalySummaries.push(entityAnomalySummary);
  });
  const entityAnomalySummaries = {
    entityList: entityList,
    anomalySummaries: anomalySummaries,
  } as EntityAnomalySummaries;
  return entityAnomalySummaries;
};

export const convertToEntityString = (
  entityList: Entity[],
  delimiter?: string
) => {
  let entityString = '';
  const delimiterToUse = delimiter ? delimiter : ENTITY_LIST_DELIMITER;
  if (!isEmpty(entityList)) {
    entityList.forEach((entity: any, index) => {
      if (index > 0) {
        entityString += delimiterToUse;
      }
      entityString += entity.value;
    });
  }
  return entityString;
};

export const getAnomalyDataRangeQuery = (
  startTime: number,
  endTime: number,
  taskId: string
) => {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [AD_DOC_FIELDS.ANOMALY_GRADE]: {
                gte: 0,
              },
            },
          },
          {
            range: {
              data_end_time: {
                gte: startTime,
                lte: endTime,
              },
            },
          },
          {
            term: {
              task_id: taskId,
            },
          },
        ],
      },
    },
    aggs: {
      [MIN_END_TIME]: {
        min: {
          field: AD_DOC_FIELDS.DATA_END_TIME,
        },
      },
      [MAX_END_TIME]: {
        max: {
          field: AD_DOC_FIELDS.DATA_END_TIME,
        },
      },
    },
  };
};

export const getHistoricalAggQuery = (
  startTime: number,
  endTime: number,
  taskId: string,
  anomalyAgg: ANOMALY_AGG
) => {
  // Need to calculate timezone offset before bucketing into days/months/weeks.
  const timezoneAsIANAString = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    size: MAX_ANOMALIES,
    query: {
      bool: {
        filter: [
          {
            range: {
              [AD_DOC_FIELDS.ANOMALY_GRADE]: {
                gt: 0,
              },
            },
          },
          {
            range: {
              data_end_time: {
                gte: startTime,
                lte: endTime,
              },
            },
          },
          {
            term: {
              task_id: taskId,
            },
          },
        ],
      },
    },
    aggs: {
      [AGGREGATED_ANOMALIES]: {
        date_histogram: {
          field: AD_DOC_FIELDS.DATA_END_TIME,
          calendar_interval: anomalyAgg,
          time_zone: timezoneAsIANAString,
          extended_bounds: {
            min: startTime,
            max: endTime,
          },
        },
        aggs: {
          [MAX_ANOMALY_AGGS]: {
            max: {
              field: AD_DOC_FIELDS.ANOMALY_GRADE,
            },
          },
        },
      },
    },
  };
};

export const parseHistoricalAggregatedAnomalies = (
  result: any,
  anomalyAgg: ANOMALY_AGG
) => {
  const resultBuckets = get(
    result,
    `response.aggregations.${AGGREGATED_ANOMALIES}.buckets`,
    []
  );
  let anomalies = [] as AnomalyData[];
  let endTimeOffset = 0;
  let prefix = '';
  let dateFormat = '';

  switch (anomalyAgg) {
    case ANOMALY_AGG.DAILY: {
      endTimeOffset = DAY_IN_MILLI_SECS;
      prefix = '';
      dateFormat = 'MM/DD/YY';
      break;
    }
    case ANOMALY_AGG.WEEKLY: {
      endTimeOffset = WEEK_IN_MILLI_SECS;
      prefix = 'Week of ';
      dateFormat = 'MM/DD/YY';
      break;
    }
    case ANOMALY_AGG.MONTHLY: {
      // Approximate end time since months don't have even days
      endTimeOffset = DAY_IN_MILLI_SECS * 30;
      prefix = '';
      dateFormat = 'MMM YYYY';
    }
  }
  const plotTimeOffset = endTimeOffset / 2;

  resultBuckets.forEach((bucket: any) => {
    const timestamp = get(bucket, 'key');
    let maxGrade = get(bucket, `${MAX_ANOMALY_AGGS}.value`);
    anomalies.push({
      anomalyGrade: maxGrade !== null ? maxGrade : 0,
      //@ts-ignore
      confidence: undefined,
      startTime: timestamp,
      endTime: timestamp + endTimeOffset,
      plotTime: timestamp + plotTimeOffset,
      aggInterval: prefix + moment(timestamp).format(dateFormat),
    });
  });

  return anomalies;
};
export const convertToCategoryFieldString = (
  categoryFields: string[],
  delimiter: string
) => {
  let categoryFieldString = '';
  if (!isEmpty(categoryFields)) {
    categoryFields.forEach((categoryField: any, index) => {
      if (index > 0) {
        categoryFieldString += delimiter;
      }
      categoryFieldString += categoryField;
    });
  }
  return categoryFieldString;
};

export const convertToCategoryFieldAndEntityString = (
  entityList: Entity[],
  delimiter: string = '\n'
) => {
  let entityString = '';
  if (!isEmpty(entityList)) {
    entityList.forEach((entity: any, index) => {
      if (index > 0) {
        entityString += delimiter;
      }

      // It is possible that entity.name is undefined when we artificially add
      // whitespace strings as the entity values when the heatmap is empty (see
      // getSampleAnomaliesHeatmapData())
      // If true, set the entire string as 'None'
      entityString +=
        entity.name !== undefined
          ? entity.name +
            `${HEATMAP_CALL_ENTITY_KEY_VALUE_DELIMITER}` +
            entity.value
          : 'None';
    });
  }
  return entityString;
};

export const convertHeatmapCellEntityStringToEntityList = (
  heatmapCellEntityString: string
) => {
  let entityList = [] as Entity[];
  const entitiesAsStringList = heatmapCellEntityString.split(
    HEATMAP_CELL_ENTITY_DELIMITER
  );
  var i;
  for (i = 0; i < entitiesAsStringList.length; i++) {
    const entityAsString = entitiesAsStringList[i];
    const entityAsFieldValuePair = entityAsString.split(
      HEATMAP_CALL_ENTITY_KEY_VALUE_DELIMITER
    );
    entityList.push({
      name: entityAsFieldValuePair[0],
      value: entityAsFieldValuePair[1],
    });
  }
  return entityList;
};

export const entityListsMatch = (
  entityListA: Entity[],
  entityListB: Entity[]
) => {
  if (get(entityListA, 'length') !== get(entityListB, 'length')) {
    return false;
  }
  var i;
  for (i = 0; i < entityListA.length; i++) {
    if (entityListA[i].value !== entityListB[i].value) {
      return false;
    }
  }
  return true;
};

// Adding filters for all entity values
const appendEntityFilters = (requestBody: any, entityList: Entity[]) => {
  if (entityList !== undefined && !isEmpty(entityList)) {
    entityList.forEach((entity: Entity) => {
      // Add filters for entity name (like 'region'), and value (like 'us-west-1')
      const entityNameFilter = {
        nested: {
          path: ENTITY_FIELD,
          query: {
            term: {
              [ENTITY_NAME_PATH_FIELD]: {
                value: entity.name,
              },
            },
          },
        },
      };
      const entityValueFilter = {
        nested: {
          path: ENTITY_FIELD,
          query: {
            term: {
              [ENTITY_VALUE_PATH_FIELD]: {
                value: entity.value,
              },
            },
          },
        },
      };
      //@ts-ignore
      requestBody.query.bool.filter.push(entityNameFilter);
      //@ts-ignore
      requestBody.query.bool.filter.push(entityValueFilter);
    });
  }
  return requestBody;
};

export const transformEntityListsForHeatmap = (entityLists: any[]) => {
  let transformedEntityLists = [] as any[];
  entityLists.forEach((entityList: Entity[]) => {
    const listAsString = convertToCategoryFieldAndEntityString(
      entityList,
      ', '
    );
    let row = [];
    var i;
    for (i = 0; i < NUM_CELLS; i++) {
      row.push(listAsString);
    }
    transformedEntityLists.push(row);
  });
  return transformedEntityLists;
};

// Returns top child entities as an Entity[][],
// where each entry in the array is a unique combination of entity values
export const parseTopChildEntityCombos = (
  result: any,
  parentEntities: Entity[]
) => {
  const resultBuckets = get(
    result,
    `response.aggregations.${TOP_ENTITY_AGGS}.buckets`,
    []
  );

  const topChildEntityCombos = [] as Entity[][];
  // Each result bucket represents a unique entity combination. Loop through them
  // to gather the unique child entity combinations (remove all parent entities).
  resultBuckets.forEach((bucket: any) => {
    const entities = get(
      bucket,
      `${ENTITY_LIST_FIELD}.hits.hits.0._source.${ENTITY_FIELD}`
    ) as Entity[];
    const childEntities = entities.filter(
      (entity: Entity) => !containsEntity(entity, parentEntities)
    );
    topChildEntityCombos.push(childEntities);
  });
  return topChildEntityCombos;
};

const containsEntity = (entity: Entity, entities: Entity[]) => {
  let contains = false;
  entities.forEach((entityInList: Entity) => {
    if (
      entity.name === entityInList.name &&
      entity.value === entityInList.value
    ) {
      contains = true;
    }
  });
  return contains;
};

// Flatten 2D array into 1D array
export const flattenData = (data: any[][]) => {
  let flattenedData = [] as any[];
  if (!isEmpty(data)) {
    data.forEach((childArray: any[]) => {
      flattenedData.push(...childArray);
    });
  }
  return flattenedData;
};
