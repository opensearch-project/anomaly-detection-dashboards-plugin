/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  saveAgentTask,
  getAgentTask,
  updateAgentTaskState,
  extractFailedIndices,
} from '../agentTaskStorage';

describe('agentTaskStorage', () => {
  beforeEach(() => {
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
                    'index-b': [
                      { status: 'success', detectorName: 'det-2' },
                    ],
                  }),
                },
              ],
            },
          ],
        },
      };
      const failures = extractFailedIndices(response);
      expect(failures).toEqual([
        { index: 'index-a', error: 'No data found' },
      ]);
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
});
