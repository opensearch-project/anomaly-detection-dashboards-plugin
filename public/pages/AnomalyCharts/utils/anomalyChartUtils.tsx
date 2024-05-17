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

import { cloneDeep, defaultTo, get, isEmpty, orderBy } from 'lodash';
import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
} from '@elastic/eui';
import {
  DateRange,
  Detector,
  MonitorAlert,
  AnomalySummary,
  EntityData,
  EntityOptionsMap,
  EntityOption,
} from '../../../models/interfaces';
import { dateFormatter, minuteDateFormatter } from '../../utils/helpers';
import { RectAnnotationDatum } from '@elastic/charts';
import { DEFAULT_ANOMALY_SUMMARY } from './constants';
import { Datum, PlotData } from 'plotly.js';
import moment from 'moment';
import {
  calculateTimeWindowsWithMaxDataPoints,
  convertToEntityString,
  transformEntityListsForHeatmap,
} from '../../utils/anomalyResultUtils';
import { HeatmapCell } from '../containers/AnomalyHeatmapChart';
import {
  EntityAnomalySummaries,
  EntityAnomalySummary,
} from '../../../../server/models/interfaces';
import { toFixedNumberForAnomaly } from '../../../../server/utils/helpers';
import { Entity } from '../../../../server/models/interfaces';
import {
  TOP_CHILD_ENTITIES_TO_FETCH,
  MAX_TIME_SERIES_TO_DISPLAY,
} from '../../DetectorResults/utils/constants';

export const convertAlerts = (response: any): MonitorAlert[] => {
  const alerts = get(response, 'response.alerts', []);
  return alerts.map((alert: any) => {
    return {
      monitorName: get(alert, 'monitor_name'),
      triggerName: get(alert, 'trigger_name'),
      severity: get(alert, 'severity'),
      state: get(alert, 'state'),
      error: get(alert, 'error_message'),
      startTime: get(alert, 'start_time'),
      endTime: get(alert, 'end_time'),
      acknowledgedTime: get(alert, 'acknowledged_time'),
    };
  });
};

const getAlertMessage = (alert: MonitorAlert): string => {
  const message = alert.endTime
    ? `There is a severity ${alert.severity} alert with state ${
        alert.state
      } between ${dateFormatter(alert.startTime)} and ${dateFormatter(
        alert.endTime
      )}.`
    : `There is a severity ${alert.severity} alert with state ${
        alert.state
      } from ${dateFormatter(alert.startTime)}.`;
  return alert.error ? `${message} Error message: ${alert.error}` : message;
};

export const generateAlertAnnotations = (alerts: MonitorAlert[]): any[] => {
  return alerts.map((alert: MonitorAlert) => ({
    header: dateFormatter(alert.startTime),
    dataValue: alert.startTime,
    details: getAlertMessage(alert),
  }));
};

const findLatestAnomaly = (anomalies: any[]) => {
  const latestAnomaly = anomalies.reduce((prevAnomaly, curAnomaly) =>
    prevAnomaly.startTime > curAnomaly.startTime ? prevAnomaly : curAnomaly
  );
  return latestAnomaly;
};

const getAverageAnomalyGrade = (anomalyGrades: any[]) => {
  return anomalyGrades.length > 0
    ? toFixedNumberForAnomaly(
        anomalyGrades.reduce((prevGrade, curGrade) => prevGrade + curGrade, 0) /
          anomalyGrades.length
      )
    : 0;
};

export const getAnomalySummary = (totalAnomalies: any[]): AnomalySummary => {
  if (totalAnomalies == undefined || totalAnomalies.length === 0) {
    return DEFAULT_ANOMALY_SUMMARY;
  }
  const anomalies = totalAnomalies.filter(
    (anomaly) => anomaly.anomalyGrade > 0
  );
  const anomalyGrades = anomalies.map((anomaly) => anomaly.anomalyGrade);
  const anomalyConfidences = anomalies.map((anomaly) => anomaly.confidence);
  const maxConfidence = Math.max(...anomalyConfidences, 0.0);
  const minConfidence = Math.min(...anomalyConfidences, 1.0);
  const maxAnomalyGrade = Math.max(...anomalyGrades, 0.0);
  const minAnomalyGrade = Math.min(...anomalyGrades, 1.0);
  const avgAnomalyGrade = getAverageAnomalyGrade(anomalyGrades);
  const lastAnomalyOccurrence =
    anomalies.length > 0
      ? minuteDateFormatter(findLatestAnomaly(anomalies).endTime)
      : '-';

  return {
    anomalyOccurrence: anomalies.length,
    minAnomalyGrade: minAnomalyGrade > maxAnomalyGrade ? 0 : minAnomalyGrade,
    maxAnomalyGrade: maxAnomalyGrade,
    avgAnomalyGrade: avgAnomalyGrade,
    minConfidence: minConfidence > maxConfidence ? 0 : minConfidence,
    maxConfidence: maxConfidence,
    lastAnomalyOccurrence: lastAnomalyOccurrence,
  };
};

