/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import React, { FC, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import moment, { DurationInputArg2 } from 'moment';
import {
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSelect,
  EuiSmallButton,
  EuiCompressedSuperDatePicker,
  EuiToolTip,
  EuiButtonEmpty,
  EuiText,
  EuiLoadingSpinner,
  EuiBadge,
  EuiHealth,
  EuiCallOut,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiAccordion,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiForm,
  EuiCodeEditor,
  EuiFieldNumber,
  EuiCodeBlock,
  EuiSwitch,
  EuiIconTip,
  EuiSmallButtonEmpty,
} from '@elastic/eui';
import {
  Chart,
  Settings,
  Axis,
  Position,
  ScaleType,
  LineSeries,
  AreaSeries,
  AnnotationDomainType,
  LineAnnotation,
  PointerEvent,
  TooltipValue,
} from '@elastic/charts';
import { CustomTooltip } from './CustomTooltip';
import { FORECASTER_STATE, isActiveState, isTestState } from '../../../../../server/utils/constants';
import { InitializingText } from './InitializingText';
import { Forecaster } from '../../../../models/interfaces';
import { Entity, ForecastResult } from '../../../../../server/models/interfaces';
import dateMath from '@elastic/datemath';
import { DATE_PICKER_QUICK_OPTIONS, MAX_POINTS } from '../../utils/constant';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { CoreStart } from '../../../../../../../src/core/public';
import '../../index.scss';
import { DateRange } from '../../utils/interface';
import { convertToEpochRange, isRelativeDateRange, } from '../../utils/dateUtils';
import { VisualizationOptions, ALL_CATEGORICAL_FIELDS } from '../../../utils/forecastResultUtils';
import _ from 'lodash';

/**
 * ForecastChart follows unidirectional data flow pattern where:
 * - It receives data through props from parent (ForecasterDetail)
 * - It renders visualizations based on received data
 * - It requests data changes through a single callback (onDataRequest)
 * - It doesn't directly own or manage the data fetching state
 */
interface ForecastChartProps {
  isLoading: boolean;
  isResultsLoading: boolean;
  forecaster: Forecaster;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  maxPoints: number;
  forecastResults?: ForecastResult[];
  dataSourceId: string;
  // Single unified callback for requesting data changes from parent
  onDataRequest: () => void;
  forecastFrom: number | undefined;
  setForecastFrom: (value: number | undefined) => void;
  visualizationOptions: VisualizationOptions;
  onUpdateVisualizationOptions: (options: VisualizationOptions) => void;
}

const NO_ENTITY_SUFFIX = '_noEntity';
const UNKNOWN_ENTITY_KEY = 'unknown';

export const ForecastChart: FC<ForecastChartProps> = ({
  isLoading,
  isResultsLoading,
  forecaster,
  dateRange,
  setDateRange,
  maxPoints,
  forecastResults = [],
  dataSourceId,
  onDataRequest,
  forecastFrom,
  setForecastFrom,
  visualizationOptions,
  onUpdateVisualizationOptions,
}) => {
  const [forecastTo, setForecastTo] = useState<number | undefined>(undefined);

  // a combined state as we often update them together. This can avoid a few renders
  // as each setState schedules a new render and separate updates trigger multiple re-renders. 
  const [{ windowStart, windowSize }, setWindow] = useState({
    windowStart: 0,
    windowSize: 0,
  });

  // Each `ForecastResult` has a "start" (plotTime) plus known forecastFrom/forecastTo
  //    We'll populate a dropdown from each result's "plotTime".
  //    Then internally, we read that result's forecastFrom / forecastTo
  const forecastRuns = useMemo(() => {
    // Filter to only results that have valid arrays, etc.
    const valid = forecastResults.filter((fr) => fr.forecastEndTime?.length);
    // Sort by plotTime ascending
    valid.sort((a, b) => (a.plotTime ?? 0) - (b.plotTime ?? 0));
    return valid;
  }, [forecastResults]);

  // Build a dropdown of forecast runs by "plotTime"
  const forecastFromOptions = useMemo(() => {
    // Create a Map to deduplicate by plotTime
    const uniquePlotTimes = new Map();

    // Process all forecast runs, keeping only the most recent one for each plotTime
    forecastRuns.forEach((fr) => {
      const plotTime = fr.plotTime ?? 0;

      // Only add if we haven't seen this plotTime before
      if (!uniquePlotTimes.has(plotTime)) {
        uniquePlotTimes.set(plotTime, {
          text: moment(plotTime).format('MMM DD, YYYY @ HH:mm'),
          value: plotTime,
        });
      }
    });

    // Convert the Map values back to an array
    return Array.from(uniquePlotTimes.values());
  }, [forecastRuns]);

  // add the memoized value for the last forecast point
  const lastForecastPointValue = useMemo(() => {
    if (!forecastFromOptions || forecastFromOptions.length === 0) {
      return undefined;
    }
    return forecastFromOptions[forecastFromOptions.length - 1].value;
  }, [forecastFromOptions]);

  // get the effective forecast point
  // if forecastFrom is set by user, use forecastFrom, otherwise use the last forecast point
  const getEffectiveForecastPoint = useCallback(() => {
    return forecastFrom !== undefined ? forecastFrom : lastForecastPointValue;
  }, [forecastFrom, lastForecastPointValue]);

  // Full forecast label:
  const fullForecastLabel = useMemo(() => {
    const effectiveForecast = getEffectiveForecastPoint();
    // if effectiveForecast is null/undefined, it means no forecast point is available
    return effectiveForecast != null
      ? `Forecast from ${moment(effectiveForecast).format('MMM DD, YYYY @ HH:mm')}`
      : null; // Return null when no forecast point is available
  }, [getEffectiveForecastPoint]);

  // have a separate state for the date picker range
  // because the date picker range is not the same as the date range
  // the date picker range is the range that is displayed in the date picker
  // the date range is the range that is used to fetch the data
  const [datePickerRange, setDatePickerRange] = useState({
    start: dateRange.startDate.toString(),
    end: dateRange.endDate.toString(),
  });

  // Add these logs to each useEffect to debug which one is causing the infinite update

  // useEffect for datePickerRange
  useEffect(() => {

    setDatePickerRange({
      start: dateRange.startDate.toString(),
      end: dateRange.endDate.toString(),
    });
  }, [dateRange.startDate, dateRange.endDate]);

  const handleDatePickerChange = (start: string, end: string) => {
    if (start && end) {
      // Parse the date strings to Moment objects
      const startTime: moment.Moment | undefined = dateMath.parse(start);
      if (startTime) {
        const endTime: moment.Moment | undefined =
          start === end && start.startsWith('now/')
            ? moment(startTime)
              .add(1, start.slice(start.length - 1) as DurationInputArg2)
              .subtract(1, 'milliseconds')
            : dateMath.parse(end);

        if (endTime) {
          // Convert to timestamps (epoch milliseconds)
          const startTimestamp = startTime.valueOf();
          const endTimestamp = endTime.valueOf();

          // handleDateRangeChange(startTimestamp, endTimestamp, start, end);

          // Convert the current dateRange to absolute timestamps for comparison
          const { startDate: currentStartTimestamp, endDate: currentEndTimestamp } =
            convertToEpochRange(dateRange);

          // Now compare using the converted values
          if (
            startTimestamp >= currentStartTimestamp &&
            endTimestamp <= currentEndTimestamp
          ) {
            handleZoomRangeChange(startTimestamp, endTimestamp, start, end);
          } else {
            handleDateRangeChange(startTimestamp, endTimestamp, start, end);
          }
        }
      }
    }
  };

  /**
   * Handles date range changes from the date picker
   * @param startMs epoch milliseconds, parsed from start
   * @param endMs epoch milliseconds, parsed from end
   * @param start string original start string either in datemath or absolute date
   * @param end string original end string either in datemath or absolute date
   */
  const handleDateRangeChange = (startMs: number, endMs: number, start: string, end: string) => {
    // Ensure start <= end
    if (startMs > endMs) {
      console.warn('handleDateRangeChange: startValue is after endValue, aborting.');
      setWindow({ windowStart: 0, windowSize: 0 });
      return;
    }

    // Convert milliseconds to minutes before dividing by the interval
    const millisecondsToMinutes = (endMs - startMs) / (1000 * 60);

    // Check if range contains too many points
    if (forecaster.forecastInterval &&
      millisecondsToMinutes / forecaster.forecastInterval.period.interval > MAX_POINTS) {
      setShowOutOfRangeCallOut(true);
      return;
    }

    // Hide callout if they now picked a smaller range
    setShowOutOfRangeCallOut(false);

    // Update parent's date range state with the string values
    // Use the helper function from dateUtils
    setDateRange({
      startDate: start,
      endDate: end,
      isRelative: isRelativeDateRange(start, end)
    });
  };

  // Add a state to control "out of range" callout visibility
  const [showOutOfRangeCallOut, setShowOutOfRangeCallOut] = useState(false);

  /**
   * Handles zoom date range changes from the date picker
   * @param startMs epoch milliseconds, parsed from start
   * @param endMs epoch milliseconds, parsed from end
   * @param start string original start string either in datemath or absolute date
   * @param end string original end string either in datemath or absolute date
   */
  const handleZoomRangeChange = (startValue: number, endValue: number, start: string, end: string) => {
    // Add this line to hide the callout when a valid zoom range is selected
    setShowOutOfRangeCallOut(false);

    // update the date picker range
    setDatePickerRange({
      start: start,
      end: end,
    });

    if (!combinedData || combinedData.length === 0) return;

    // Ensure start <= end
    if (startValue > endValue) {
      console.warn('handleZoomRangeChange: startValue is after endValue, aborting.');
      return;
    }

    // Find the first index whose x >= startValue
    let startIndex = uniqueTimestamps.findIndex((x) => x >= startValue);
    // If findIndex returns -1, it means all x < startValue,
    // so the chosen range is to the right of all data. In that case,
    // you can clamp `i` to the last point or handle as "no data."
    if (startIndex === -1) {
      // All points are before startValue
      setWindow({ windowStart: 0, windowSize: 0 });
      core.notifications?.toasts.addWarning({
        title: 'No data in selected range',
        text: `All data points are before ${moment(startValue).format('MMM DD, YYYY HH:mm')}`,
      });
      return;
    }

    const endIndex = findLastIndex(uniqueTimestamps, t => t <= endValue);
    if (endIndex === -1) {
      // Show warning toast
      core.notifications?.toasts.addWarning({
        title: 'No data in selected range',
        text: `All data points are after ${moment(endValue).format('MMM DD, YYYY HH:mm')}`,
      });
      return;
    }

    if (endIndex < startIndex) {
      // Show warning toast
      core.notifications?.toasts.addWarning({
        title: 'No data in selected range',
        text: `No data points found between ${moment(startValue).format('MMM DD, YYYY HH:mm')} and ${moment(endValue).format('MMM DD, YYYY HH:mm')}`,
      });
      return;
    }

    // new window size
    let newWindowSize = endIndex - startIndex + 1;

    if (newWindowSize > maxPoints) {
      setWindow({ windowSize: maxPoints, windowStart: uniqueTimestamps.length - maxPoints });
    } else {
      setWindow({ windowSize: newWindowSize, windowStart: startIndex });
    }

    // Update parent's date range state with the string values
    // Use the helper function from dateUtils
    // it will help live update the date range in the parent component
    // when it auto refresh the data. For example, when the user zoom in
    // to include from last 24hr to last 3hr, the date range will be updated
    // we will only fetch last 3hr data in the next auto refresh.
    // We also have out of range check in the parent component, so it will
    // not fetch data if the new date range is within the old date range.
    setDateRange({
      startDate: start,
      endDate: end,
      isRelative: isRelativeDateRange(start, end)
    });
  };

  const EMPTY_ARRAY = useMemo(() => [], []);

  // "Selected" forecast run => from forecastFrom
  //    Find the first plotTime that's >= forecastFrom
  //    Then keep all forecasts that share this same plotTime
  const selectedForecasts = useMemo(() => {
    const effectiveForecast = getEffectiveForecastPoint();
    // return a stable reference. Otherwise, React sees a new empty array every time
    // and triggers the useEffect below, causing unnecessary updates.
    if (effectiveForecast == null || !forecastRuns || forecastRuns.length === 0) return EMPTY_ARRAY;

    // Find the first plotTime that's >= effectiveForecast
    const firstMatchingPlotTime = forecastRuns.find(fr => (fr.plotTime ?? 0) == effectiveForecast)?.plotTime;

    // If no matching plotTime is found, return empty array
    if (firstMatchingPlotTime === undefined) return [];

    // Return all forecasts with this plotTime
    return forecastRuns.filter(fr => (fr.plotTime ?? 0) === firstMatchingPlotTime);
  }, [forecastRuns, getEffectiveForecastPoint]);

  const prevSelectedForecastsRef = useRef<typeof selectedForecasts | null>(null);

  // Replace the existing effect with this optimized version
  useEffect(() => {
    // Skip if there are no selected forecasts
    if (selectedForecasts.length === 0) {
      if (forecastTo !== undefined) {
        setForecastTo(undefined);
      }
      prevSelectedForecastsRef.current = selectedForecasts;
      return;
    }

    // Deep comparison - check if selectedForecasts has actually changed
    const prevForecasts = prevSelectedForecastsRef.current;
    const hasChanged = !prevForecasts ||
      prevForecasts.length !== selectedForecasts.length ||
      JSON.stringify(prevForecasts) !== JSON.stringify(selectedForecasts);

    if (!hasChanged) {
      return; // Skip processing if selectedForecasts hasn't changed
    }

    // Grab the first forecast run
    const firstRun = selectedForecasts[0];
    const endTimes = firstRun.forecastEndTime ?? [];

    if (endTimes.length === 0) {
      if (forecastTo !== undefined) {
        setForecastTo(undefined);
      }
      prevSelectedForecastsRef.current = selectedForecasts;
      return;
    }

    // e.g. last element is the max time
    const lastTime = endTimes[endTimes.length - 1];
    const newForecastTo = moment(lastTime).valueOf();

    // Only update state if the value has actually changed
    if (forecastTo !== newForecastTo) {
      setForecastTo(newForecastTo);
    }

    // Store the current selectedForecasts for future comparison
    prevSelectedForecastsRef.current = selectedForecasts;

  }, [selectedForecasts]); // Removed forecastTo from dependencies

  // Build "actual" data. 
  //    We only want to show actual if x < forecastFrom or x > forecastTo
  //    (no overlap with forecast window).
  const allActualData = useMemo(() => {
    if (!forecastResults) return [];

    return forecastResults.flatMap((fr) => {
      if (!fr.features) return [];
      const featureId = Object.keys(fr.features)[0];
      const featureData = fr.features[featureId];
      if (!featureData) return [];

      const xVal = moment(featureData.plotTime).valueOf();
      const val = featureData.data;

      return [{ x: xVal, actual: val, entityId: fr.entityId, entity: fr.entity }];
    });
  }, [forecastResults]);

  // Add these new state variables near your other useState declarations
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [selectedHorizonIndex, setSelectedHorizonIndex] = useState(3);

  // Add this new state variable near your other useState declarations
  const [horizonIndexError, setHorizonIndexError] = useState<string | null>(null);

  // Add this new state variable to track the input string
  const [horizonIndexInput, setHorizonIndexInput] = useState<string>('3'); // Default to "3"

  //Forecast data from the selected forecast run, only keep x in [forecastFrom, forecastTo]
  // Combine the forecast data from *each* matching forecast
  const forecastData = useMemo(() => {
    if (isOverlayMode) {
      // In overlay mode, we extract data from all forecasts at the specified horizon index
      return forecastResults.map(forecast => {
        const horizonIndex = Math.min(
          selectedHorizonIndex,
          (forecast.forecastEndTime?.length || 0)
        ) - 1; // -1 because the data starts at index 0, for user it starts at index 1

        // Only include if we have valid data at this index
        if (forecast.forecastEndTime &&
          horizonIndex >= 0 &&
          horizonIndex < forecast.forecastEndTime.length) {

          return {
            x: +moment(forecast.forecastEndTime[horizonIndex]),
            forecast: forecast.forecastValue?.[horizonIndex],
            entityId: forecast.entityId,
            entity: forecast.entity
          };
        }
        return null;
      }).filter(item => item !== null);
    } else {
      // Original implementation for standard mode
      return selectedForecasts.flatMap((fr) => {
        const { forecastEndTime = [], forecastValue = [], entityId, entity } = fr;
        return forecastEndTime.map((timeStr, i) => ({
          x: +moment(timeStr),
          forecast: forecastValue[i],
          entityId,
          entity,
        }));
      }).filter((pt) => {
        const effectiveForecastFrom = getEffectiveForecastPoint();
        if (effectiveForecastFrom == null || forecastTo == null) return true;
        // keep only points within (forecastFrom, forecastTo]
        return pt.x > effectiveForecastFrom && pt.x <= forecastTo;
      });
    }
  }, [
    selectedForecasts, getEffectiveForecastPoint, forecastTo,
    isOverlayMode, forecastResults, selectedHorizonIndex
  ]);

  // Forecast bounds similarly in [forecastFrom, forecastTo]
  const forecastBoundsData = useMemo(() => {
    if (isOverlayMode) {
      // In overlay mode, extract bounds data for the selected horizon
      return forecastResults.map(forecast => {
        const horizonIndex = Math.min(
          selectedHorizonIndex,
          (forecast.forecastEndTime?.length || 0)
        ) - 1; // -1 because the data starts at index 0, for user it starts at index 1

        // Only include if we have valid data and bounds at this index
        if (forecast.forecastEndTime &&
          forecast.forecastUpperBound &&
          forecast.forecastLowerBound &&
          horizonIndex >= 0 &&
          horizonIndex < forecast.forecastEndTime.length) {

          return {
            x: +moment(forecast.forecastEndTime[horizonIndex]),
            upper: forecast.forecastUpperBound[horizonIndex],
            lower: forecast.forecastLowerBound[horizonIndex],
            entityId: forecast.entityId,
            entity: forecast.entity
          };
        }
        return null;
      }).filter(item => item !== null);
    } else if (!selectedForecasts || selectedForecasts.length === 0) {
      return [];
    } else {
      // Original implementation for standard mode
      return selectedForecasts.flatMap((forecast) => {
        const {
          forecastEndTime = [],
          forecastUpperBound = [],
          forecastLowerBound = [],
          entityId,
          entity,
        } = forecast;

        return forecastEndTime.map((timeStr: string, i: number) => {
          const xVal = moment(timeStr).valueOf();
          return {
            x: xVal,
            upper: forecastUpperBound[i],
            lower: forecastLowerBound[i],
            entityId,
            entity,
          };
        });
      }).filter((pt: any) => {
        const effectiveForecastFrom = getEffectiveForecastPoint();
        if (effectiveForecastFrom == null || forecastTo == null) return true;
        // Keep only points within (forecastFrom, forecastTo]
        return pt.x > effectiveForecastFrom && pt.x <= forecastTo;
      });
    }
  }, [
    selectedForecasts, getEffectiveForecastPoint, forecastTo,
    isOverlayMode, forecastResults, selectedHorizonIndex
  ]);

  type Row = {
    x: number;
    actual: number | null;
    forecast: number | null;
    upper: number | null;
    lower: number | null;
    entityId: string | null;
    entity: Entity[] | null;
  };

  // useMemo ensures the same reference unless contents change
  const combinedData = useMemo(() => {
    // store a string key combining time + entityId
    const map = new Map<string, Row>();

    // Helper function to create or retrieve a row
    const getOrCreateRow = (x: number, entityId?: string | undefined,): Row => {
      // Construct a unique key from x plus entityId
      const key = entityId ? `${x}_${entityId}` : `${x}${NO_ENTITY_SUFFIX}`;
      const existingRow = map.get(key);
      if (existingRow) return existingRow;

      const newRow: Row = {
        x,
        entityId: entityId ?? null,
        actual: null,
        forecast: null,
        upper: null,
        lower: null,
        entity: null,
      };
      map.set(key, newRow);
      return newRow;
    };

    // Helper to update entity info if provided
    const updateEntityInfo = (row: Row, entityId?: string, entity?: Entity[]): void => {
      if (entityId !== undefined && entity !== undefined) {
        row.entityId = entityId;
        row.entity = entity;
      }
    };

    // Populate actual
    for (const { x, actual, entityId, entity } of allActualData) {
      const row = getOrCreateRow(x, entityId);
      row.actual = actual;
      updateEntityInfo(row, entityId, entity);
      // Use composite key with entityId
      const key = entityId ? `${x}_${entityId}` : `${x}${NO_ENTITY_SUFFIX}`;
      map.set(key, row);
    }

    // Populate forecast
    for (const { x, forecast, entityId, entity } of forecastData) {
      const row = getOrCreateRow(x, entityId);
      row.forecast = forecast;
      updateEntityInfo(row, entityId, entity);
      map.set(`${x}_${entityId}`, row);
    }

    // Populate bounds
    for (const { x, upper, lower, entityId, entity } of forecastBoundsData) {
      const row = getOrCreateRow(x, entityId,);
      row.upper = upper;
      row.lower = lower;
      updateEntityInfo(row, entityId, entity);
      map.set(`${x}_${entityId}`, row);
    }

    // After all data is processed, update the unique timestamp count
    return Array.from(map.values()).sort((a, b) => a.x - b.x);
  }, [allActualData, forecastData, forecastBoundsData]);

  // useMemo ensures the same reference unless contents change
  const uniqueTimestamps = useMemo(() => {
    if (combinedData.length === 0) return [];

    // Extract and sort all unique timestamps
    const uniqueXValues = Array.from(new Set(combinedData.map(d => d.x))).sort((a, b) => a - b);

    return uniqueXValues;
  }, [combinedData]);

  const lastWindowStartUpdateRef = useRef({
    windowStart: 0,
    timestamp: 0
  });

  useEffect(() => {
    if (uniqueTimestamps.length > 0) {
      const total = uniqueTimestamps.length;
      let newWindowSize, newWindowStart;

      // If total < maxPoints, show all. Otherwise show exactly maxPoints pinned to the right.
      if (total <= maxPoints) {
        // Show everything
        newWindowSize = total;
        newWindowStart = 0;
      } else {
        // Show last maxPoints
        const maxPossible = Math.min(total, maxPoints);
        newWindowSize = maxPossible;
        newWindowStart = total - maxPossible;
      }

      const now = Date.now();
      const lastUpdate = lastWindowStartUpdateRef.current;
      const timeSinceLastUpdate = now - lastUpdate.timestamp;

      // Is this a small change to windowStart happening too quickly?
      const isSmallRapidWindowStartChange =
        timeSinceLastUpdate < 100 &&
        Math.abs(newWindowStart - lastUpdate.windowStart) <= 2;

      // First check if anything changed at all to avoid unnecessary updates
      const noChange = newWindowSize === windowSize && newWindowStart === windowStart;
      
      // Only evaluate other conditions if there's actually a change
      const shouldUpdate = 
        !noChange && (
          newWindowSize !== windowSize || 
          !isSmallRapidWindowStartChange
        );

      if (shouldUpdate) {

        // Update the state
        setWindow({
          windowStart: newWindowStart,
          windowSize: newWindowSize
        });

        // Only update the timestamp reference for windowStart changes
        if (newWindowStart !== windowStart) {
          lastWindowStartUpdateRef.current = {
            windowStart: newWindowStart,
            timestamp: now
          };
        }
      } else {
        console.log('Skipping change', {
          timeSinceLastUpdate,
          currentStart: windowStart,
          newStart: newWindowStart,
          diff: Math.abs(newWindowStart - lastUpdate.windowStart)
        });
      }
    }
  }, [maxPoints, uniqueTimestamps]);

  // Helper function for findLastIndex (place near the top with other helpers)
  function findLastIndex<T>(array: T[], predicate: (value: T) => boolean): number {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i])) {
        return i;
      }
    }
    return -1;
  }

  // Update the windowedData useMemo to handle unique x values properly
  const windowedData = useMemo(() => {
    if (combinedData.length === 0 || uniqueTimestamps.length === 0) return [];

    // If windowSize is 0, return empty result
    if (windowSize === 0) return [];

    // Get the windowed timestamp range
    const timestampSlice = uniqueTimestamps.slice(windowStart, windowStart + windowSize);
    if (timestampSlice.length === 0) return [];

    // Get min and max timestamps in our window
    const minTimestamp = timestampSlice[0];
    const maxTimestamp = timestampSlice[timestampSlice.length - 1];

    // Filter combinedData to only include rows with x values in our window
    const data = combinedData.filter(
      row => row.x >= minTimestamp && row.x <= maxTimestamp
    );

    return data;
  }, [combinedData, uniqueTimestamps, windowStart, windowSize]);

  // Group data by entityId for plotting
  const dataByEntity = useMemo(() => {
    // Group by entityId 
    const groups = new Map<string, typeof windowedData>();

    // Process each data point
    for (const point of windowedData) {
      // Skip points with no data
      if (!point.forecast && !point.upper && !point.lower && !point.actual) {
        continue;
      }

      // For both actual and forecast data, group by entityId
      const entityKey = point.entityId || UNKNOWN_ENTITY_KEY;

      // Create the group if it doesn't exist
      if (!groups.has(entityKey)) {
        groups.set(entityKey, []);
      }

      // Clone the point to avoid modifying the original
      const dataPoint = { ...point };
      groups.get(entityKey)!.push(dataPoint);
    }

    // Filter out empty groups
    return new Map([...groups.entries()].filter(([_, data]) => data.length > 0));
  }, [windowedData]);

  // Track which entity is being hovered over (for showing/hiding confidence intervals)
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);

  // Helper to determine if we should show confidence interval
  // Only show when: only one entity exists, OR the specific entity is being hovered over
  // OR we are showing only one time series per page
  const shouldShowConfidenceInterval = (entityId: string) => {
    return dataByEntity.size === 1 || hoveredEntityId === entityId || seriesPerPage === 1;
  };

  // Helper to get entity display name
  const getEntityLabel = (entityId: string, entityData: typeof windowedData): string => {
    // Try to get entity name from first point that has entity info
    for (const point of entityData) {
      if (point.entity && point.entity.length > 0) {
        const entityNames = point.entity.map(e => `${e.value}`).join(', ');
        return entityNames || entityId;
      }
    }

    // if entityId is UNKNOWN_ENTITY_KEY, it means this is single-stream forecast, so we should show 'Actual'
    return entityId === UNKNOWN_ENTITY_KEY ? 'Actual' : entityId;
  };

  // Pan
  const horizon = forecaster?.horizon ?? 0;
  const panAmount = horizon > 0 ? horizon : 10;

  const handlePanLeft = () => {
    if (windowStart <= 0 || uniqueTimestamps.length === 0) return;

    setWindow(prev => ({
      ...prev,
      windowStart: Math.max(0, prev.windowStart - panAmount)
    }));
  };

  // Example for Pan Right
  const handlePanRight = () => {
    if (!uniqueTimestamps.length) return;

    const maxStart = uniqueTimestamps.length - windowSize;
    setWindow(prev => ({
      ...prev,
      windowStart: Math.min(maxStart, prev.windowStart + panAmount)
    }));
  };

  const disablePanLeft = windowStart <= 0;
  const disablePanRight = windowStart + windowSize >= uniqueTimestamps.length;

  // Zoom
  const MIN_WINDOW_SIZE = 1;
  const ZOOM_FACTOR = 0.2;


  const handleZoomIn = () => {
    if (windowSize <= 2 || uniqueTimestamps.length === 0) return;

    // Use (1 - ZOOM_FACTOR)
    const newSize = Math.max(2, Math.floor(windowSize * (1 - ZOOM_FACTOR)));
    const centerIndex = windowStart + Math.floor(windowSize / 2);
    const newStart = Math.max(0, centerIndex - Math.floor(newSize / 2));

    setWindow({ windowSize: newSize, windowStart: newStart });
  };

  const handleZoomOut = () => {
    if (uniqueTimestamps.length === 0) return;

    // Use (1 + ZOOM_FACTOR)
    const newSize = Math.min(uniqueTimestamps.length, Math.ceil(windowSize * (1 + ZOOM_FACTOR)));
    const centerIndex = windowStart + Math.floor(windowSize / 2);
    const newStart = Math.max(0, centerIndex - Math.floor(newSize / 2));

    // Ensure the new window doesn't go out of bounds
    const maxStart = uniqueTimestamps.length - newSize;
    const adjustedStart = Math.min(Math.max(0, newStart), maxStart);

    setWindow({ windowSize: newSize, windowStart: adjustedStart });
  };

  const disableZoomIn = windowSize <= MIN_WINDOW_SIZE;
  // Disable zoom out when the window size already covers all unique timestamps
  // or when it reaches the maximum allowed points (maxPoints).
  const disableZoomOut = windowSize >= Math.min(uniqueTimestamps.length, maxPoints);

  // Check if current state is active AND the selected forecast is the latest
  const isLive = isActiveState(forecaster?.curState) &&
    forecastFromOptions.length > 0 &&
    forecastFrom === undefined;

  const actualColor = '#6092C0';
  const forecastFromColor = '#6a0dad'; // Purple
  const defaultColor = '#54B399'; // Teal

  // Create a color palette for entities
  const entityColors = useMemo(() => {
    // Predefined color palette for entities
    const colorPalette = [
      actualColor, // Using the already defined actualColor instead of hardcoding the hex
      defaultColor, // teal
      '#D36086', // pink
      '#9170B8', // purple
      '#CA8EAE', // rose
      '#D6BF57', // yellow
      '#B9A888', // tan
      '#DA8B45', // orange
      '#AA6556', // brown
      '#E7664C', // red
    ];

    // Create a map of entityLabel -> color and entityId -> color for lookup
    const colorsByLabel = new Map<string, string>();
    const colorsById = new Map<string, string>();

    // Assign colors from the palette in sequence
    Array.from(dataByEntity.entries()).forEach(([entityId, data], index) => {
      const color = colorPalette[index % colorPalette.length];
      const entityLabel = getEntityLabel(entityId, data);

      // Store color by both label and ID for flexibility
      colorsByLabel.set(entityLabel, color);
      colorsById.set(entityId, color);
    });

    // Return an object with both maps for flexibility
    return {
      byLabel: colorsByLabel,
      byId: colorsById,
      getColorById: (id: string) => colorsById.get(id) || colorPalette[0],
      getColorByLabel: (label: string) => colorsByLabel.get(label) || colorPalette[0]
    };
  }, [dataByEntity]);

  /**
 *  helper to format a duration in days/hours/minutes
 */
  const formatDuration = (minutes: number): string => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const remainingMinutes = minutes % 60;

    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    }
    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }
    if (remainingMinutes > 0 || parts.length === 0) {
      parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`);
    }
    return parts.join(' ');
  };

  // Add these state variables after your other useState declarations
  // Multiple series per page require custom logic to handle hover and less performant than
  // default logic. Put single series as default for performance reasons.
  const [seriesPerPage, setSeriesPerPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Add these options for the series per page dropdown
  const seriesPerPageOptions = [
    { value: '5', text: '5' },
    { value: '4', text: '4' },
    { value: '3', text: '3' },
    { value: '2', text: '2' },
    { value: '1', text: '1' }
  ];

  // Add this after your other useMemo hooks to calculate paginated entities
  const paginatedEntities = useMemo(() => {
    const allEntities = Array.from(dataByEntity.entries());

    // If we have fewer entities than the limit, return all
    if (allEntities.length <= seriesPerPage) {
      return allEntities;
    }

    // Calculate start and end indices for the current page
    const startIdx = (currentPage - 1) * seriesPerPage;
    const endIdx = Math.min(startIdx + seriesPerPage, allEntities.length);

    return allEntities.slice(startIdx, endIdx);
  }, [dataByEntity, seriesPerPage, currentPage]);

  // Add this to calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(dataByEntity.size / seriesPerPage);
  }, [dataByEntity.size, seriesPerPage]);

  // Add these effects to handle pagination state
  useEffect(() => {
    setCurrentPage(1);
  }, [seriesPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Add this state variable near your other state declarations
  const [isSeriesPerPagePopoverOpen, setSeriesPerPagePopoverOpen] = useState(false);

  // Add these helper functions
  const toggleSeriesPerPagePopover = () => {
    setSeriesPerPagePopoverOpen(!isSeriesPerPagePopoverOpen);
  };

  const closeSeriesPerPagePopover = () => {
    setSeriesPerPagePopoverOpen(false);
  };

  const getIconType = (size: number) => {
    return size === seriesPerPage ? 'check' : 'empty';
  };

  // Add this state variable with your other useState declarations
  const [showSplitActualData, setShowSplitActualData] = useState(false);

  // Display options state variables
  const [isDisplayOptionsOpen, setIsDisplayOptionsOpen] = useState(false);
  const [splitByOption, setSplitByOption] = useState(ALL_CATEGORICAL_FIELDS);
  const [filterByOption, setFilterByOption] = useState('builtin');
  const [sortByOption, setSortByOption] = useState('min_ci_width');
  const [operatorValue, setOperatorValue] = useState('>');

  // We maintain two separate state variables for the threshold:
  // 1. thresholdInputValue (string): Controls the input field's display value
  // This keeps the React input "controlled" with a consistent type (string)
  // and prevents warnings about switching between controlled/uncontrolled
  // 2. thresholdValue (number | undefined): Stores the validated numeric value
  // This is what we use for actual data operations and validation
  // This separation allows us to:
  // - Handle empty inputs gracefully (empty string → undefined)
  // - Properly validate numeric values without default values
  // - Keep the input controlled while supporting validation requirements
  // Use a string state to track the input value
  const [thresholdInputValue, setThresholdInputValue] = useState<string>('');
  const [thresholdValue, setThresholdValue] = useState<number | undefined>(undefined);

  // Add these state variables at the top of your component
  const [isCustomQueryDialogOpen, setIsCustomQueryDialogOpen] = useState(false);
  const [customSubAggregations, setCustomSubAggregations] = useState([
    {
      field: 'forecast_value',
      aggregationMethod: 'max',
      order: 'DESC'
    }
  ]);

  // Add this function to handle adding a new sub-aggregation
  const addSubAggregation = () => {
    setCustomSubAggregations([
      ...customSubAggregations,
      {
        field: 'forecast_value',
        aggregationMethod: 'max',
        order: 'DESC'
      }
    ]);
  };

  // Add this function to handle removing a sub-aggregation
  const removeSubAggregation = (index: number) => {
    setCustomSubAggregations(
      customSubAggregations.filter((_, i) => i !== index)
    );
  };

  // Add this function to handle updating a sub-aggregation
  const updateSubAggregation = (index: number, field: string, value: string) => {
    const updatedAggregations = [...customSubAggregations];
    updatedAggregations[index] = {
      ...updatedAggregations[index],
      [field]: value
    };
    setCustomSubAggregations(updatedAggregations);
  };

  // Add this function to format the subaggregations for the API
  const formatSubAggregationsForApi = () => {
    return customSubAggregations.map(agg => ({
      aggregation_query: {
        [agg.field]: {
          [agg.aggregationMethod]: {
            field: agg.field
          }
        }
      },
      order: agg.order
    }));
  };

  // Add this state to store the custom query data
  const [customQueryData, setCustomQueryData] = useState<{
    filter_query: Record<string, any>;
    subaggregations: Array<{
      aggregation_query: Record<string, any>;
      order: string;
    }>;
  }>({
    filter_query: {},
    subaggregations: []
  });

  // Add this state variable near your other state declarations
  const [customQuerySummary, setCustomQuerySummary] = useState<string>('');

  // Add a state for the editor content to preserve invalid JSON during editing
  const [filterEditorContent, setFilterEditorContent] = useState('{}');

  // Add a state for tracking JSON parsing errors
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

  // Add these state variables for validation errors
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [operatorError, setOperatorError] = useState<string | null>(null);

  const validateThresholdInputs = useCallback(() => {
    // Reset previous error states
    setThresholdError(null);
    setOperatorError(null);

    let isValid = true;

    // Only validate if sortByOption is threshold_dist
    if (sortByOption === 'threshold_dist') {
      // Use strict comparison to check for null/undefined, not 0
      if (thresholdValue === null || thresholdValue === undefined || isNaN(thresholdValue)) {
        setThresholdError('Please enter a valid numeric threshold value');
        isValid = false;
      }

      if (!operatorValue) {
        setOperatorError('Please select an operator');
        isValid = false;
      }
    }

    return isValid;
  }, [sortByOption, thresholdValue, operatorValue]);

  // Add a function to handle opening the edit dialog
  const openCustomQueryEditDialog = () => {
    // Set the editor content from the current filter query
    setFilterEditorContent(JSON.stringify(customQueryData.filter_query || {}, null, 2));

    // Reinitialize customSubAggregations from the API-formatted subaggregations in customQueryData
    if (customQueryData.subaggregations && customQueryData.subaggregations.length > 0) {
      // Convert from API format back to UI format
      const uiAggregations = customQueryData.subaggregations.map(apiAgg => {
        // Extract field, method and order from the API format
        const aggregationQueryKey = Object.keys(apiAgg.aggregation_query)[0];
        const methodKey = Object.keys(apiAgg.aggregation_query[aggregationQueryKey])[0];
        const field = apiAgg.aggregation_query[aggregationQueryKey][methodKey].field;

        return {
          field: field,
          aggregationMethod: methodKey,
          order: apiAgg.order
        };
      });

      // Update the UI state with the converted aggregations
      setCustomSubAggregations(uiAggregations);
    }

    // Open the dialog
    setIsCustomQueryDialogOpen(true);
  }

  const core = React.useContext(CoreServicesContext) as CoreStart;

  // Add new state variable for visualization options panel
  const [isVisualizationOptionsOpen, setIsVisualizationOptionsOpen] = useState(false);

  const handleUpdateVisualization = useCallback(async () => {
    // Validate inputs first
    if (!validateThresholdInputs()) {
      return; // Exit early if validation fails
    }

    // Map the UI option to the API parameter value
    const buildInQueryMap: Record<string, string> = {
      'min_ci_width': 'MIN_CONFIDENCE_INTERVAL_WIDTH',
      'max_ci_width': 'MAX_CONFIDENCE_INTERVAL_WIDTH',
      'min_horizon': 'MIN_VALUE_WITHIN_THE_HORIZON',
      'max_horizon': 'MAX_VALUE_WITHIN_THE_HORIZON',
      'threshold_dist': 'DISTANCE_TO_THRESHOLD_VALUE'
    };
    // Create the updated options object
    const updatedOptions: VisualizationOptions = {
      filterByOption,
      filterByValue: filterByOption === 'builtin' ? 
        buildInQueryMap[sortByOption] : '',
      sortByOption,
      thresholdValue: thresholdValue ?? 0,
      thresholdDirection: operatorValue,
      forecast_from: forecastFrom,
      splitByOption: splitByOption,
      operatorValue: operatorValue,
      filterQuery: customQueryData.filter_query,
      subaggregations: customQueryData.subaggregations,
    };

    // Pass the updated options to the parent component
    onUpdateVisualizationOptions(updatedOptions);

    // Close the display options panel
    setIsDisplayOptionsOpen(false);
  }, [
    filterByOption,
    sortByOption,
    thresholdValue,
    operatorValue,
    customQueryData,
    forecastFrom,
    onUpdateVisualizationOptions,
    onDataRequest,
    validateThresholdInputs
  ]);

  // Add these new state variables
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [tooltipData, setTooltipData] = useState<{ header?: TooltipValue; values: TooltipValue[] } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Delay in milliseconds for throttling mouse move events
  // Tried 50ms, not working.
  // Symptom with 50ms: When quickly moving the mouse from one time series (entity) 
  // to another, there was a noticeable visual lag before the confidence interval 
  // for the newly hovered series appeared. The user might have had to move the mouse 
  // again slightly, or move out and back in, for the interval to show.
  // Cause: This lag is likely due to a slight delay/race condition between the throttled 
  // mouse event processing (which eventually calls setHoveredEntityId) and the 
  // chart library (@elastic/charts) re-rendering the AreaSeries with updated opacity/visibility.
  // Solution: A smaller delay (10ms) makes the setHoveredEntityId state update happen 
  // more quickly after the mouse moves, reducing the perceived lag and making the 
  // confidence interval appear more responsive to hover changes.
  const THROTTLE_DELAY = 10;

  const handleMouseMoveInner = useCallback(
    (clientX: number, clientY: number) => {
      if (!chartRef.current) return;

      const rect = chartRef.current.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      // For bounding:
      const tooltipWidth = 200;
      const tooltipHeight = 100;

      const boundedX = Math.min(
        Math.max(0, mouseX + 15),
        chartRef.current.clientWidth - tooltipWidth
      );
      const boundedY = Math.min(
        Math.max(0, mouseY - tooltipHeight - 10),
        chartRef.current.clientHeight - tooltipHeight
      );

      setTooltipPosition({ x: boundedX, y: boundedY });
    },
    [chartRef]
  );

  // Create throttled version (re-creates only if the inner function changes)
  const handleChartMouseMove = useMemo(
    () => _.throttle(handleMouseMoveInner, THROTTLE_DELAY, {
      leading: true,
      trailing: true,
    }),
    [handleMouseMoveInner]
  );

  /**
 * Throttled mouse leave handler
 */
  const handleChartMouseLeaveInner = useCallback(() => {
    setTooltipData(null);
    setTooltipPosition(null);
    setHoveredEntityId(null);
  }, []);

  const handleChartMouseLeave = useMemo(
    () => _.throttle(handleChartMouseLeaveInner, THROTTLE_DELAY, {
      leading: true,
      trailing: true,
    }),
    [handleChartMouseLeaveInner]
  );

  // Add state for interval in milliseconds
  const [intervalMilliseconds, setIntervalMilliseconds] = useState<number>(0);

  // Add useEffect to calculate and update intervalMilliseconds when forecaster changes
  useEffect(() => {
    if (forecaster?.forecastInterval?.period?.interval) {
      // Convert forecaster interval (in minutes) to milliseconds
      // 1 minute = 60,000 milliseconds
      const intervalInMs = forecaster.forecastInterval.period.interval * 60000;
      setIntervalMilliseconds(intervalInMs);

    }
  }, [forecaster]); // Re-run when forecaster changes

  // Define interfaces for the spatial index structure
  interface PointsByEntity {
    [entityId: string]: Row[];
  }

  interface TimeSlots {
    [slotKey: number]: PointsByEntity;
  }

  interface SpatialIndex {
    timeSlots: TimeSlots;
    minTime: number;
    maxTime: number;
    slotSize: number;
  }

  // Now update the buildPointIndex function with these types
  const buildPointIndex = useCallback((dataByEntity: Map<string, Row[]>): SpatialIndex => {
    // Create a time-based index to quickly narrow down potential points
    const index: SpatialIndex = {
      timeSlots: {}, // Organize points by time slots
      minTime: Infinity,
      maxTime: -Infinity,
      slotSize: intervalMilliseconds > 0 ? intervalMilliseconds : 60000 // Use our interval as the bucket size with fallback
    };

    dataByEntity.forEach((data, entityId) => {
      data.forEach(point => {
        if (point.x < index.minTime) index.minTime = point.x;
        if (point.x > index.maxTime) index.maxTime = point.x;

        // Calculate which time slot this belongs to
        const slotKey = Math.floor(point.x / index.slotSize) * index.slotSize;

        // Initialize the slot if needed
        if (!index.timeSlots[slotKey]) {
          index.timeSlots[slotKey] = {};
        }

        // Initialize entity array in this slot if needed
        if (!index.timeSlots[slotKey][entityId]) {
          index.timeSlots[slotKey][entityId] = [];
        }

        // Add point to this time slot
        index.timeSlots[slotKey][entityId].push(point);
      });
    });

    return index;
  }, [intervalMilliseconds]);

  // Also update the state definition to use the correct type
  const [spatialIndex, setSpatialIndex] = useState<SpatialIndex | null>(null);

  // Initialize the spatial index when data changes
  useEffect(() => {
    if (dataByEntity && dataByEntity.size > 0) {
      const index = buildPointIndex(dataByEntity);
      setSpatialIndex(index);
    }
  }, [dataByEntity, buildPointIndex]);

  // Define a type for the closest point information
  interface ClosestPointInfo {
    entityId: string;
    point: Row;  // Assuming Row is already defined elsewhere for your data points
    distance: number;
  }

  // Memoize the set of visible entity IDs based on pagination
  // Define this at the top level of the component body
  const visibleEntityIds = useMemo(() => new Set(paginatedEntities.map(([id]) => id)), [paginatedEntities]);

  // Then update the findClosestPointsOptimized function
  const findClosestPointsOptimized = useCallback((mouseX: number, mouseY: number): ClosestPointInfo[] => {
    if (!spatialIndex || visibleEntityIds.size === 0) return [];

    const closestPointsByEntity: ClosestPointInfo[] = [];
    const searchWindow = intervalMilliseconds * 2; // Search 2 intervals around mouse position

    // Find the time slot containing the mouse position
    const centerSlotKey = Math.floor(mouseX / spatialIndex.slotSize) * spatialIndex.slotSize;

    // Get adjacent slots to search (current slot plus one before and after)
    const slotKeysToSearch = [
      centerSlotKey - spatialIndex.slotSize,
      centerSlotKey,
      centerSlotKey + spatialIndex.slotSize
    ];

    // Check each relevant slot
    slotKeysToSearch.forEach(slotKey => {
      const slot = spatialIndex.timeSlots[slotKey];
      if (!slot) return; // Skip if this slot doesn't exist

      // Iterate ONLY over visible entities present in this slot
      visibleEntityIds.forEach(entityId => {
        const points = slot[entityId]; // Get points ONLY for this specific visible entity
        if (!points) return; // Skip if this visible entity isn't in this specific time slot

        let closestPoint: Row | null = null;
        let minDistance = Infinity;

        // Only check points in this slot for this VISIBLE entity
        points.forEach(point => {
          if (point.actual === null && point.forecast === null) return;

          const pointY = point.actual !== null ? point.actual :
            point.forecast !== null ? point.forecast : null;

          if (pointY === null) return;

          // Calculate distance using the same formula as before
          const xDistance = Math.abs(mouseX - point.x);

          // Skip points too far away in time (early exit optimization)
          if (xDistance > searchWindow) return;

          const yDistance = Math.abs(mouseY - pointY);
          // Give slightly more weight to xDistance proximity
          const distance = xDistance * 1.5 + yDistance; 

          // Check if point is within half an interval horizontally AND closer overall
          if (xDistance < (intervalMilliseconds / 2) && distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        });

        // If found a closest point for this entity, add to results
        if (closestPoint) {
          closestPointsByEntity.push({
            entityId,
            point: closestPoint,
            distance: minDistance
          });
        }
      });
    });

    // Find the single closest point among the candidates from visible entities
    if (closestPointsByEntity.length > 0) {
      const overallClosestPoint = closestPointsByEntity.reduce(
        (min, current) => (current.distance < min.distance ? current : min),
        closestPointsByEntity[0]
      );
      // Return only the single closest point found across all visible series
      return [overallClosestPoint]; 
    }

    return [];
  }, [spatialIndex, intervalMilliseconds, visibleEntityIds]);

  /**
 * Throttled pointer update
 * (Moves all onPointerUpdate logic here, then throttles it.)
 */
  const handlePointerUpdate = useCallback(
    (pointerUpdate: PointerEvent) => {
      if (pointerUpdate && pointerUpdate.x && pointerUpdate.y) {
        const mouseX = pointerUpdate.x;
        const mouseY = pointerUpdate.y[0]?.value || 0;

        const closestPointsByEntity = findClosestPointsOptimized(mouseX, mouseY);

        // If we found at least one close point, update tooltip
        if (closestPointsByEntity.length > 0) {
          setHoveredEntityId(closestPointsByEntity[0].entityId);
          // Get chart element position for tooltip positioning
          const chartRect = chartRef.current?.getBoundingClientRect();
          if (chartRect) {
            // Transform pointerUpdate values to tooltip values
            const tooltipValues = closestPointsByEntity.flatMap(({ entityId, point }) => {
              const values = [];
              const entityColor = entityColors.byId.get(entityId) || defaultColor;

              // Add actual value if exists
              if (point.actual !== null) {
                values.push({
                  seriesIdentifier: {
                    key: `spec{Actual-${entityId}}`,
                    specId: `Actual-${entityId}` // Add required specId
                  },
                  value: point.actual,
                  formattedValue: point.actual.toString(), // Add required formattedValue
                  label: 'Actual',
                  color: entityColor,
                  isHighlighted: true, // Add required isHighlighted
                  isVisible: true, // Add required isVisible
                  datum: point
                });
              }

              // Add forecast value if exists
              if (point.forecast !== null) {
                values.push({
                  seriesIdentifier: {
                    key: `spec{Forecast-${entityId}}`,
                    specId: `Forecast-${entityId}` // Add required specId
                  },
                  value: point.forecast,
                  formattedValue: point.forecast.toString(), // Add required formattedValue
                  label: 'Forecast',
                  color: entityColor,
                  isHighlighted: true, // Add required isHighlighted
                  isVisible: true, // Add required isVisible
                  datum: point
                });
              }

              // Add upper/lower bounds if they exist
              if (point.upper !== null) {
                values.push({
                  seriesIdentifier: {
                    key: `spec{Bounds-${entityId}}`,
                    specId: `Bounds-${entityId}` // Add required specId
                  },
                  value: point.upper,
                  formattedValue: point.upper.toString(), // Add required formattedValue
                  label: 'High',
                  color: entityColor,
                  isHighlighted: true, // Add required isHighlighted
                  isVisible: true, // Add required isVisible
                  datum: point
                });
              }

              if (point.lower !== null) {
                values.push({
                  seriesIdentifier: {
                    key: `spec{Bounds-${entityId}}`,
                    specId: `Bounds-${entityId}` // Add required specId
                  },
                  value: point.lower,
                  formattedValue: point.lower.toString(), // Add required formattedValue
                  label: 'Low',
                  color: entityColor,
                  isHighlighted: true, // Add required isHighlighted
                  isVisible: true, // Add required isVisible
                  datum: point
                });
              }

              return values;
            });

            // Update tooltip data and position
            setTooltipData({
              header: {
                value: closestPointsByEntity[0].point.x,
                label: 'Time',
                color: '#000000',
                isHighlighted: false,
                isVisible: true,
                seriesIdentifier: {
                  key: 'time',
                  specId: 'time_header'
                },
                formattedValue: moment(closestPointsByEntity[0].point.x).format('MMM DD, YYYY HH:mm:ss')
              },
              values: tooltipValues
            });
          } else {
            setTooltipData(null);
            setTooltipPosition(null);
            setHoveredEntityId(null);
          }
        } else {
          setTooltipData(null);
          setTooltipPosition(null);
          setHoveredEntityId(null);
        }
      }
    },
     [
      findClosestPointsOptimized, // Already depends on paginatedEntities indirectly
      entityColors, // Added entityColors dependency if needed inside
      defaultColor, // Added defaultColor dependency if needed inside
    ]
  );

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel paddingSize="m">
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          {/* Title */}
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2 style={{ margin: 0 }}>
                Forecast{isTestState(forecaster?.curState) ? ' - test' : ''}
              </h2>
            </EuiTitle>
          </EuiFlexItem>

          {/* Push forecast from dropdown and date picker to the right */}
          <EuiFlexItem />

          {/* Forecast dropdown */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiSelect
                  prepend="Forecast from"
                  compressed
                  options={forecastFromOptions}
                  value={getEffectiveForecastPoint() ?? ''}
                  disabled={isOverlayMode} // Disable when in overlay mode
                  onChange={(e) => {
                    // This sets the selected run's "plotTime",
                    // then in effect, the effect hook sets forecastFrom/forecastTo from that run.
                    // when forecastFrom is changed, combinedData changes too.
                    // The useEffect on combinedData will trigger a re-pin to the right.
                    const newVal = Number(e.target.value);
                    setForecastFrom(newVal);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  onClick={() => {
                    if (forecastFromOptions.length > 0) {
                      setForecastFrom(undefined);
                      // Instead, pin to right so the forecast is visible:
                      const total = combinedData.length;
                      const maxPossible = Math.min(total, maxPoints);
                      setWindow({ windowSize: maxPossible, windowStart: Math.max(0, total - maxPossible) });
                    }
                  }}
                  isDisabled={
                    forecastFromOptions.length > 0 &&
                    (forecastFrom === undefined || forecastFrom === forecastFromOptions[forecastFromOptions.length - 1].value)
                  }
                >
                  Show latest
                </EuiSmallButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Date picker + icons */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="center">
              {/* Compressed date picker */}
              <EuiFlexItem grow={false}>
                <EuiCompressedSuperDatePicker
                  isLoading={isLoading}
                  start={datePickerRange.start} // Convert to string if it's a number
                  end={datePickerRange.end}     // Convert to string if it's a number
                  // FIXME: show update button as it is hard to adjust date in one click
                  // (you have to click on the date picker icon two in absolute range)
                  showUpdateButton={true}
                  isPaused={true}
                  dateFormat="YYYY-MM-DD HH:mm:ss"
                  onTimeChange={({ start, end }) => {
                    handleDatePickerChange(start, end);
                  }}
                  onRefresh={({ start, end }) => {
                    handleDatePickerChange(start, end);
                  }}
                  commonlyUsedRanges={DATE_PICKER_QUICK_OPTIONS}
                />
              </EuiFlexItem>

              {/* Pan/Zoom icons in a bordered box */}
              <EuiFlexItem grow={false}>
                <EuiPanel
                  hasBorder
                  paddingSize="none"
                  style={{ display: 'inline-flex', marginLeft: 8 }}
                >
                  <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
                    {/* Pan left */}
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content="Pan left">
                        <EuiSmallButtonEmpty
                          iconType="arrowLeft"
                          aria-label="Pan left"
                          style={{ borderRadius: 0 }}
                          onClick={handlePanLeft}
                          isDisabled={disablePanLeft}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>

                    {/* Vertical divider */}
                    <EuiFlexItem grow={false}>
                      <div
                        style={{
                          width: 1,
                          height: 32,
                          backgroundColor: '#d4dae5',
                        }}
                      />
                    </EuiFlexItem>

                    {/* Zoom out */}
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content="Zoom out">
                        <EuiSmallButtonEmpty
                          iconType="minusInCircle"
                          aria-label="Zoom out"
                          style={{ borderRadius: 0 }}
                          onClick={handleZoomOut}
                          isDisabled={disableZoomOut}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>

                    {/* Vertical divider */}
                    <EuiFlexItem grow={false}>
                      <div
                        style={{
                          width: 1,
                          height: 32,
                          backgroundColor: '#d4dae5',
                        }}
                      />
                    </EuiFlexItem>

                    {/* Zoom in */}
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content="Zoom in">
                        <EuiSmallButtonEmpty
                          iconType="plusInCircle"
                          aria-label="Zoom in"
                          style={{ borderRadius: 0 }}
                          onClick={handleZoomIn}
                          isDisabled={disableZoomIn}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>

                    {/* Vertical divider */}
                    <EuiFlexItem grow={false}>
                      <div
                        style={{
                          width: 1,
                          height: 32,
                          backgroundColor: '#d4dae5',
                        }}
                      />
                    </EuiFlexItem>

                    {/* Pan right */}
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content="Pan right">
                        <EuiSmallButtonEmpty
                          iconType="arrowRight"
                          aria-label="Pan right"
                          style={{ borderRadius: 0 }}
                          onClick={handlePanRight}
                          isDisabled={disablePanRight}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>

              {/* Display options in its own bordered box */}
              <EuiFlexItem grow={false}>
                <EuiPanel
                  hasBorder
                  paddingSize="none"
                  style={{ display: 'inline-flex', marginLeft: 8 }}
                >
                  <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
                    {/* Visualization Options button */}
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content="Visualization options">
                        <EuiPopover
                          button={
                            <EuiSmallButtonEmpty
                              iconType="visLine"
                              aria-label="Visualization options"
                              onClick={() => setIsVisualizationOptionsOpen(!isVisualizationOptionsOpen)}
                              style={{ borderRadius: 0 }}
                              // Disable if no forecaster or no forecast data is available
                              isDisabled={!forecaster || forecastData.length === 0}
                            >
                            </EuiSmallButtonEmpty>
                          }
                          isOpen={isVisualizationOptionsOpen}
                          closePopover={() => setIsVisualizationOptionsOpen(false)}
                          panelPaddingSize="s"
                          anchorPosition="downRight"
                          style={{ maxWidth: 'none' }}
                        >
                          {/* Visualization Options Panel */}
                          <div style={{ width: 350 }}>
                            <EuiTitle size="xs">
                              <h3>VISUALIZATION OPTIONS</h3>
                            </EuiTitle>

                            <EuiSpacer size="s" />

                            {/* Overlay mode toggle */}
                            <EuiFormRow
                              helpText="Compare forecasts across time series at a consistent forecast distance (horizon index)."
                            >
                              <EuiToolTip
                                content={
                                  <div style={{ maxWidth: 280 }}>
                                    <strong>When ON:</strong> Shows forecast points at a specific horizon index alongside actual data, ignoring the forecast starting time.<br />
                                    <strong>When OFF:</strong> Shows forecasts and bound data at forecast from time, displaying the complete forecast progression.
                                  </div>
                                }
                              >
                                <EuiSwitch
                                  label="Overlay mode"
                                  checked={isOverlayMode}
                                  onChange={e => setIsOverlayMode(e.target.checked)}
                                  compressed
                                  data-test-subj="overlayModeToggle"
                                />
                              </EuiToolTip>
                            </EuiFormRow>

                            {/* Horizon index selector - only shown when overlay mode is on */}
                            {isOverlayMode && (
                              <>
                                <EuiSpacer size="s" />
                                <EuiFlexGroup alignItems="center" gutterSize="s">
                                  {/* Label text */}
                                  <EuiFlexItem grow={false}>
                                    <EuiText size="s" style={{ fontWeight: 'bold', lineHeight: '32px' }}>
                                      Horizon index
                                    </EuiText>
                                  </EuiFlexItem>

                                  {/* Info icon */}
                                  <EuiFlexItem grow={false}>
                                    <EuiIconTip
                                      aria-label="Help"
                                      content={`Select which forecast point to display (1 to ${forecaster?.horizon || 10}). Higher values look further into the future.`}
                                      position="right"
                                      type="questionInCircle"
                                      iconProps={{ style: { verticalAlign: 'middle' } }}
                                    />
                                  </EuiFlexItem>

                                  {/* The field number input */}
                                  <EuiFlexItem>
                                    <EuiFormRow
                                      isInvalid={!!horizonIndexError}
                                      error={horizonIndexError}
                                      fullWidth
                                      hasChildLabel={false}
                                      display="rowCompressed"
                                    >
                                      <EuiFieldNumber
                                        min={1}
                                        max={forecaster?.horizon || 10}
                                        value={horizonIndexInput} // Use string input instead of numeric value
                                        onChange={e => {
                                          const inputValue = e.target.value;
                                          setHorizonIndexInput(inputValue); // Always update the input string

                                          // Validate input value
                                          if (inputValue === '') {
                                            setHorizonIndexError('Horizon index is required');
                                            // Don't update the actual selected index yet
                                          } else {
                                            const val = parseInt(inputValue, 10);
                                            const maxHorizon = forecaster?.horizon || 10;

                                            if (isNaN(val)) {
                                              setHorizonIndexError('Please enter a valid number');
                                            } else if (val < 1) {
                                              setHorizonIndexError(`Value must be at least 1`);
                                            } else if (val > maxHorizon) {
                                              setHorizonIndexError(`Value must not exceed ${maxHorizon}`);
                                            } else {
                                              // Clear error and update state with valid value
                                              setHorizonIndexError(null);
                                              setSelectedHorizonIndex(val);
                                            }
                                          }
                                        }}
                                        onBlur={() => {
                                          // When field loses focus, restore to a valid value if currently invalid
                                          if (horizonIndexInput === '' || horizonIndexError) {
                                            setHorizonIndexInput(String(selectedHorizonIndex));
                                            setHorizonIndexError(null);
                                          }
                                        }}
                                        aria-label="Horizon index"
                                        fullWidth
                                        compressed
                                        isInvalid={!!horizonIndexError}
                                      />
                                    </EuiFormRow>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                              </>
                            )}

                            {/* Continuous data toggle - disabled when overlay mode is on */}
                            <EuiSpacer size="s" />
                            <EuiFormRow
                              helpText="When enabled, actual data is hidden in forecast areas, making forecasts easier to read when multiple series are displayed."
                            >
                              <EuiToolTip
                                content={
                                  <div style={{ maxWidth: 250 }}>
                                    <strong>When ON:</strong> Hides actual data in forecast areas, creating a cleaner separation.<br />
                                    <strong>When OFF:</strong> Shows both actual and forecast data overlapping, providing complete visibility.
                                  </div>
                                }
                              >
                                <EuiSwitch
                                  label="Hide actual data at forecast"
                                  checked={showSplitActualData}
                                  onChange={e => setShowSplitActualData(!showSplitActualData)}
                                  disabled={isOverlayMode}
                                  compressed
                                  data-test-subj="continuousDataToggle"
                                />
                              </EuiToolTip>
                            </EuiFormRow>
                          </div>
                        </EuiPopover>
                      </EuiToolTip>
                    </EuiFlexItem>

                    {/* Vertical divider */}
                    <EuiFlexItem grow={false}>
                      <div
                        style={{
                          width: 1,
                          height: 32,
                          backgroundColor: '#d4dae5',
                        }}
                      />
                    </EuiFlexItem>

                    {/* Split Time Series Controls button */}
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={
                          !forecaster?.categoryField?.length
                            ? "Split options are only available for forecasters with category fields"
                            : "Split time series options"
                        }
                      >
                        <EuiPopover
                          button={
                            <EuiSmallButtonEmpty
                              iconType="controlsHorizontal"
                              aria-label="Split time series options"
                              onClick={() => setIsDisplayOptionsOpen(!isDisplayOptionsOpen)}
                              style={{ borderRadius: 0 }}
                              isDisabled={!forecaster?.categoryField?.length}
                            >
                            </EuiSmallButtonEmpty>
                          }
                          isOpen={isDisplayOptionsOpen && !!forecaster?.categoryField?.length}
                          closePopover={() => setIsDisplayOptionsOpen(false)}
                          panelPaddingSize="s"
                          anchorPosition="downRight"
                          style={{ maxWidth: 'none' }}
                        >
                          {/* Split Time Series Controls Panel Content */}
                          <div style={{ width: 400 }}>
                            <EuiTitle size="xs">
                              <h3>SPLIT TIME SERIES CONTROLS</h3>
                            </EuiTitle>

                            <EuiSpacer size="s" />

                            {/* Split by options */}
                            <EuiFlexGroup alignItems="center" gutterSize="none">
                              <EuiFlexItem grow={false}>
                                <EuiBadge color="default" className="display-option-badge">
                                  Split by
                                </EuiBadge>
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiSelect
                                  options={[
                                    ...(forecaster?.categoryField && forecaster.categoryField.length > 1 ? [{
                                      value: ALL_CATEGORICAL_FIELDS,
                                      text: 'all categorical fields'
                                    }] : []),
                                    ...(forecaster?.categoryField || [])
                                      .filter(field => typeof field === 'string')
                                      .map(field => ({ value: field, text: field }))
                                  ]}
                                  value={splitByOption}
                                  onChange={(e) => setSplitByOption(e.target.value)}
                                  aria-label="Split by"
                                  fullWidth
                                />
                              </EuiFlexItem>
                            </EuiFlexGroup>

                            <EuiSpacer size="s" />

                            {/* Filter by options */}
                            <EuiFlexGroup alignItems="center" gutterSize="none">
                              <EuiFlexItem grow={false}>
                                <EuiBadge color="default" className="display-option-badge">
                                  Filter by
                                </EuiBadge>
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiSelect
                                  options={[
                                    { value: 'builtin', text: 'Build-in query' },
                                    { value: 'custom', text: 'Custom query' }
                                  ]}
                                  value={filterByOption}
                                  onChange={(e) => {
                                    setFilterByOption(e.target.value);
                                    // Open dialog when custom query is selected
                                    if (e.target.value === 'custom') {
                                      openCustomQueryEditDialog();
                                    }
                                  }}
                                  aria-label="Filter by"
                                  fullWidth
                                />
                              </EuiFlexItem>
                            </EuiFlexGroup>

                            {/* Show custom query summary if using custom query */}
                            {filterByOption === 'custom' && customQuerySummary && (
                              <>
                                <EuiSpacer size="xs" />
                                <EuiFlexGroup alignItems="center" gutterSize="s">
                                  <EuiFlexItem>
                                    <EuiAccordion
                                      id="customQuerySummaryAccordion"
                                      buttonContent={
                                        <EuiText size="s" color="subdued">
                                          <span>View Query Details</span>
                                        </EuiText>
                                      }
                                      paddingSize="s"
                                      initialIsOpen={false}
                                    >
                                      <EuiCodeBlock
                                        language="json"
                                        fontSize="s"
                                        paddingSize="s"
                                        isCopyable
                                      >
                                        {customQuerySummary}
                                      </EuiCodeBlock>
                                    </EuiAccordion>
                                  </EuiFlexItem>
                                  <EuiFlexItem grow={false}>
                                    <EuiButtonEmpty
                                      size="xs"
                                      iconType="pencil"
                                      onClick={openCustomQueryEditDialog}
                                    >
                                      Edit
                                    </EuiButtonEmpty>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                              </>
                            )}

                            <EuiSpacer size="s" />

                            {/* Sort by options - only show for built-in query */}
                            {filterByOption === 'builtin' && (
                              <>
                                <EuiFlexGroup alignItems="center" gutterSize="none">
                                  <EuiFlexItem grow={false}>
                                    <EuiBadge color="default" className="display-option-badge">
                                      Sort by
                                    </EuiBadge>
                                  </EuiFlexItem>
                                  <EuiFlexItem>
                                    <EuiSuperSelect
                                      options={[
                                        {
                                          value: 'min_ci_width',
                                          inputDisplay: 'MIN confidence interval width',
                                          dropdownDisplay: (
                                            <div style={{ maxWidth: '260px' }}>
                                              <strong>MIN confidence interval width</strong>
                                              <div style={{ fontSize: '12px', color: '#69707D' }}>
                                                The least spread forecast
                                              </div>
                                            </div>
                                          )
                                        },
                                        {
                                          value: 'max_ci_width',
                                          inputDisplay: 'MAX confidence interval width',
                                          dropdownDisplay: (
                                            <div style={{ maxWidth: '260px' }}>
                                              <strong>MAX confidence interval width</strong>
                                              <div style={{ fontSize: '12px', color: '#69707D' }}>
                                                The least confident forecast
                                              </div>
                                            </div>
                                          )
                                        },
                                        {
                                          value: 'min_horizon',
                                          inputDisplay: 'MIN value within the horizon',
                                          dropdownDisplay: (
                                            <div style={{ maxWidth: '260px' }}>
                                              <strong>MIN value within the horizon</strong>
                                              <div style={{ fontSize: '12px', color: '#69707D' }}>
                                                The lowest predicted values
                                              </div>
                                            </div>
                                          )
                                        },
                                        {
                                          value: 'max_horizon',
                                          inputDisplay: 'MAX value within the horizon',
                                          dropdownDisplay: (
                                            <div style={{ maxWidth: '260px' }}>
                                              <strong>MAX value within the horizon</strong>
                                              <div style={{ fontSize: '12px', color: '#69707D' }}>
                                                The highest predicted values
                                              </div>
                                            </div>
                                          )
                                        },
                                        {
                                          value: 'threshold_dist',
                                          inputDisplay: 'Distance to threshold value',
                                          dropdownDisplay: (
                                            <div style={{ maxWidth: '260px' }}>
                                              <strong>Distance to threshold value</strong>
                                              <div style={{ fontSize: '12px', color: '#69707D' }}>
                                                You can define the threshold
                                              </div>
                                            </div>
                                          )
                                        }
                                      ]}
                                      valueOfSelected={sortByOption}
                                      onChange={(value) => setSortByOption(value)}
                                      itemLayoutAlign="top"
                                      hasDividers
                                      fullWidth
                                    />
                                  </EuiFlexItem>
                                </EuiFlexGroup>

                                {/* Display Operator and Threshold value fields only when 'threshold_dist' is selected */}
                                {sortByOption === 'threshold_dist' && (
                                  <>
                                    <EuiSpacer size="s" />
                                    <EuiFlexGroup alignItems="flexStart" gutterSize="m">
                                      {/* Operator section */}
                                      <EuiFlexItem grow={1}>
                                        <EuiFlexGroup alignItems="flexStart" gutterSize="none">
                                          <EuiFlexItem grow={false}>
                                            <EuiBadge color="default" className="display-option-badge">
                                              Operator
                                            </EuiBadge>
                                          </EuiFlexItem>
                                          <EuiFlexItem>
                                            <EuiFormRow
                                              isInvalid={!!operatorError}
                                              error={operatorError ? [operatorError] : undefined}
                                              fullWidth
                                              hasChildLabel={false}
                                              display="rowCompressed"
                                            >
                                              <EuiSelect
                                                options={[
                                                  { value: '>', text: '>' },
                                                  { value: '<', text: '<' },
                                                  { value: '>=', text: '>=' },
                                                  { value: '<=', text: '<=' },
                                                  { value: '==', text: '=' }
                                                ]}
                                                value={operatorValue || '>'}
                                                onChange={(e) => setOperatorValue(e.target.value)}
                                                aria-label="Operator"
                                                fullWidth
                                                isInvalid={!!operatorError}
                                              />
                                            </EuiFormRow>
                                          </EuiFlexItem>
                                        </EuiFlexGroup>
                                      </EuiFlexItem>

                                      {/* Threshold value section - keep same growth as operator */}
                                      <EuiFlexItem grow={2}>
                                        <EuiFlexGroup alignItems="flexStart" gutterSize="none">
                                          <EuiFlexItem grow={false}>
                                            <EuiBadge color="default" className="display-option-badge">
                                              Threshold value
                                            </EuiBadge>
                                          </EuiFlexItem>
                                          <EuiFlexItem>
                                            <EuiFormRow
                                              isInvalid={!!thresholdError}
                                              error={thresholdError ? [thresholdError] : undefined}
                                              fullWidth
                                              hasChildLabel={false}
                                              display="rowCompressed"
                                            >
                                              <EuiFieldNumber
                                                placeholder="Numeric"
                                                // Use the string input value to keep the input controlled
                                                value={thresholdInputValue}
                                                onChange={(e) => {
                                                  // Always update the input string to keep it controlled
                                                  setThresholdInputValue(e.target.value);

                                                  // If the input is empty, set threshold value to undefined
                                                  if (e.target.value === '') {
                                                    setThresholdValue(undefined);
                                                    return;
                                                  }

                                                  // Parse the input as a number
                                                  const val = Number(e.target.value);

                                                  // Only update the actual threshold value if it's a valid number
                                                  if (!isNaN(val)) {
                                                    setThresholdValue(val);
                                                  } else {
                                                    setThresholdValue(undefined);
                                                  }
                                                }}
                                                aria-label="Threshold value"
                                                fullWidth
                                                isInvalid={!!thresholdError}
                                              />
                                            </EuiFormRow>
                                          </EuiFlexItem>
                                        </EuiFlexGroup>
                                      </EuiFlexItem>
                                    </EuiFlexGroup>
                                  </>
                                )}
                              </>
                            )}

                            <EuiSpacer size="m" />

                            {/* Update button */}
                            <EuiSmallButton
                              fullWidth
                              onClick={() => {
                                if (validateThresholdInputs()) {
                                  handleUpdateVisualization();
                                }
                              }}
                            >
                              Update visualization
                            </EuiSmallButton>
                          </div>
                        </EuiPopover>
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Interval/Horizon/Time series info */}
        <EuiFlexGroup gutterSize="xl" style={{ marginTop: 8 }}>
          {forecaster.forecastInterval && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>Interval:</strong>{' '}
                {formatDuration(forecaster.forecastInterval.period.interval)}
              </EuiText>
            </EuiFlexItem>
          )}
          {forecaster.horizon && forecaster.forecastInterval && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>Horizon:</strong>{' '}
                {formatDuration(
                  forecaster.forecastInterval.period.interval * (forecaster.horizon ?? 0)
                )}
              </EuiText>
            </EuiFlexItem>
          )}
          {forecaster.categoryField && forecaster.categoryField.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>Time series split by:</strong>{' '}
                {forecaster.categoryField.join(', ')}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {/* Out-of-range callout - show if user chooses a range over 10,000 */}
        {showOutOfRangeCallOut && (
          <>
            <EuiCallOut
              data-test-subj="outOfRangeCallOut"
              title="The selected date range is too large"
              color="primary"
            >
              The chosen time window exceeds 10,000 points. Please select a smaller time range.
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {forecaster?.curState === FORECASTER_STATE.INIT_TEST || forecaster?.curState === FORECASTER_STATE.INITIALIZING_FORECAST ? (
          <InitializingText curState={forecaster?.curState} forecaster={forecaster} />
        ) : !forecaster || isLoading || isResultsLoading ? (
          <div style={{ textAlign: 'center' }}>
            <EuiSpacer size="l" />
            <EuiLoadingSpinner size="l" />
            <EuiText>Loading forecast results...</EuiText>
            <EuiSpacer size="l" />
          </div>
        ) : combinedData.length > 0 ? (
          <>
            {/* 
  Container div serves multiple critical purposes:
  
  1. Provides dimensional constraints for the chart (height/width)
  2. Maintains the chartRef for DOM positioning calculations
  3. Handles mouse leave events to hide tooltips
  4. Uses onMouseMove to track pixel coordinates for HTML tooltip positioning
  
  Why we need both mouse event handlers:
  
  - onMouseMove (container): Provides reliable pixel coordinates for tooltip positioning
    in older versions of Elastic Charts where domain coordinates don't map 1:1 to pixel space
  - onPointerUpdate (Chart): Provides actual data values for tooltip content
  
  Implementation details:
  - We pass mouseX/mouseY directly to handleChartMouseMove instead of the event object
    to prevent React synthetic event warnings (event objects get nullified after handler completes)
  - Separation of concerns: handleChartMouseMove sets tooltip position, while 
    onPointerUpdate determines tooltip content
  - This dual approach ensures accurate tooltip positioning and content
*/}
            <div
              ref={chartRef}
              style={{ position: 'relative', height: 400, width: '100%' }}
              onMouseLeave={handleChartMouseLeave}
              onMouseMove={
                (e) => {
                  const mouseX = e.clientX;
                  const mouseY = e.clientY;

                  handleChartMouseMove(mouseX, mouseY);
                }
              }
            >
              <Chart
                size={{ height: 400 }}
                key={`forecast-chart-${forecaster?.id}`}
              >
                <Settings
                  // show custom legend later
                  showLegend={false}
                  tooltip={{
                    // FIXME: don't use built-in tooltip as it doesn't work sometimes
                    type: 'none',
                    snap: true,
                    customTooltip: ({ header, values }) => {
                      return null;
                    },
                  }}
                  pointerUpdateTrigger="x"
                  theme={[
                    {
                      axes: {
                        gridLine: {
                          horizontal: { visible: true },
                          vertical: { visible: true },
                        },
                      },
                    },
                  ]}
                  // EUI is already designed to fire fewer "pointer updates" than raw mouse events
                  //  (it only fires on domain changes, etc.) No need to throttle.
                  onPointerUpdate={handlePointerUpdate}
                  // For non-custom tooltip, keep these handlers
                  onElementOver={(elements) => {
                  }}

                  // Reset on element out
                  onElementOut={() => {
                  }}
                />

                {/* Render custom tooltip when appropriate */}
                {tooltipData && tooltipPosition && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${tooltipPosition.x}px`,
                      top: `${tooltipPosition.y}px`,
                      pointerEvents: 'none',
                      zIndex: 1000,
                    }}
                  >
                    {/* The CustomTooltip component already applies the echTooltip class */}
                    <CustomTooltip header={tooltipData.header} values={tooltipData.values} />
                  </div>
                )}

                {/* Vertical lines for forecastFrom - only show when not in overlay mode */}
                {getEffectiveForecastPoint() != null && !isOverlayMode && (
                  <LineAnnotation
                    id="forecastFromMarker"
                    domainType={AnnotationDomainType.XDomain}
                    dataValues={[{ dataValue: getEffectiveForecastPoint() }]}
                    style={{
                      line: {
                        stroke: 'purple',
                        strokeWidth: 2,
                        opacity: 1,
                      },
                    }}
                  />
                )}

                {/* X-axis */}
                <Axis
                  id="x-axis"
                  position={Position.Bottom}
                  showOverlappingTicks
                  tickFormat={(d) => moment(d).format('MMM DD')}
                />

                {/* Y-axis */}
                <Axis id="y-axis" position={Position.Left} showOverlappingTicks />

                {/* Render data grouped by entity */}
                {paginatedEntities.map(([entityId, data]) => {
                  const entityLabel = getEntityLabel(entityId, data);
                  const entityColor = entityColors.byId.get(entityId) || defaultColor;

                  // Check if this entity has actual data
                  const hasActualData = data.some(point => point.actual !== null);

                  // Check if this entity has forecast data
                  const hasForecastData = data.some(point =>
                    point.forecast !== null
                  );

                  const hasConfidenceInterval = data.some(point =>
                    point.upper !== null && point.lower !== null
                  );

                  // Should we show the confidence interval for this entity?
                  const showConfidenceInterval = shouldShowConfidenceInterval(entityId);

                  const effectiveForecastFrom = getEffectiveForecastPoint();
                  // Split actual data into "before forecast" and "after forecast" segments
                  const actualBeforeForecasts = data.filter(point =>
                    point.actual !== null && (effectiveForecastFrom == null || point.x <= effectiveForecastFrom)
                  );

                  const actualAfterForecasts = data.filter(point =>
                    point.actual !== null && (forecastTo == null || point.x > forecastTo)
                  );


                  // Find the relevant points/times
                  const lastActualPoint = actualBeforeForecasts.length > 0 ? actualBeforeForecasts[actualBeforeForecasts.length - 1] : null;
                  const firstBoundPoint = data.find(point => point.upper !== null && point.lower !== null);

                  // Prepare the data for AreaSeries IF both points exist
                  const originalAreaData = data.filter(point => point.upper !== null && point.lower !== null);
                  const originalForecastPoints = data.filter(point => point.forecast !== null);
                  let presentationAreaData = originalAreaData;
                  let presentationForecastData = originalForecastPoints;
                  if (lastActualPoint && firstBoundPoint && lastActualPoint.x < firstBoundPoint.x) {
                      // Create a synthetic point to bridge the visual gap between the last actual
                      // data point and the start of the forecast confidence band (AreaSeries).
                      //
                      // How it works:
                      // 1. The AreaSeries data needs to start at the *timestamp* (x-value) of the
                      //    last actual data point (`lastActualPoint.x`).
                      // 2. For the *bounds* (upper/lower y-values) at this synthetic starting point,
                      //    we use the *value* of the last actual data point (`lastActualPoint.actual`).
                      //    This makes the shaded area visually emanate directly from the end of the actual line.
                      // 3. The subsequent points in `areaData` are the original forecast points
                      //    with their actual confidence bounds.
                      //
                      // Note: This is a presentation choice to smooth the visual transition. The actual
                      // forecast uncertainty (upper/lower bounds) only truly begins at `firstBoundPoint.x`.
                      const syntheticFirstPoint = {
                          x: lastActualPoint.x,         // Time of last actual
                          upper: lastActualPoint.actual, // Use last actual value for bounds at this synthetic point
                          lower: lastActualPoint.actual, // Use last actual value for bounds at this synthetic point
                          actual: null,                 // No actual/forecast value at this specific synthetic join point
                          forecast: lastActualPoint.actual, // Use last actual value for forecast at this synthetic point
                          entityId: lastActualPoint.entityId,           // Add entityId for consistency
                          entity: lastActualPoint.entity,     // Add entity for consistency
                      };
                      // Prepend the synthetic point to the actual forecast bound points
                      presentationAreaData = [syntheticFirstPoint as Row, ...originalAreaData];
                      presentationForecastData = [syntheticFirstPoint as Row, ...originalForecastPoints];
                  }

                  return (
                    <React.Fragment key={entityId}>
                      {/* Confidence bounds - shown conditionally based on hover */}
                      {hasConfidenceInterval && (
                        <AreaSeries
                          id={`Bounds-${entityId}`}
                          xScaleType={ScaleType.Time}
                          yScaleType={ScaleType.Linear}
                          xAccessor="x"
                          yAccessors={['upper']}
                          y0Accessors={['lower']}
                          data={presentationAreaData}
                          color={entityColor}
                          areaSeriesStyle={{
                            area: {
                              /*
                                * FIXME: We intentionally use an opacity of 0.1 (instead of 0) when not hovered.
                                * Using opacity 0 would make the confidence interval (from p10 to p90)
                                * completely invisible, especially since the p50 forecast can differ greatly
                                * from the historical data.
                                * The 0.1 opacity helps users see the confidence interval without
                                * overly obscuring the other time series.
                                */
                              opacity: showConfidenceInterval ? 0.3 : 0.1,
                              fill: entityColor
                            },
                            line: {
                              visible: showConfidenceInterval, // Hide border lines when area is hidden
                              stroke: entityColor,
                              strokeWidth: 1,
                              opacity: showConfidenceInterval ? 1 : 0.1
                            }
                          }}
                          hideInLegend={true}
                        />)}

                      {/* 
                      FIXME: Rendering of actual data with split/continuous toggle.
                      
                      Why we split actual data by default (showSplitActualData = true):
                      1. When forecast data overlays actual data in the same time range, tooltips can disappear
                         or behave unpredictably due to competing series at the same x-coordinates.
                      2. Visually, it creates a cleaner separation between actual historical data and
                         forecast projections, making the chart easier to read.
                      3. By rendering actual data as two separate segments (before and after forecast),
                         we avoid visual confusion where forecast and actual lines cross or overlap.
                      
                      The toggle allows users to switch to a continuous view if they prefer seeing
                      the complete actual data as a single uninterrupted line.
                    */}
                      {showSplitActualData ? (
                        // Split view - show before and after separately
                        <>
                          {actualBeforeForecasts.length > 0 && (
                            <LineSeries
                              // IMPORTANT: Must use unique IDs for each LineSeries component
                              // Using the same ID for before/after segments causes @elastic/charts to:
                              // 1. Miscalculate the domain and zoom level (causing chart to zoom in incorrectly)
                              // 2. Position the forecastFrom LineAnnotation off-screen
                              // 3. Create internal rendering conflicts between data segments
                              // This happens because the chart library tracks series by ID for domain calculations
                              // and internal state management
                              id={`Actual-${entityId}-before`}
                              // The name prop can remain the same (${entityLabel}) since I want both segments 
                              // to appear identically in tooltips or legends (though they are currently hidden in the legend)
                              name={`${entityLabel}`}
                              xScaleType={ScaleType.Time}
                              yScaleType={ScaleType.Linear}
                              xAccessor="x"
                              yAccessors={['actual']}
                              data={actualBeforeForecasts}
                              color={entityColor}
                              lineSeriesStyle={{
                                line: { strokeWidth: 2 },        // thick line
                                point: { visible: true, radius: 3 }, // bigger points
                              }}
                            />
                          )}

                          {actualAfterForecasts.length > 0 && (
                            <LineSeries
                              // Same series requires distinct ID to prevent domain calculation issues
                              id={`Actual-${entityId}-after`}
                              name={`${entityLabel}`}
                              xScaleType={ScaleType.Time}
                              yScaleType={ScaleType.Linear}
                              xAccessor="x"
                              yAccessors={['actual']}
                              data={actualAfterForecasts}
                              color={entityColor}
                              lineSeriesStyle={{
                                line: { strokeWidth: 2 },        // thick line
                                point: { visible: true, radius: 3 }, // bigger points
                              }}
                            />
                          )}
                        </>
                      ) : (
                        // Continuous view - show all actual data in one series
                        hasActualData && (
                          <LineSeries
                            id={`Actual-${entityId}`}
                            name={`Actual - ${entityLabel}`}
                            xScaleType={ScaleType.Time}
                            yScaleType={ScaleType.Linear}
                            xAccessor="x"
                            yAccessors={['actual']}
                            data={data.filter(point => point.actual !== null)}
                            color={entityColor}
                            lineSeriesStyle={{
                              line: { strokeWidth: 2 },        // thick line
                              point: { visible: true, radius: 3 }, // bigger points
                            }}
                          />
                        )
                      )}

                      {/* Forecast data - dotted line with same color */}
                      {hasForecastData && (
                        <>
                          <LineSeries
                            id={`Forecast-${entityId}`}
                            name={`Forecast - ${entityLabel}`}
                            xScaleType={ScaleType.Time}
                            yScaleType={ScaleType.Linear}
                            xAccessor="x"
                            yAccessors={['forecast']}
                            data={presentationForecastData}
                            color={entityColor}
                            lineSeriesStyle={{
                              line: {
                                strokeWidth: 2, // thick line
                                dash: [3, 3]
                              },
                              point: { visible: true, radius: 3 }, // bigger points
                            }}
                          />
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </Chart>
            </div>

            {/* Main legend area */}
            {/* Using direction="row" to display legend items horizontally instead of stacked vertically */}
            {/* Adding wrap=true to allow items to flow to next line when they don't fit in one row */}
            <EuiFlexGroup direction="row" gutterSize="s" style={{ marginTop: 8 }} wrap>
              {/* Basic legend with Actual and Forecast sections */}
              {/* Entity legend section - show for all cases but with different content */}
              {(() => {
                // If there's only one entity and it ends with NO_ENTITY_SUFFIX, show "Actual" with actualColor
                if (dataByEntity.size === 1) {
                  const entityId = Array.from(dataByEntity.keys())[0];
                  if (entityId.endsWith(NO_ENTITY_SUFFIX)) {
                    return (
                      <EuiFlexItem grow={false}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <EuiHealth color={actualColor}>
                            Actual
                          </EuiHealth>
                        </div>
                      </EuiFlexItem>
                    );
                  }
                }

                // For all other cases, return an array of EuiFlexItems directly
                return paginatedEntities.map(([entityId, data]) => {
                  const entityLabel = getEntityLabel(entityId, data);
                  const entityColor = entityColors.byId.get(entityId) || defaultColor;

                  return (
                    <EuiFlexItem grow={false} key={entityId}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <EuiHealth color={entityColor}>
                          {entityLabel}
                        </EuiHealth>
                      </div>
                    </EuiFlexItem>
                  );
                });
              })()}

              {/* "Forecast" legend item + optional (Live) badge */}
              <EuiFlexItem grow={false}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {fullForecastLabel && (
                    <EuiHealth color={forecastFromColor}>
                      {fullForecastLabel}
                    </EuiHealth>
                  )}

                  {/* Show 'Live' badge if active */}
                  {isLive && (
                    <EuiBadge color="danger" style={{ marginLeft: 8 }}>
                      LIVE
                    </EuiBadge>
                  )}
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>

            {/* Add pagination controls below the legend */}
            {dataByEntity.size > 1 && (
              <EuiFlexGroup alignItems="center"
                justifyContent="spaceBetween" // Spread out left & right
                style={{ marginTop: 16, marginLeft: 0 }} // Removed the left margin
              >
                {/* Left side: Time series per page */}
                <EuiFlexItem grow={false}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '4px' }}>Time series per page:</span>
                    <EuiPopover
                      id="seriesPerPagePopover"
                      button={
                        <EuiButtonEmpty
                          size="xs"
                          color="text"
                          iconType="arrowDown"
                          iconSide="right"
                          onClick={toggleSeriesPerPagePopover}
                          style={{ minWidth: 'auto', padding: '0 4px' }}
                        >
                          {seriesPerPage}
                        </EuiButtonEmpty>
                      }
                      isOpen={isSeriesPerPagePopoverOpen}
                      closePopover={closeSeriesPerPagePopover}
                      panelPaddingSize="none"
                      anchorPosition="downCenter">
                      <EuiContextMenuPanel
                        size="s"
                        items={seriesPerPageOptions.map(option => (
                          <EuiContextMenuItem
                            key={`${option.value} series`}
                            icon={getIconType(Number(option.value))}
                            onClick={() => {
                              closeSeriesPerPagePopover();
                              setSeriesPerPage(Number(option.value));
                            }}>
                            {option.text}
                          </EuiContextMenuItem>
                        ))}
                      />
                    </EuiPopover>
                  </div>
                </EuiFlexItem>
                {/* Right side: Page navigation (only show if more pages) */}
                {dataByEntity.size > seriesPerPage && (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiSmallButtonEmpty
                          iconType="arrowLeft"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          isDisabled={currentPage === 1}
                          aria-label="Previous page"
                        >
                        </EuiSmallButtonEmpty>
                      </EuiFlexItem>

                      {/* Replace the text with page number buttons */}
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup gutterSize="xs" alignItems="center">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <EuiFlexItem grow={false} key={pageNum}>
                              <EuiSmallButtonEmpty
                                size="xs"
                                onClick={() => setCurrentPage(pageNum)}
                                style={{
                                  backgroundColor: 'transparent',
                                  color: currentPage === pageNum ? '#006BB4' : 'inherit',
                                  textDecoration: currentPage === pageNum ? 'underline' : 'none',
                                  minWidth: '28px',
                                  fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                                  margin: '0 2px',
                                }}
                              >
                                {pageNum}
                              </EuiSmallButtonEmpty>
                            </EuiFlexItem>
                          ))}
                        </EuiFlexGroup>
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiSmallButtonEmpty
                          iconType="arrowRight"
                          iconSide="right"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          isDisabled={currentPage === totalPages}
                          aria-label="Next page"
                        >
                        </EuiSmallButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}

          </>
        ) : (
          <EuiText>No forecast data available</EuiText>
        )}
      </EuiPanel>

      {/* Add the custom query dialog */}
      {
        isCustomQueryDialogOpen && (
          <EuiModal onClose={() => setIsCustomQueryDialogOpen(false)}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Add custom query</EuiModalHeaderTitle>
            </EuiModalHeader>

            {/* display="rowCompressed" forces the label and its labelAppend to occupy a single row at the top,
with the Documentation link flushed to the right, creating a clean header for the code editor below */}
            <EuiModalBody>
              <EuiForm>
                <EuiFormRow
                  display="rowCompressed"
                  label={
                    // Wrap the label in EuiText so it matches the button's line‐height
                    // FIXME: emphasize the "Boolean" part
                    <EuiText size="s" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                      OpenSearch Boolean Query DSL filter
                    </EuiText>
                  }
                  labelAppend={
                    // Same approach for the appended link, ensuring identical vertical alignment
                    <EuiText size="s" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                      <EuiButtonEmpty
                        size="xs"
                        iconType="popout"
                        iconSide="right"
                        href="https://opensearch.org/docs/latest/query-dsl/compound/bool/"
                        target="_blank"
                      >
                        Documentation
                      </EuiButtonEmpty>
                    </EuiText>
                  }
                  fullWidth
                  isInvalid={!!jsonParseError}
                  error={jsonParseError}
                  helpText="Use a Boolean query with must, should, must_not, and filter clauses to effectively search your data."
                >
                  {/* 
      Wrap the code editor in a container that allows an absolutely 
      positioned button in the top-right corner.
    */}
                  <div style={{ position: 'relative' }}>
                    <EuiCodeEditor
                      mode="json"
                      width="100%"
                      height="150px"
                      value={filterEditorContent}
                      aria-label="Code Editor"
                      onChange={(value: string) => {
                        // Always update the editor content
                        setFilterEditorContent(value);

                        // Validate JSON and update error state
                        try {
                          const parsedValue = JSON.parse(value);
                          setJsonParseError(null); // Clear error if valid
                          setCustomQueryData({ ...customQueryData, filter_query: parsedValue });
                        } catch (e) {
                          // Set error message without showing a toast
                          setJsonParseError(`Invalid JSON: ${e}`);
                        }
                      }}
                      setOptions={{
                        fontSize: '14px',
                      }}
                    />

                    {/* 
        Wrapper div for positioning. Apply absolute positioning here.
        The EuiToolTip will wrap this div, giving it a stable anchor.
      */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1, // Ensure the button stays above the editor
                      }}
                    >
                      <EuiToolTip content="Beautify JSON" position="left">
                        <EuiSmallButtonIcon
                          iconType="brush"
                          aria-label="Beautify JSON"
                          // Remove absolute positioning from the button itself
                          // style={{}} // No specific style needed here anymore unless for other reasons
                          onClick={() => {
                            try {
                              // Parse existing content
                              const parsedValue = JSON.parse(filterEditorContent);
                              // Stringify with indentation (2 spaces here)
                              const beautifiedValue = JSON.stringify(parsedValue, null, 2);

                              // Update the editor content & state
                              setFilterEditorContent(beautifiedValue);
                              setJsonParseError(null);
                              setCustomQueryData({ ...customQueryData, filter_query: parsedValue });
                            } catch (e) {
                              setJsonParseError(`Invalid JSON: ${e}`);
                            }
                          }}
                        />
                      </EuiToolTip>
                    </div>
                  </div>
                </EuiFormRow>

                <EuiSpacer size="m" />

                {/* Replace single accordion with multiple accordions for each sub-aggregation */}
                {/* FIXME: UI improvements needed for sub-aggregations:
                  1. Add a trash icon beside each aggregation method for easy removal 
                  2. Ensure the "Add sub aggregation" button spans the same width as 
                     the combined field, aggregation method, order, and trash icon columns
                  3. Make sure trash icon is present on all aggregations but disabled when only one remains
              */}
                {customSubAggregations.map((agg, index) => (
                  <EuiAccordion
                    id={`subAggregation-${index}`}
                    key={`subAggregation-${index}`}
                    buttonContent={`Sub aggregation ${index + 1}`}
                    initialIsOpen={true}
                    paddingSize="m"
                  >
                    <div style={{ paddingLeft: '16px' }}>
                      <EuiText size="s">
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '12px', color: '#69707D', fontWeight: 'normal' }}>
                            {agg.field}, {agg.aggregationMethod}(), {agg.order}
                          </span>
                        </div>
                      </EuiText>

                      <EuiSpacer size="s" />

                      <EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiFormRow label="Field">
                            <EuiSelect
                              options={[
                                { value: 'forecast_value', text: 'forecast_value' },
                                { value: 'confidence_interval', text: 'confidence_interval' }
                              ]}
                              value={agg.field}
                              onChange={(e) => updateSubAggregation(index, 'field', e.target.value)}
                            />
                          </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem>
                          <EuiFormRow label="Aggregation method">
                            <EuiSelect
                              options={[
                                { value: 'max', text: 'max()' },
                                { value: 'min', text: 'min()' },
                                { value: 'avg', text: 'avg()' },
                                { value: 'sum', text: 'sum()' }
                              ]}
                              value={agg.aggregationMethod}
                              onChange={(e) => updateSubAggregation(index, 'aggregationMethod', e.target.value)}
                            />
                          </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem>
                          <EuiFormRow label="Order">
                            <EuiSelect
                              options={[
                                { value: 'DESC', text: 'Descending' },
                                { value: 'ASC', text: 'Ascending' }
                              ]}
                              value={agg.order}
                              onChange={(e) => updateSubAggregation(index, 'order', e.target.value)}
                            />
                          </EuiFormRow>
                        </EuiFlexItem>

                        {/* Always show trash icon but disable it when there's only one sub-aggregation */}
                        <EuiFlexItem grow={false}>
                          <EuiFormRow>
                            <EuiSmallButtonIcon
                              iconType="trash"
                              color="danger"
                              aria-label="Remove sub-aggregation"
                              onClick={() => removeSubAggregation(index)}
                              isDisabled={customSubAggregations.length === 1}
                            />
                          </EuiFormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </div>
                  </EuiAccordion>
                ))}

                <EuiSpacer size="m" />

                {/* Full-width add button */}
                <EuiSmallButton
                  iconType="plusInCircle"
                  onClick={addSubAggregation}
                  size="s"
                  fullWidth
                >
                  Add sub aggregation
                </EuiSmallButton>
              </EuiForm>
            </EuiModalBody>

            <EuiModalFooter>
              <EuiSmallButtonEmpty
                onClick={() => setIsCustomQueryDialogOpen(false)}
                iconType="cross"
              >
                Cancel
              </EuiSmallButtonEmpty>
              <EuiSmallButton
                fill
                onClick={() => {
                  // Format the data and prepare it for API call
                  try {
                    // Parse and validate the JSON from the editor content
                    const parsedValue = JSON.parse(filterEditorContent);

                    // Store formatted subaggregations
                    const formattedSubAggs = formatSubAggregationsForApi();

                    // Generate a JSON summary combining the filter and aggregations
                    const querySummary = {
                      filter_query: parsedValue,
                      subaggregations: formattedSubAggs
                    };

                    // Convert to a nicely formatted JSON string
                    setCustomQuerySummary(JSON.stringify(querySummary, null, 2));

                    // Update the customQueryData
                    setCustomQueryData({
                      filter_query: parsedValue,
                      subaggregations: formattedSubAggs
                    });

                    // Close the dialog
                    setIsCustomQueryDialogOpen(false);
                  } catch (e) {
                    // Handle JSON parsing error
                    core.notifications.toasts.addDanger(`Invalid JSON: ${e.message}`);
                  }
                }}
              >
                {customQuerySummary ? 'Update custom query' : 'Add custom query'}
              </EuiSmallButton>
            </EuiModalFooter>
          </EuiModal>
        )
      }
    </>
  );
}