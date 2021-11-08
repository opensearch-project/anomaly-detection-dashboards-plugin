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

import { DetectorJobsFormikValues } from '../../DetectorJobs/models/interfaces';

export const INITIAL_DETECTOR_JOB_VALUES: DetectorJobsFormikValues = {
  realTime: true,
  historical: false,
  startTime: 'now-30d',
  endTime: 'now',
};

export const HISTORICAL_DATE_RANGE_COMMON_OPTIONS = [
  { start: 'now-24h', end: 'now', label: 'last 24 hours' },
  { start: 'now-7d', end: 'now', label: 'last 7 days' },
  { start: 'now-30d', end: 'now', label: 'last 30 days' },
  { start: 'now-90d', end: 'now', label: 'last 90 days' },

  { start: 'now/d', end: 'now', label: 'Today' },
  { start: 'now/w', end: 'now', label: 'Week to date' },
  { start: 'now/M', end: 'now', label: 'Month to date' },
  { start: 'now/y', end: 'now', label: 'Year to date' },
];