export const disabledHistoryAnnotations = (
  dateRange: DateRange,
  detector?: Detector
): RectAnnotationDatum[] => {
  if (
    !detector ||
    !detector.disabledTime ||
    detector.disabledTime > dateRange.endDate.valueOf() ||
    !detector.enabledTime ||
    detector.enabledTime < dateRange.startDate.valueOf()
  ) {
    return [];
  }
  const startTime = detector.disabledTime;
  const endTime = detector.enabled
    ? detector.enabledTime
    : dateRange.endDate.valueOf();

  const details =
    detector.enabled && detector.enabledTime
      ? `Detector was stopped from ${dateFormatter(
          startTime
        )} to ${dateFormatter(detector.enabledTime)}`
      : `Detector was stopped from ${dateFormatter(startTime)} until now`;
  const coordinateX0 =
    startTime >= dateRange.startDate.valueOf()
      ? startTime
      : dateRange.startDate.valueOf();
  return [
    {
      coordinates: {
        x0: coordinateX0,
        x1: endTime,
      },
      details: details,
    },
  ];
};

export const ANOMALY_HEATMAP_COLORSCALE = [
  [0, '#F2F2F2'],
  [0.0000001, '#F2F2F2'],
  [0.0000001, '#F7E0B8'],
  [0.2, '#F7E0B8'],
  [0.2, '#F2C596'],
  [0.4, '#F2C596'],
  [0.4, '#ECA976'],
  [0.6, '#ECA976'],
  [0.6, '#E78D5B'],
  [0.8, '#E78D5B'],
  [0.8, '#E8664C'],
  [1, '#E8664C'],
];

export enum AnomalyHeatmapSortType {
  SEVERITY = 'severity',
  OCCURRENCE = 'occurrence',
}

const getHeatmapColorByValue = (value: number) => {
  // check if value is larger than largest value in color scale
  if (
    value >=
    ANOMALY_HEATMAP_COLORSCALE[ANOMALY_HEATMAP_COLORSCALE.length - 1][0]
  ) {
    return ANOMALY_HEATMAP_COLORSCALE[ANOMALY_HEATMAP_COLORSCALE.length - 1][1];
  }
  // check if value is smaller than smallest value in color scale
  if (value <= ANOMALY_HEATMAP_COLORSCALE[0][0]) {
    return ANOMALY_HEATMAP_COLORSCALE[0][1];
  }

  for (let i = 0; i < ANOMALY_HEATMAP_COLORSCALE.length - 1; i++) {
    if (
      value >= ANOMALY_HEATMAP_COLORSCALE[i][0] &&
      value < ANOMALY_HEATMAP_COLORSCALE[i + 1][0]
    ) {
      return ANOMALY_HEATMAP_COLORSCALE[i + 1][1];
    }
  }
};

export const NUM_CELLS = 20;

export const HEATMAP_X_AXIS_DATE_FORMAT = 'MM-DD HH:mm:ss YYYY';

const buildBlankStringWithLength = (length: number) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ' ';
  }
  return result;
};

