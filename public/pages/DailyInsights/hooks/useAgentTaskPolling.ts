/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getMLTaskStatus } from '../../../redux/reducers/ml';
import { getNotifications } from '../../../services';
import { getAgentTask, saveAgentTask, updateAgentTaskState, extractFailedIndices, showCompletionToasts, showAgentFailureToast } from '../utils/agentTaskStorage';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60; // 5 minutes
const MAX_CONSECUTIVE_ERRORS = 3;

type PollOutcome = 'COMPLETED' | 'FAILED' | 'TIMEOUT';

export function useAgentTaskPolling(
  dataSourceId: string,
  onComplete: (outcome: PollOutcome, response?: any) => void
) {
  const dispatch = useDispatch();
  const [isPolling, setIsPolling] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const errorCountRef = useRef(0);
  const tickActiveRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    pollCountRef.current = 0;
    errorCountRef.current = 0;
    setIsPolling(false);
  };

  const poll = async () => {
    if (tickActiveRef.current) return;
    tickActiveRef.current = true;
    try {
      // Read task info from sessionStorage each tick to avoid stale closures
      const task = getAgentTask();
      if (!task || task.finalState) {
        stopPolling();
        return;
      }

      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        updateAgentTaskState('TIMEOUT');
        stopPolling();
        getNotifications().toasts.addWarning('Agent task polling timed out after 5 minutes.');
        onCompleteRef.current('TIMEOUT');
        return;
      }

      try {
        const resp: any = await dispatch(
          getMLTaskStatus(task.taskId, task.dsId)
        );
        errorCountRef.current = 0;
        const state = resp?.response?.state || '';

        if (state === 'COMPLETED') {
          const failures = extractFailedIndices(resp.response);
          updateAgentTaskState('COMPLETED', failures.length > 0 ? failures : undefined);
          stopPolling();
          showCompletionToasts(resp.response);
          onCompleteRef.current('COMPLETED', resp);
        } else if (state === 'FAILED' || state === 'CANCELLED') {
          updateAgentTaskState('FAILED');
          stopPolling();
          showAgentFailureToast(
            resp?.response?.response?.error_message || resp?.response?.error || 'Check logs for details.'
          );
          onCompleteRef.current('FAILED', resp);
        }
      } catch {
        errorCountRef.current += 1;
        if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
          updateAgentTaskState('FAILED');
          stopPolling();
          getNotifications().toasts.addWarning(
            'Lost connection while tracking agent task. Check the Insight Management page for results.'
          );
          onCompleteRef.current('FAILED');
        }
      }
    } finally {
      tickActiveRef.current = false;
    }
  };

  // Note: if user has multiple browser tabs, startPolling uses last-write-wins
  // for sessionStorage. This is acceptable — the latest task is the most relevant.
  const startPolling = (taskId: string) => {
    stopPolling();
    saveAgentTask(taskId, dataSourceId);
    setIsPolling(true);
    pollCountRef.current = 0;
    errorCountRef.current = 0;
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };

  // Resume polling on mount if there's an active task in sessionStorage
  useEffect(() => {
    const task = getAgentTask();
    if (task && !task.finalState) {
      setIsPolling(true);
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }
    return () => stopPolling();
  }, []);

  return { isPolling, startPolling };
}
