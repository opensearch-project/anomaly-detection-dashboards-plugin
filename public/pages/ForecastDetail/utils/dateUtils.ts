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

import moment from 'moment';
import { DateRange } from './interface';
import { DATE_PICKER_QUICK_OPTIONS } from './constant';
import dateMath from '@elastic/datemath';
/**
 * Comprehensive date utilities for handling both relative and absolute date ranges
 */

/**
 * Parse a date math expression like 'now-1h' or 'now/d'
 * using the @elastic/datemath library.
 *
 * @param expression Date math expression
 * @returns Timestamp in milliseconds
 */
export const parseDateMath = (expression: string): number => {
  if (!expression) {
    return Date.now();
  }

  // If it's purely numeric, assume it's a UNIX timestamp already
  if (!isNaN(Number(expression))) {
    return Number(expression);
  }

  // Try parsing via @elastic/datemath
  const parsed = dateMath.parse(expression);
  if (parsed) {
    return parsed.valueOf();
  }

  // Fallback to regular moment parsing for non-math date strings
  const date = moment(expression);
  return date.isValid() ? date.valueOf() : Date.now();
};

/**
 * Convert a DateRange with either relative or absolute values to epoch milliseconds
 * @param dateRange DateRange object that may contain relative or absolute values
 * @returns DateRange with absolute epoch millisecond values
 */
export const convertToEpochRange = (dateRange: DateRange): { startDate: number; endDate: number } => {
  let start: number;
  let end: number;
  
  // Handle start date
  if (typeof dateRange.startDate === 'string' && dateRange.isRelative) {
    start = parseDateMath(dateRange.startDate);
  } else {
    start = typeof dateRange.startDate === 'string' ? parseInt(dateRange.startDate, 10) : dateRange.startDate;
  }
  
  // Handle end date
  if (typeof dateRange.endDate === 'string' && dateRange.isRelative) {
    end = parseDateMath(dateRange.endDate);
  } else {
    end = typeof dateRange.endDate === 'string' ? parseInt(dateRange.endDate, 10) : dateRange.endDate;
  }
  
  return { startDate: start, endDate: end };
};

/**
 * Convert an epoch timestamp to a formatted string
 * @param timestamp Timestamp in milliseconds
 * @param format Output format (defaults to MM/DD/YYYY hh:mm A)
 * @returns Formatted date string
 */
export const formatEpochDate = (timestamp: number, format = 'MM/DD/YYYY hh:mm A'): string => {
  return moment(timestamp).format(format);
};

/**
 * Create a DateRange from quick option strings
 * @param start Start date expression
 * @param end End date expression 
 * @returns DateRange object with isRelative flag set
 */
export const createRelativeDateRange = (start: string, end: string): DateRange => {
  return {
    startDate: start,
    endDate: end,
    isRelative: true
  };
};

/**
 * Create a DateRange from absolute timestamps
 * @param startDate Start timestamp
 * @param endDate End timestamp
 * @returns DateRange object with isRelative flag unset
 */
export const createAbsoluteDateRange = (startDate: number, endDate: number): DateRange => {
  return {
    startDate,
    endDate,
    isRelative: false
  };
};

/**
 * Convert a DateRange to a user-friendly string
 * @param dateRange DateRange object
 * @returns Human-readable date range string
 */
export const dateRangeToString = (dateRange: DateRange): string => {
  if (dateRange.isRelative) {
    // Try to match with predefined options for a friendly name
    const matchedOption = DATE_PICKER_QUICK_OPTIONS.find(
      option => option.start === dateRange.startDate && option.end === dateRange.endDate
    );
    
    if (matchedOption) {
      return matchedOption.label;
    }
    
    // Fall back to converting to absolute times and formatting
    const { startDate, endDate } = convertToEpochRange(dateRange);
    return `${formatEpochDate(startDate)} to ${formatEpochDate(endDate)}`;
  } else {
    // For absolute dates, just format them
    const start = typeof dateRange.startDate === 'string' 
      ? parseInt(dateRange.startDate, 10) 
      : dateRange.startDate;
      
    const end = typeof dateRange.endDate === 'string'
      ? parseInt(dateRange.endDate, 10)
      : dateRange.endDate;
      
    return `${formatEpochDate(start)} to ${formatEpochDate(end)}`;
  }
};

export const isRelativeDateRange = (start: string, end: string): boolean => {
  return start.includes('now') || end.includes('now');
};