export const getSampleAnomaliesHeatmapData = (
  anomalies: any[] | undefined,
  dateRange: DateRange,
  sortType: AnomalyHeatmapSortType = AnomalyHeatmapSortType.SEVERITY,
  displayTopNum: number
): PlotData[] => {
  const entityAnomalyResultMap = getEntityAnomaliesMap(anomalies);
  const entityAnomaliesMap = filterEntityAnomalyResultMap(
    entityAnomalyResultMap
  );
  if (isEmpty(entityAnomaliesMap)) {
    // put placeholder data so that heatmap won't look empty
    for (let i = 0; i < displayTopNum; i++) {
      // using blank string with different length as entity values instead of
      // only 1 whitesapce for all entities, to avoid heatmap with single row
      const blankStrValue = buildBlankStringWithLength(i);
      entityAnomaliesMap.set(blankStrValue, []);
    }
  }

  // entityStrings are the string representations used as y-axis labels for the heatmap,
  // and only contain the entity values.
  // entityLists are the entity objects (containing name and value) which are
  // populated in each of the heatmap cells, and used to fetch model-specific results when
  // a user clicks on a particular cell
  const entityStrings = [] as string[];
  const entityLists = [] as any[];
  const maxAnomalyGrades = [] as any[];
  const numAnomalyGrades = [] as any[];

  const timeWindows = calculateTimeWindowsWithMaxDataPoints(
    NUM_CELLS,
    dateRange
  );

  entityAnomaliesMap.forEach((entityAnomalies, entityListAsString) => {
    const maxAnomalyGradesForEntity = [] as number[];
    const numAnomalyGradesForEntity = [] as number[];

    entityStrings.push(entityListAsString);
    entityLists.push(get(entityAnomalies, '0.entity', {}));
    timeWindows.forEach((timeWindow) => {
      const anomaliesInWindow = entityAnomalies.filter(
        (anomaly) =>
          get(anomaly, 'plotTime', 0) <= timeWindow.endDate &&
          get(anomaly, 'plotTime', 0) >= timeWindow.startDate
      );
      const entityAnomalyGrades = anomaliesInWindow.map((anomaly) =>
        get(anomaly, 'anomalyGrade', 0)
      );
      if (!isEmpty(entityAnomalyGrades)) {
        maxAnomalyGradesForEntity.push(Math.max(...entityAnomalyGrades));
        numAnomalyGradesForEntity.push(
          entityAnomalyGrades.filter((anomalyGrade) => anomalyGrade > 0).length
        );
      } else {
        maxAnomalyGradesForEntity.push(0);
        numAnomalyGradesForEntity.push(0);
      }
    });

    maxAnomalyGrades.push(maxAnomalyGradesForEntity);
    numAnomalyGrades.push(numAnomalyGradesForEntity);
  });

  const plotTimes = timeWindows.map((timeWindow) => timeWindow.startDate);
  const plotTimesInString = plotTimes.map((timestamp) =>
    moment(timestamp).format(HEATMAP_X_AXIS_DATE_FORMAT)
  );
  const cellTimeInterval = timeWindows[0].endDate - timeWindows[0].startDate;
  const entityListsTransformed = transformEntityListsForHeatmap(entityLists);
  const plotData = buildHeatmapPlotData(
    plotTimesInString,
    entityStrings,
    maxAnomalyGrades,
    numAnomalyGrades,
    entityListsTransformed,
    cellTimeInterval
  );
  const resultPlotData = sortHeatmapPlotData(plotData, sortType, displayTopNum);
  return [resultPlotData];
};


/**
 * Builds the data for a heatmap plot representing anomalies.
 *
 * @param {any[]} x - The x coordinate value for the cell representing time.
 * @param {any[]} y - Array of newline-separated name-value pairs representing entities. This is used for the y-axis labels and displayed in the mouse hover tooltip.
 * @param {any[]} z - Array representing the maximum anomaly grades.
 * @param {any[]} anomalyOccurrences - Array representing the number of anomalies.
 * @param {any[]} entityLists - JSON representation of name-value pairs. Note that the values may contain special characters such as commas and newlines. JSON is used here because it naturally handles special characters and nested structures.
 * @param {number} cellTimeInterval - The interval covered by each heatmap cell.
 * @returns {PlotData} - The data structure required for plotting the heatmap.
 */
export const buildHeatmapPlotData = (
  x: any[],
  y: any[],
  z: any[],
  anomalyOccurrences: any[],
  entityLists: any[],
  cellTimeInterval: number
): PlotData => {
  //@ts-ignore
  return {
    x: x,
    y: y,
    z: z,
    colorscale: ANOMALY_HEATMAP_COLORSCALE,
    zmin: 0,
    zmax: 1,
    type: 'heatmap',
    showscale: false,
    xgap: 2,
    ygap: 2,
    opacity: 1,
    text: anomalyOccurrences,
    customdata: entityLists,
    hovertemplate:
      '<b>Entities</b>: %{y}<br>' +
      '<b>Time</b>: %{x}<br>' +
      '<b>Max anomaly grade</b>: %{z}<br>' +
      '<b>Anomaly occurrences</b>: %{text}' +
      '<extra></extra>',
    cellTimeInterval: cellTimeInterval,
  } as PlotData;
};

