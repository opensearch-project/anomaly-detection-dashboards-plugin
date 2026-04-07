/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { MockStore } from 'redux-mock-store';
import httpMockedClient from '../../../../test/mocks/httpClientMock';
import { ML_COMMONS_NODE_API } from '../../../../utils/constants';
import { mockedStore } from '../../utils/testUtils';
import reducer, {
  executeAutoCreateAgent,
  getMLTaskStatus,
  initialMLState,
} from '../ml';

describe('ml reducer actions', () => {
  let store: MockStore;
  beforeEach(() => {
    store = mockedStore();
  });

  describe('executeAutoCreateAgent', () => {
    test('should invoke [REQUEST, SUCCESS] and extract task_id', async () => {
      httpMockedClient.post = jest.fn().mockResolvedValue({
        ok: true,
        response: { task_id: 'task-abc' },
      });
      await store.dispatch(executeAutoCreateAgent(['index-1'], 'agent-1', ''));
      const actions = store.getActions();
      expect(actions[0].type).toBe('ml/EXECUTE_ML_AGENT_REQUEST');
      expect(reducer(initialMLState, actions[0])).toEqual({
        ...initialMLState,
        requesting: true,
        taskId: '',
        taskState: '',
        taskError: '',
      });
      expect(actions[1].type).toBe('ml/EXECUTE_ML_AGENT_SUCCESS');
      expect(reducer(initialMLState, actions[1]).taskId).toBe('task-abc');
      expect(reducer(initialMLState, actions[1]).requesting).toBe(false);
    });

    test('should invoke [REQUEST, FAILURE]', async () => {
      httpMockedClient.post = jest.fn().mockRejectedValue('Agent not found');
      try {
        await store.dispatch(executeAutoCreateAgent(['index-1'], 'bad-agent', ''));
      } catch {
        const actions = store.getActions();
        expect(actions[1].type).toBe('ml/EXECUTE_ML_AGENT_FAILURE');
        expect(reducer(initialMLState, actions[1]).errorMessage).toBe('Agent not found');
      }
    });

    test('builds correct URL without dataSourceId', async () => {
      httpMockedClient.post = jest.fn().mockResolvedValue({ ok: true, response: {} });
      await store.dispatch(executeAutoCreateAgent(['idx'], 'agent-1', ''));
      expect(httpMockedClient.post).toHaveBeenCalledWith(
        `${ML_COMMONS_NODE_API.AGENT_EXECUTE}/agent-1/execute`,
        expect.objectContaining({
          body: JSON.stringify({ indices: ['idx'] }),
          query: { async: 'true' },
        })
      );
    });

    test('appends dataSourceId to URL when provided', async () => {
      httpMockedClient.post = jest.fn().mockResolvedValue({ ok: true, response: {} });
      await store.dispatch(executeAutoCreateAgent(['idx'], 'agent-1', 'ds-99'));
      expect(httpMockedClient.post).toHaveBeenCalledWith(
        `${ML_COMMONS_NODE_API.AGENT_EXECUTE}/agent-1/execute/ds-99`,
        expect.anything()
      );
    });

    test('extracts task_id from nested response', async () => {
      httpMockedClient.post = jest.fn().mockResolvedValue({
        ok: true,
        response: { task_id: 'nested-id' },
      });
      await store.dispatch(executeAutoCreateAgent(['idx'], 'agent-1', ''));
      const actions = store.getActions();
      const state = reducer(initialMLState, actions[1]);
      expect(state.taskId).toBe('nested-id');
    });
  });

  describe('getMLTaskStatus', () => {
    test('should invoke [REQUEST, SUCCESS] and set taskState', async () => {
      httpMockedClient.get = jest.fn().mockResolvedValue({
        ok: true,
        response: { state: 'COMPLETED', error: '' },
      });
      await store.dispatch(getMLTaskStatus('task-1', ''));
      const actions = store.getActions();
      expect(actions[0].type).toBe('ml/GET_ML_TASK_REQUEST');
      // REQUEST should not mutate state
      expect(reducer(initialMLState, actions[0])).toEqual(initialMLState);
      expect(actions[1].type).toBe('ml/GET_ML_TASK_SUCCESS');
      const state = reducer(initialMLState, actions[1]);
      expect(state.taskState).toBe('COMPLETED');
      expect(state.taskError).toBe('');
    });

    test('sets taskState to FAILED on network error', async () => {
      httpMockedClient.get = jest.fn().mockRejectedValue('Network error');
      try {
        await store.dispatch(getMLTaskStatus('task-1', ''));
      } catch {
        const actions = store.getActions();
        expect(actions[1].type).toBe('ml/GET_ML_TASK_FAILURE');
        const state = reducer(initialMLState, actions[1]);
        expect(state.taskState).toBe('FAILED');
        expect(state.taskError).toBeTruthy();
      }
    });

    test('builds correct URL with dataSourceId', async () => {
      httpMockedClient.get = jest.fn().mockResolvedValue({ ok: true, response: { state: 'RUNNING' } });
      await store.dispatch(getMLTaskStatus('task-1', 'ds-5'));
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `${ML_COMMONS_NODE_API.TASK_STATUS}/task-1/ds-5`
      );
    });

    test('builds correct URL without dataSourceId', async () => {
      httpMockedClient.get = jest.fn().mockResolvedValue({ ok: true, response: { state: 'RUNNING' } });
      await store.dispatch(getMLTaskStatus('task-1', ''));
      expect(httpMockedClient.get).toHaveBeenCalledWith(
        `${ML_COMMONS_NODE_API.TASK_STATUS}/task-1`
      );
    });

    test('preserves existing taskId when polling', async () => {
      const stateWithTask = { ...initialMLState, taskId: 'existing-task' };
      httpMockedClient.get = jest.fn().mockResolvedValue({
        ok: true,
        response: { state: 'RUNNING' },
      });
      await store.dispatch(getMLTaskStatus('task-1', ''));
      const actions = store.getActions();
      const newState = reducer(stateWithTask, actions[1]);
      expect(newState.taskId).toBe('existing-task');
      expect(newState.taskState).toBe('RUNNING');
    });
  });
});
