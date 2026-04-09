/*
 * SPDX-License-Identifier: Apache-2.0
 */

import moment from 'moment';

/**
 * Extract the value portion from an entity string like "field.name: value".
 * Returns the full string if no colon separator found.
 */
export function formatEntityValue(entity: string): string {
  const colonIdx = entity.indexOf(':');
  if (colonIdx === -1) return entity;
  const value = entity.substring(colonIdx + 1).trim();
  return value || entity;
}

/**
 * Replace UTC timestamps in cluster_text with local time.
 * Matches patterns like "Mar 10, 2026 08:12 Z" or "Mar 10, 2026 08:12 UTC".
 */
export function localizeTimestamps(text: string): string {
  return text.replace(
    /([A-Z][a-z]{2} \d{1,2}, \d{4} \d{2}:\d{2})\s*(?:Z|UTC)/g,
    (_, utc) => moment.utc(utc, 'MMM D, YYYY HH:mm').local().format('lll')
  );
}