export const getEntityAnomaliesHeatmapData = (
  dateRange: DateRange,
  entitiesAnomalySummaryResult: EntityAnomalySummaries[],
  displayTopNum: number
) => {
  const entityStrings = [] as string[];
  const entityLists = [] as any[];
  const maxAnomalyGrades = [] as any[];
  const numAnomalyGrades = [] as any[];

  const timeWindows = calculateTimeWindowsWithMaxDataPoints(
    NUM_CELLS,
    dateRange
  );

  let entitiesAnomalySummaries = [] as EntityAnomalySummaries[];

  if (isEmpty(entitiesAnomalySummaryResult)) {
    // put placeholder data so that heatmap won't look empty
    for (let i = 0; i < displayTopNum; i++) {
      // using blank string with different length as entity values instead of
      // only 1 whitesapce for all entities, to avoid heatmap with single row
      const blankStrValue = buildBlankStringWithLength(i);
      entitiesAnomalySummaries.push({
        entityList: [
          {
            value: blankStrValue,
          },
        ],
      } as EntityAnomalySummaries);
    }
  } else {
    entitiesAnomalySummaries = entitiesAnomalySummaryResult;
  }

  entitiesAnomalySummaries.forEach((entityAnomalySummaries) => {
    const maxAnomalyGradesForEntity = [] as number[];
    const numAnomalyGradesForEntity = [] as number[];

    const entityString = convertToEntityString(
      get(entityAnomalySummaries, 'entityList', [])
    ) as string;

    const anomaliesSummary = get(
      entityAnomalySummaries,
      'anomalySummaries',
      []
    ) as EntityAnomalySummary[];
    entityStrings.push(entityString);

    const entityList = get(
      entityAnomalySummaries,
      'entityList',
      []
    ) as Entity[];
    entityLists.push(entityList);

    timeWindows.forEach((timeWindow) => {
      const anomalySummaryInTimeRange = anomaliesSummary.filter(
        (singleAnomalySummary) =>
          singleAnomalySummary.startTime >= timeWindow.startDate &&
          singleAnomalySummary.startTime < timeWindow.endDate
      );
      if (isEmpty(anomalySummaryInTimeRange)) {
        maxAnomalyGradesForEntity.push(0);
        numAnomalyGradesForEntity.push(0);
        return;
      }

      const maxAnomalies = anomalySummaryInTimeRange.map((anomalySummary) => {
        return toFixedNumberForAnomaly(
          defaultTo(get(anomalySummary, 'maxAnomaly'), 0)
        );
      });
      const countAnomalies = anomalySummaryInTimeRange.map((anomalySummary) => {
        return defaultTo(get(anomalySummary, 'anomalyCount'), 0);
      });

      maxAnomalyGradesForEntity.push(Math.max(...maxAnomalies));
      numAnomalyGradesForEntity.push(
        countAnomalies.reduce((a, b) => {
          return a + b;
        })
      );
    });

    maxAnomalyGrades.push(maxAnomalyGradesForEntity);
    numAnomalyGrades.push(numAnomalyGradesForEntity);
  });

  const plotTimes = timeWindows.map((timeWindow) => timeWindow.startDate);
  const timeStamps = plotTimes.map((timestamp) =>
    moment(timestamp).format(HEATMAP_X_AXIS_DATE_FORMAT)
  );
  const entityListsTransformed = transformEntityListsForHeatmap(entityLists);

  const plotData = buildHeatmapPlotData(
    timeStamps,
    entityStrings.reverse(),
    maxAnomalyGrades.reverse(),
    numAnomalyGrades.reverse(),
    entityListsTransformed.reverse(),
    timeWindows[0].endDate - timeWindows[0].startDate
  );
  return [plotData];
};

