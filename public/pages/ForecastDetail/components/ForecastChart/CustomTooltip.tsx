import { TooltipValue } from '@elastic/charts';
import moment from 'moment';
import React from 'react';

// Create a utility function to process tooltip values
export function processTooltipValues(values: TooltipValue[]) {
  if (!values || values.length === 0) {
    return { entityId: '', tooltipRows: [] };
  }

  // Get entity ID from the first value
  let entityId = '';
  if (values.length > 0 && values[0].seriesIdentifier) {
    const match = values[0].seriesIdentifier.key.match(/spec\{(?:Actual|Forecast|Bounds)-([^}]+)\}/);
    if (match && match[1]) {
      entityId = match[1];
    }
  }

  // Check if any value has forecast data with bounds in the datum
  let hasForecastBounds = false;
  let boundsDatum = null;
  
  for (const val of values) {
    if (val.datum?.forecast !== null && 
        val.datum?.upper !== null && 
        val.datum?.lower !== null) {
      hasForecastBounds = true;
      boundsDatum = val.datum;
      break;
    }
  }

  // Rename and process values
  const renamed = values.map((v) => {
    let label = v.label;

    // Inspect series identifiers to find the right type
    const seriesKey = v.seriesIdentifier?.key || '';
    const seriesMatch = seriesKey.match(/spec\{(Actual|Forecast|Bounds)-([^}]+)\}/);
    const seriesType = seriesMatch ? seriesMatch[1] : '';

    // First check if this is a specific series type based on key
    if (seriesType === 'Actual') {
      label = 'Actual';
    } else if (seriesType === 'Forecast') {
      label = 'Forecast';
    } else if (seriesType === 'Bounds') {
      // Then use yAccessor for bounds
      if (v.seriesIdentifier.yAccessor === 'upper') {
        label = 'High';
      } else if (v.seriesIdentifier.yAccessor === 'lower') {
        label = 'Low';
      }
    } else {
      // Fall back to the standard yAccessor logic
      switch (v.seriesIdentifier.yAccessor) {
        case 'upper':
          label = 'High';
          break;
        case 'lower':
          label = 'Low';
          break;
        case 'forecast':
          label = 'Forecast';
          break;
        case 'actual':
          label = 'Actual';
          break;
        default:
          // fallback
          label = v.label;
          break;
      }
    }
    return { ...v, label };
  });

  // Generate the tooltip rows
  const tooltipRows: Array<{ label: string; value: number; color?: string }> = [];
  
  // Add directly hovered values first
  const rowsByLabel: Record<string, boolean> = {};
  
  // Find the entity's forecast color to apply to bounds
  let forecastColor: string | undefined;
  
  // Use find instead of forEach to stop iterating once we find a color
  const forecastItem = renamed.find(val => val.label === 'Forecast' && val.color);
  if (forecastItem) {
    forecastColor = forecastItem.color;
  }
  
  renamed.forEach(val => {
    if (!rowsByLabel[val.label]) {
      tooltipRows.push({
        label: val.label,
        value: val.value,
        color: val.color
      });
      rowsByLabel[val.label] = true;
    }
  });
  
  // Add bounds from datum if available and not already added
  if (hasForecastBounds && boundsDatum) {
    if (!rowsByLabel['High'] && boundsDatum.upper !== null) {
      tooltipRows.push({
        label: 'High',
        value: boundsDatum.upper,
        color: forecastColor
      });
    }
    if (!rowsByLabel['Low'] && boundsDatum.lower !== null) {
      tooltipRows.push({
        label: 'Low',
        value: boundsDatum.lower,
        color: forecastColor
      });
    }
  }

  // Sort rows in desired order
  const order = { 'High': 0, 'Forecast': 1, 'Low': 2, 'Actual': 3 };
  tooltipRows.sort((a, b) => {
    const orderA = order[a.label as keyof typeof order] ?? 99;
    const orderB = order[b.label as keyof typeof order] ?? 99;
    return orderA - orderB;
  });

  return { entityId, tooltipRows };
}

// The main tooltip component
export function CustomTooltip({
  header,
  values,
}: {
  header?: TooltipValue;
  values: TooltipValue[];
}) {
  if (!values || values.length === 0) {
    return <div className="echTooltip"><div className="echTooltip__header">No data</div></div>;
  }

  // Format the header time
  const headerTime = header ? moment(header.value).format('MMM DD HH:mm') : '';

  // Process tooltip values
  const { tooltipRows } = processTooltipValues(values);

  return (
    <div className="echTooltip">
      <div className="echTooltip__header">{headerTime}</div>
      {tooltipRows.map((row, idx) => (
        <div key={`${row.label}-${idx}`} className="echTooltip__item">
          <span 
            className="echTooltip__label"
            style={{ color: row.color }}
          >
            {row.label}
          </span>
          <span className="echTooltip__value">
            {row.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
