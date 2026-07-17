/*
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  showAgentFailureToast,
  showCompletionToasts,
  saveAgentTask,
  getAgentTask,
  updateAgentTaskState,
  extractFailedIndices,
} from '../agentTaskStorage';

const mockAddSuccess = jest.fn();
const mockAddDanger = jest.fn();
const mockMountReactNode = jest.fn((node) => node);

jest.mock('../../../../services', () => ({
  getNotifications: () => ({
    toasts: {
      addSuccess: mockAddSuccess,
      addDanger: mockAddDanger,
    },
  }),
}));

// NOTE: src/core/public/utils is a real module (exports mountReactNode), so this must NOT be a
// virtual mock. Under Jest 30's stricter resolver a virtual mock of an existing module races with
// the real module across parallel workers and intermittently fails to apply (mountReactNode ends up
// un-mocked -> 0 calls). Mocking it as a normal module makes it deterministic.
jest.mock('../../../../../../../src/core/public/utils', () => ({
  mountReactNode: (node: React.ReactNode) => mockMountReactNode(node),
}));

describe('agentTaskStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  afterAll(() => {
    sessionStorage.clear();
  });

  describe('saveAgentTask', () => {
    test('saves task to sessionStorage', () => {
      saveAgentTask('task-123', 'ds-1');
      const task = getAgentTask();
      expect(task).not.toBeNull();
      expect(task!.taskId).toBe('task-123');
      expect(task!.dsId).toBe('ds-1');
      expect(task!.startTime).toBeDefined();
    });

    test('overwrites previous task', () => {
      saveAgentTask('task-1', 'ds-1');
      saveAgentTask('task-2', 'ds-2');
      const task = getAgentTask();
      expect(task!.taskId).toBe('task-2');
      expect(task!.dsId).toBe('ds-2');
    });
  });

  describe('getAgentTask', () => {
    test('returns null when no task stored', () => {
      expect(getAgentTask()).toBeNull();
    });

    test('returns null for expired task (>24h)', () => {
      const expired = {
        taskId: 'old-task',
        dsId: '',
        startTime: Date.now() - 25 * 60 * 60 * 1000,
      };
      sessionStorage.setItem('ad_agent_task', JSON.stringify(expired));
      expect(getAgentTask()).toBeNull();
    });

    test('returns task within 24h window', () => {
      saveAgentTask('recent-task', '');
      expect(getAgentTask()).not.toBeNull();
    });

    test('returns null for corrupted data', () => {
      sessionStorage.setItem('ad_agent_task', 'not-json');
      expect(getAgentTask()).toBeNull();
    });
  });

  describe('updateAgentTaskState', () => {
    test('sets finalState on existing task', () => {
      saveAgentTask('task-1', '');
      updateAgentTaskState('COMPLETED');
      const task = getAgentTask();
      expect(task!.finalState).toBe('COMPLETED');
    });

    test('sets failedIndices when provided', () => {
      saveAgentTask('task-1', '');
      const failures = [{ index: 'idx-1', error: 'validation failed' }];
      updateAgentTaskState('COMPLETED', failures);
      const task = getAgentTask();
      expect(task!.failedIndices).toEqual(failures);
    });

    test('does not set failedIndices when not provided', () => {
      saveAgentTask('task-1', '');
      updateAgentTaskState('FAILED');
      const task = getAgentTask();
      expect(task!.failedIndices).toBeUndefined();
    });

    test('no-op when no task exists', () => {
      updateAgentTaskState('FAILED');
      expect(getAgentTask()).toBeNull();
    });
  });

  describe('extractFailedIndices', () => {
    test('extracts failures from task response', () => {
      const response = {
        response: {
          inference_results: [
            {
              output: [
                {
                  result: JSON.stringify({
                    'index-a': [
                      { status: 'success', detectorName: 'det-1' },
                      { status: 'failed_validation', error: 'No data found' },
                    ],
                    'index-b': [{ status: 'success', detectorName: 'det-2' }],
                  }),
                },
              ],
            },
          ],
        },
      };
      const failures = extractFailedIndices(response);
      expect(failures).toEqual([{ index: 'index-a', error: 'No data found' }]);
    });

    test('returns empty array when all succeed', () => {
      const response = {
        response: {
          inference_results: [
            {
              output: [
                {
                  result: JSON.stringify({
                    'index-a': [{ status: 'success' }],
                  }),
                },
              ],
            },
          ],
        },
      };
      expect(extractFailedIndices(response)).toEqual([]);
    });

    test('returns empty array for null response', () => {
      expect(extractFailedIndices(null)).toEqual([]);
    });

    test('returns empty array for malformed response', () => {
      expect(extractFailedIndices({ response: {} })).toEqual([]);
    });

    test('uses "Unknown error" when error field is missing', () => {
      const response = {
        response: {
          inference_results: [
            {
              output: [
                {
                  result: JSON.stringify({
                    'index-a': [{ status: 'failed' }],
                  }),
                },
              ],
            },
          ],
        },
      };
      const failures = extractFailedIndices(response);
      expect(failures).toEqual([{ index: 'index-a', error: 'Unknown error' }]);
    });
  });

  describe('showCompletionToasts', () => {
    test('shows a generic success toast when the response has no result payload', () => {
      showCompletionToasts({ response: {} });

      expect(mockAddSuccess).toHaveBeenCalledWith('Agent task completed');
      expect(mockAddDanger).not.toHaveBeenCalled();
    });

    test('shows success and failure summaries from the agent result payload', () => {
      showCompletionToasts({
        response: {
          inference_results: [
            {
              output: [
                {
                  result: JSON.stringify({
                    'index-a': [{ status: 'success' }, { status: 'success' }],
                    'index-b': [{ status: 'failed', error: 'No data found' }],
                    'index-c': [{ status: 'failed' }],
                  }),
                },
              ],
            },
          ],
        },
      });

      expect(mockAddSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '1 index configured',
        })
      );
      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '2 indices failed',
          toastLifeTimeMs: 60000,
        })
      );
      expect(mockMountReactNode).toHaveBeenCalledTimes(2);
    });

    test('falls back to a generic success toast for malformed result JSON', () => {
      showCompletionToasts({
        response: {
          inference_results: [
            {
              output: [{ result: 'not-json' }],
            },
          ],
        },
      });

      expect(mockAddSuccess).toHaveBeenCalledWith('Agent task completed');
    });
  });

  describe('showAgentFailureToast', () => {
    test('shows a retry toast with the failure message', () => {
      showAgentFailureToast('agent timed out');

      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Detector creation failed',
          toastLifeTimeMs: 60000,
        })
      );
      expect(mockMountReactNode).toHaveBeenCalledTimes(1);
    });
  });
});