const getEntityAnomaliesMap = (
  anomalies: any[] | undefined
): Map<string, any[]> => {
  const entityAnomaliesMap = new Map<string, any[]>();
  if (anomalies == undefined) {
    return entityAnomaliesMap;
  }
  anomalies.forEach((anomaly) => {
    const entityList = get(anomaly, 'entity', [] as EntityData[]);
    if (isEmpty(entityList)) {
      return;
    }
    const entityListAsString = convertToEntityString(entityList);
    let singleEntityAnomalies = [];
    if (entityAnomaliesMap.has(entityListAsString)) {
      //@ts-ignore
      singleEntityAnomalies = entityAnomaliesMap.get(entityListAsString);
    }
    singleEntityAnomalies.push(anomaly);
    entityAnomaliesMap.set(entityListAsString, singleEntityAnomalies);
  });
  return entityAnomaliesMap;
};

const filterEntityAnomalyResultMap = (
  entityAnomalyResultMap: Map<string, any[]>
) => {
  const entityAnomaliesMap = new Map<string, any[]>();
  entityAnomalyResultMap.forEach((entityAnomalies, entity) => {
    if (
      !isEmpty(entityAnomalies) &&
      !isEmpty(
        entityAnomalies.filter((anomaly) => get(anomaly, 'anomalyGrade', 0) > 0)
      )
    ) {
      entityAnomaliesMap.set(entity, entityAnomalies);
    }
  });
  return entityAnomaliesMap;
};

export const filterHeatmapPlotDataByY = (
  heatmapData: PlotData,
  selectedYs: Datum[],
  sortType: AnomalyHeatmapSortType
) => {
  const originalYs = cloneDeep(heatmapData.y);
  const originalZs = cloneDeep(heatmapData.z);
  const originalTexts = cloneDeep(heatmapData.text);
  const originalEntityLists = cloneDeep(heatmapData.customdata);
  const resultYs = [];
  const resultZs = [];
  const resultTexts = [];
  const resultEntityLists = [];
  for (let i = 0; i < originalYs.length; i++) {
    //@ts-ignore
    if (selectedYs.includes(originalYs[i])) {
      resultYs.push(originalYs[i]);
      resultZs.push(originalZs[i]);
      resultTexts.push(originalTexts[i]);
      resultEntityLists.push(originalEntityLists[i]);
    }
  }
  const updateHeatmapPlotData = {
    ...cloneDeep(heatmapData),
    y: resultYs,
    z: resultZs,
    text: resultTexts,
    customdata: resultEntityLists,
  } as PlotData;
  return sortHeatmapPlotData(
    updateHeatmapPlotData,
    sortType,
    selectedYs.length
  );
};

export const sortHeatmapPlotData = (
  heatmapData: PlotData,
  sortType: AnomalyHeatmapSortType,
  topNum: number
) => {
  const originalYs = cloneDeep(heatmapData.y);
  const originalZs = cloneDeep(heatmapData.z);
  const originalTexts = cloneDeep(heatmapData.text);
  const originalEntityLists = cloneDeep(heatmapData.customdata);

  const originalValuesToSort =
    sortType === AnomalyHeatmapSortType.SEVERITY
      ? cloneDeep(originalZs)
      : cloneDeep(originalTexts);
  const funcToAggregate =
    sortType === AnomalyHeatmapSortType.SEVERITY
      ? (a: number, b: number) => {
          return Math.max(a, b);
        }
      : (a: number, b: number) => {
          return a + b;
        };
  const yIndicesToSort = [] as object[];
  for (let i = 0; i < originalYs.length; i++) {
    yIndicesToSort.push({
      index: i,
      //@ts-ignore
      value: originalValuesToSort[i].reduce(funcToAggregate),
    });
  }
  const sortedYIndices = orderBy(yIndicesToSort, ['value'], 'desc').slice(
    0,
    topNum
  );
  const resultYs = [] as any[];
  const resultZs = [] as any[];
  const resultTexts = [] as any[];
  const resultEntityLists = [] as any[];
  for (let i = sortedYIndices.length - 1; i >= 0; i--) {
    const index = get(sortedYIndices[i], 'index', 0);
    resultYs.push(originalYs[index]);
    resultZs.push(originalZs[index]);
    resultTexts.push(originalTexts[index]);
    resultEntityLists.push(originalEntityLists[index]);
  }
  return {
    ...cloneDeep(heatmapData),
    y: resultYs,
    z: resultZs,
    text: resultTexts,
    customdata: resultEntityLists,
  } as PlotData;
};

export const updateHeatmapPlotData = (heatmapData: PlotData, update: any) => {
  return {
    ...cloneDeep(heatmapData),
    ...update,
  } as PlotData;
};

