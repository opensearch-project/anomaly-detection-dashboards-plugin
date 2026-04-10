/*
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { getNotifications } from '../../../services';
import { mountReactNode } from '../../../../../../src/core/public/utils';
import { DAILY_INSIGHTS_INDICES_PAGE_NAV_ID } from '../../../utils/constants';

const STORAGE_KEY = 'ad_agent_task';
const IM_URL = `/app/${DAILY_INSIGHTS_INDICES_PAGE_NAV_ID}`;

export interface AgentTaskInfo {
  taskId: string;
  dsId: string;
  startTime: number;
  finalState?: string;
  failedIndices?: Array<{ index: string; error: string }>;
}

export function saveAgentTask(taskId: string, dsId: string) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ taskId, dsId, startTime: Date.now() })
  );
}

export function getAgentTask(): AgentTaskInfo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const task = JSON.parse(raw);
    // Expire after 24h
    if (Date.now() - task.startTime > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return task;
  } catch {
    return null;
  }
}

export function updateAgentTaskState(
  finalState: string,
  failedIndices?: Array<{ index: string; error: string }>
) {
  const task = getAgentTask();
  if (task) {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...task, finalState, ...(failedIndices && { failedIndices }) })
    );
  }
}

export function extractFailedIndices(response: any): Array<{ index: string; error: string }> {
  try {
    const raw = response?.response?.inference_results?.[0]?.output?.[0]?.result;
    if (!raw) return [];
    const result = JSON.parse(raw);
    const failures: Array<{ index: string; error: string }> = [];
    for (const idx of Object.keys(result)) {
      const dets = result[idx] || [];
      for (const d of dets) {
        if (d.status !== 'success') {
          failures.push({ index: idx, error: d.error || 'Unknown error' });
        }
      }
    }
    return failures;
  } catch {
    return [];
  }
}

export function showCompletionToasts(response: any) {
  const notifications = getNotifications();
  try {
    const raw =
      response?.response?.inference_results?.[0]?.output?.[0]?.result;
    if (!raw) {
      notifications.toasts.addSuccess('Agent task completed');
      return;
    }
    const result = JSON.parse(raw);
    const successEntries: string[] = [];
    const failureEntries: string[] = [];

    for (const idx of Object.keys(result)) {
      const dets = result[idx] || [];
      const successes = dets.filter((d: any) => d.status === 'success');
      const failures = dets.filter((d: any) => d.status !== 'success');
      if (successes.length > 0) {
        successEntries.push(`${idx}: ${successes.length} detector(s)`);
      }
      for (const f of failures) {
        failureEntries.push(`${idx}: ${f.error || 'Unknown error'}`);
      }
    }

    if (successEntries.length > 0) {
      notifications.toasts.addSuccess({
        title: `${successEntries.length} ${successEntries.length === 1 ? 'index' : 'indices'} configured`,
        text: mountReactNode(
          <EuiText size="s">
            <p>{successEntries.join(', ')}</p>
            <EuiLink href={IM_URL}>
              View in Indices Management
            </EuiLink>
          </EuiText>
        ),
      });
    }

    if (failureEntries.length > 0) {
      notifications.toasts.addDanger({
        title: `${failureEntries.length} ${failureEntries.length === 1 ? 'index' : 'indices'} failed`,
        text: mountReactNode(
          <EuiText size="s">
            {failureEntries.map((entry, i) => (
              <p key={i}>{entry}</p>
            ))}
            <EuiLink href={IM_URL}>
              Go to Indices Management to retry
            </EuiLink>
          </EuiText>
        ),
        toastLifeTimeMs: 60000,
      });
    }
  } catch {
    notifications.toasts.addSuccess('Agent task completed');
  }
}

export function showAgentFailureToast(errorMessage: string) {
  const notifications = getNotifications();
  notifications.toasts.addDanger({
    title: 'Detector creation failed',
    text: mountReactNode(
      <EuiText size="s">
        <p>{errorMessage}</p>
        <EuiLink
          href={IM_URL}
        >
          Go to Indices Management to retry
        </EuiLink>
      </EuiText>
    ),
    toastLifeTimeMs: 60000,
  });
}
