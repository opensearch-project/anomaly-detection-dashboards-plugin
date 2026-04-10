/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderHook, act } from '@testing-library/react';
import { useAgentTaskPolling } from '../useAgentTaskPolling';
import * as storage from '../../utils/agentTaskStorage';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../redux/reducers/ml', () => ({
  getMLTaskStatus: (taskId: string, dsId: string) => ({
    type: 'ml/GET_ML_TASK',
    taskId,
    dsId,
  }),
}));

jest.mock('../../../../services', () => ({
  getNotifications: () => ({
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    },
  }),
}));

jest.mock('../../utils/agentTaskStorage', () => {
  const actual = jest.requireActual('../../utils/agentTaskStorage');
  return {
    ...actual,
    showCompletionToasts: jest.fn(),
    showAgentFailureToast: jest.fn(),
  };
});

describe('useAgentTaskPolling', () => {
  let hookUnmount: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    // Unmount hook to trigger cleanup (clears intervals)
    if (hookUnmount) hookUnmount();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('startPolling sets isPolling=true and saves to sessionStorage', () => {
    const onComplete = jest.fn();
    const { result, unmount } = renderHook(() => useAgentTaskPolling('ds-1', onComplete));
    hookUnmount = unmount;

    expect(result.current.isPolling).toBe(false);

    act(() => {
      result.current.startPolling('task-123');
    });

    expect(result.current.isPolling).toBe(true);
    const task = storage.getAgentTask();
    expect(task).toMatchObject({ taskId: 'task-123', dsId: 'ds-1' });
  });

  test('calls onComplete with COMPLETED when task finishes', async () => {
    const onComplete = jest.fn();
    mockDispatch.mockResolvedValue({
      response: { state: 'COMPLETED', response: { inference_results: [] } },
    });

    const { result, unmount } = renderHook(() => useAgentTaskPolling('ds-1', onComplete));
    hookUnmount = unmount;

    act(() => {
      result.current.startPolling('task-1');
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(onComplete).toHaveBeenCalledWith('COMPLETED', expect.anything());
    expect(result.current.isPolling).toBe(false);
    expect(storage.getAgentTask()!.finalState).toBe('COMPLETED');
  });

  test('calls onComplete with FAILED when task fails', async () => {
    const onComplete = jest.fn();
    mockDispatch.mockResolvedValue({
      response: { state: 'FAILED', error: 'tool not found' },
    });

    const { result, unmount } = renderHook(() => useAgentTaskPolling('ds-1', onComplete));
    hookUnmount = unmount;

    act(() => {
      result.current.startPolling('task-1');
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(onComplete).toHaveBeenCalledWith('FAILED', expect.anything());
    expect(result.current.isPolling).toBe(false);
    expect(storage.showAgentFailureToast).toHaveBeenCalled();
  });

  test('times out after MAX_POLLS (60 polls = 5 min)', async () => {
    const onComplete = jest.fn();
    mockDispatch.mockResolvedValue({ response: { state: 'RUNNING' } });

    const { result, unmount } = renderHook(() => useAgentTaskPolling('ds-1', onComplete));
    hookUnmount = unmount;

    act(() => {
      result.current.startPolling('task-1');
    });

    for (let i = 0; i < 61; i++) {
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
    }

    expect(onComplete).toHaveBeenCalledWith('TIMEOUT');
    expect(result.current.isPolling).toBe(false);
    expect(storage.getAgentTask()!.finalState).toBe('TIMEOUT');
  });

  test('stops after MAX_CONSECUTIVE_ERRORS (3) dispatch failures', async () => {
    const onComplete = jest.fn();
    mockDispatch.mockRejectedValue(new Error('network error'));

    const { result, unmount } = renderHook(() => useAgentTaskPolling('ds-1', onComplete));
    hookUnmount = unmount;

    act(() => {
      result.current.startPolling('task-1');
    });

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
    }

    expect(onComplete).toHaveBeenCalledWith('FAILED');
    expect(result.current.isPolling).toBe(false);
  });

  test('does not poll when task already has finalState', async () => {
    const onComplete = jest.fn();
    storage.saveAgentTask('task-old', 'ds-1');
    storage.updateAgentTaskState('COMPLETED');

    mockDispatch.mockResolvedValue({ response: { state: 'RUNNING' } });

    const { result, unmount } = renderHook(() => useAgentTaskPolling('ds-1', onComplete));
    hookUnmount = unmount;

    expect(result.current.isPolling).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('resumes polling on mount when active task exists in sessionStorage', async () => {
    const onComplete = jest.fn();
    storage.saveAgentTask('task-active', 'ds-1');

    mockDispatch.mockResolvedValue({ response: { state: 'COMPLETED', response: {} } });

    const { result, unmount } = renderHook(() => useAgentTaskPolling('ds-1', onComplete));
    hookUnmount = unmount;

    expect(result.current.isPolling).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(onComplete).toHaveBeenCalledWith('COMPLETED', expect.anything());
  });
});