export const getSelectedHeatmapCellPlotData = (
  heatmapData: PlotData,
  selectedX: number,
  selectedY: number
) => {
  const originalZ = cloneDeep(heatmapData.z);
  const selectedZData = [];
  //@ts-ignore
  const selectedValue = originalZ[selectedY][selectedX];
  for (let i = 0; i < originalZ.length; i++) {
    const row = [];
    //@ts-ignore
    for (let j = 0; j < originalZ[0].length; j++) {
      if (i === selectedY && j === selectedX) {
        row.push(selectedValue);
      } else {
        row.push(null);
      }
    }
    selectedZData.push(row);
  }
  const colorForCell = getHeatmapColorByValue(selectedValue);
  //@ts-ignore
  return [
    {
      ...cloneDeep(heatmapData),
      z: selectedZData,
      colorscale: [
        [0, colorForCell],
        [1, colorForCell],
      ],
      opacity: 1,
      hoverinfo: 'skip',
      hovertemplate: null,
    },
  ] as PlotData[];
};

export const getAnomalyGradeWording = (isNotSample: boolean | undefined) => {
  return isNotSample ? 'Anomaly grade' : 'Sample anomaly grade';
};

export const getConfidenceWording = (isNotSample: boolean | undefined) => {
  return isNotSample ? 'Confidence' : 'Sample confidence';
};

export const getFeatureBreakdownWording = (
  isNotSample: boolean | undefined
) => {
  return isNotSample ? 'Feature breakdown' : 'Sample feature breakdown';
};

export const getFeatureDataWording = (isNotSample: boolean | undefined) => {
  return isNotSample ? 'Feature output' : 'Sample feature output';
};

export const getLastAnomalyOccurrenceWording = (
  isNotSample: boolean | undefined
) => {
  return isNotSample
    ? 'Last anomaly occurrence'
    : 'Last sample anomaly occurrence';
};

export const getAnomalyOccurrenceWording = (
  isNotSample: boolean | undefined
) => {
  return isNotSample ? 'Anomaly occurrences' : 'Sample anomaly occurrences';
};

export const getAnomalyHistoryWording = (
  isNotSample: boolean | undefined,
  isHistorical: boolean | undefined
) => {
  return isNotSample
    ? isHistorical
      ? 'Anomaly history'
      : 'Anomaly overview'
    : 'Sample anomaly history';
};

export const getDateRangeWithSelectedHeatmapCell = (
  originalDateRange: DateRange,
  isHCDetector: boolean | undefined,
  heatmapCell: HeatmapCell | undefined
) => {
  if (isHCDetector && heatmapCell) {
    return heatmapCell.dateRange;
  }
  return originalDateRange;
};

