/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  saveAgentTask,
  getAgentTask,
  updateAgentTaskState,
  extractFailedIndices,
} from '../agentTaskStorage';

const STORAGE_KEY = 'ad_agent_task';

describe('agentTaskStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('saveAgentTask / getAgentTask', () => {
    test('round-trips task info', () => {
      saveAgentTask('task-1', 'ds-1');
      const task = getAgentTask();
      expect(task).toMatchObject({ taskId: 'task-1', dsId: 'ds-1' });
      expect(task!.finalState).toBeUndefined();
    });

    test('returns null when empty', () => {
      expect(getAgentTask()).toBeNull();
    });

    test('returns null for corrupted JSON', () => {
      sessionStorage.setItem(STORAGE_KEY, '{bad');
      expect(getAgentTask()).toBeNull();
    });

    test('expires after 24h and cleans up storage', () => {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ taskId: 't', dsId: 'd', startTime: Date.now() - 25 * 3600 * 1000 })
      );
      expect(getAgentTask()).toBeNull();
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    test('keeps entries under 24h', () => {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ taskId: 't', dsId: 'd', startTime: Date.now() - 23 * 3600 * 1000 })
      );
      expect(getAgentTask()!.taskId).toBe('t');
    });

    test('new save overwrites previous (last-write-wins)', () => {
      saveAgentTask('old', 'ds-1');
      updateAgentTaskState('FAILED');
      saveAgentTask('new', 'ds-2');
      const task = getAgentTask()!;
      expect(task.taskId).toBe('new');
      expect(task.finalState).toBeUndefined();
    });
  });

  describe('updateAgentTaskState', () => {
    test('sets finalState', () => {
      saveAgentTask('t', 'd');
      updateAgentTaskState('COMPLETED');
      expect(getAgentTask()!.finalState).toBe('COMPLETED');
    });

    test('stores failedIndices when provided', () => {
      saveAgentTask('t', 'd');
      updateAgentTaskState('COMPLETED', [{ index: 'idx', error: 'bad mapping' }]);
      expect(getAgentTask()!.failedIndices).toEqual([{ index: 'idx', error: 'bad mapping' }]);
    });

    test('omits failedIndices key when not provided', () => {
      saveAgentTask('t', 'd');
      updateAgentTaskState('COMPLETED');
      const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
      expect(raw).not.toHaveProperty('failedIndices');
    });

    test('no-ops when storage is empty', () => {
      updateAgentTaskState('FAILED');
      expect(getAgentTask()).toBeNull();
    });
  });

  describe('extractFailedIndices', () => {
    const wrap = (obj: Record<string, any[]>) => ({
      response: {
        inference_results: [{ output: [{ result: JSON.stringify(obj) }] }],
      },
    });

    test('extracts failures, ignores successes', () => {
      const resp = wrap({
        'idx-a': [
          { status: 'success', detectorName: 'd1' },
          { status: 'failed', error: 'conflict' },
        ],
        'idx-b': [{ status: 'error', error: 'timeout' }],
      });
      expect(extractFailedIndices(resp)).toEqual([
        { index: 'idx-a', error: 'conflict' },
        { index: 'idx-b', error: 'timeout' },
      ]);
    });

    test('returns empty when all succeed', () => {
      expect(extractFailedIndices(wrap({ i: [{ status: 'success' }] }))).toEqual([]);
    });

    test('returns empty for null/undefined/empty', () => {
      expect(extractFailedIndices(null)).toEqual([]);
      expect(extractFailedIndices(undefined)).toEqual([]);
      expect(extractFailedIndices({})).toEqual([]);
    });

    test('returns empty for malformed JSON in result', () => {
      const resp = { response: { inference_results: [{ output: [{ result: 'not json' }] }] } };
      expect(extractFailedIndices(resp)).toEqual([]);
    });

    test('defaults to "Unknown error" when error field missing', () => {
      expect(extractFailedIndices(wrap({ i: [{ status: 'failed' }] }))).toEqual([
        { index: 'i', error: 'Unknown error' },
      ]);
    });
  });
});
