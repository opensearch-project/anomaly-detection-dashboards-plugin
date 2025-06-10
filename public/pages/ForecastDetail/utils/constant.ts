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

export const MAX_POINTS = 10000;

export const DATE_PICKER_QUICK_OPTIONS = [
    { start: 'now/d', end: 'now', label: 'Today' },
    { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
    { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
    { start: 'now-12h', end: 'now', label: 'Last 12 hours' },
    { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
    { start: 'now-1w', end: 'now', label: 'Last week' },
];

// Default time range for resetting views and initial loads
// Uses "last 3 hours" as the standard window for chart data
export const DEFAULT_TIME_RANGE = {
  start: 'now/d',
  end: 'now'
};