export const getHCTitle = (entityList: Entity[]) => {
  return (
    <div>
      <EuiTitle size="s">
        <h3>
          {entityList.map((entity: Entity) => {
            return (
              <div>
                {entity.name}: <b>{entity.value}</b>{' '}
              </div>
            );
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
    </div>
  );
};

export const getCategoryFieldOptions = (categoryFields: string[]) => {
  const categoryFieldOptions = [] as any[];
  if (categoryFields !== undefined) {
    categoryFields.forEach((categoryField: string) => {
      categoryFieldOptions.push({
        label: categoryField,
      });
    });
  }
  return categoryFieldOptions;
};

// Split up the child entity values into their respective category fields, to pass as options to the dropdowns.
// For example, given child category fields ['A', 'B'], and child entity values
// [ [ { name: 'A', value: 'A1' }, { name: 'B', value: 'B1' } ], [ { name: 'A', value: 'A2' }, { name: 'B', value: 'B1' } ] ],
// => { [A]: [ { label: 'A1' }, { label: 'A2' } ], [B]: [ { label: B1 } ] }
const getChildEntities = (
  childCategoryFields: string[],
  childEntityCombos: Entity[][]
) => {
  const childEntityOptionsMap = {} as EntityOptionsMap;
  childCategoryFields.forEach((categoryField: string) => {
    // init the map for each category field
    childEntityOptionsMap[categoryField] = [] as EntityOption[];
    childEntityCombos.forEach((childEntityCombo: Entity[]) => {
      childEntityCombo.forEach((childEntity: Entity) => {
        if (categoryField === childEntity.name) {
          childEntityOptionsMap[categoryField].push({
            label: childEntity.value,
          });
        }
      });
    });
  });
  return childEntityOptionsMap;
};

// Returns a string list of selected parent entities (populated from the selected heatmap cell)
// + an array of comboboxes, one for each child category field. Populates the top
// child entities per combo box.
export const getMultiCategoryFilters = (
  parentEntities: Entity[],
  childEntities: Entity[][],
  allCategoryFields: string[],
  selectedChildEntities: EntityOptionsMap,
  onSelectedOptionsChange: (childCategoryField: string, options: any[]) => void,
  sortType: AnomalyHeatmapSortType
) => {
  const parentEntityFields = parentEntities.map(
    (entity: Entity) => entity.name
  );
  const childCategoryFields = allCategoryFields.filter(
    (categoryField: string) => !parentEntityFields.includes(categoryField)
  );

  // Based on the available child entities, categorize them into their appropriate category field
  // so each combo box can be filled with the appopriate entity options
  const childEntityOptions = getChildEntities(
    childCategoryFields,
    childEntities
  );

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      direction="column"
      style={{ marginBottom: '4px' }}
    >
      <EuiFlexItem grow={false}>{getHCTitle(parentEntities)}</EuiFlexItem>
      {childCategoryFields.map((childCategoryField: string) => {
        return (
          <EuiFlexItem>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: '-8px',
              }}
            >
              <EuiFlexItem style={{ marginBottom: '32px' }}>
                <EuiText>
                  <h3>{childCategoryField}:&nbsp;&nbsp;</h3>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem style={{ minWidth: 300 }} grow={false}>
                <div>
                  <EuiComboBox
                    placeholder="Select categorical fields"
                    options={childEntityOptions[childCategoryField]}
                    selectedOptions={selectedChildEntities[childCategoryField]}
                    onChange={(options: any[]) =>
                      onSelectedOptionsChange(childCategoryField, options)
                    }
                  />
                  <EuiText
                    className="sublabel"
                    style={{
                      marginLeft: '0px',
                      marginBottom: '0px',
                      marginTop: '4px',
                      maxWidth: 300,
                    }}
                  >
                    {/**
                     * This is currently correct, in that the top TOP_CHILD_ENTITIES_TO_FETCH for this
                     * single child category field will be fetched and available to view. But in the future,
                     * if we add more category fields and more possible child category fields, we will only fetch
                     * the top TOP_CHILD_ENTITIES_TO_FETCH values across ALL child category fields, so it may
                     * be split between them. In that case this help text will need to be changed.
                     */}
                    {`Top ${TOP_CHILD_ENTITIES_TO_FETCH} ${childCategoryField}s sorted by anomaly ${sortType}. You may select up to ${MAX_TIME_SERIES_TO_DISPLAY}.`}
                  </EuiText>
                </div>
              </EuiFlexItem>
            </div>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

// Get a list of entity lists, where each list represents a unique entity combination of
// all parent + child entities (a single model).
// In order to get all unique results, we first gather all of the entity sources, then get the cartesian product
// of such sources. Each "source" here represents unique entities for a single category field. For example,
// consider category field A with entities [A1, A2], and category field B with entities [B1, B2].
// The sources would be: [[A1, A2], [B1, B2]]
// The cartesian product would be [[A1, B1], [A1, B2], [A2, B1], [A2, B2]]
export const getAllEntityCombos = (
  parentEntities: Entity[],
  childEntities: EntityOptionsMap
) => {
  let entitySources = [] as Entity[][];
  // getting parent sources
  entitySources.push(parentEntities);

  // getting all child sources
  for (var childCategoryField in childEntities) {
    let curChildEntities = [] as Entity[];
    childEntities[childCategoryField].forEach(
      (childEntityValue: EntityOption) => {
        const childEntity = {
          name: childCategoryField,
          value: childEntityValue.label,
        } as Entity;
        curChildEntities.push(childEntity);
      }
    );
    entitySources.push(curChildEntities);
  }

  // Common JS pattern to return a cartesian product of an array of arrays, by iterating through
  // pairs of results, and appending all values of the current array to all values in the previous array.
  //
  // reduce(): set a custom fn to perform on the current and previous values in the array
  // map(): set a custom fn on the current value in the array
  // flatMap(): similar to map(), but flattens the result into a single-depth array
  //
  // More info: https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
  return entitySources.reduce(
    //@ts-ignore
    (a, b) => a.flatMap((x) => b.map((y) => [...x, y])),
    [[]]
  ) as Entity[][];
};
