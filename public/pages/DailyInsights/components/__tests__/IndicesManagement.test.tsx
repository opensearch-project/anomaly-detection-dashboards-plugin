/*
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  MemoryRouter as Router,
  Route,
  RouteComponentProps,
} from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { IndicesManagement } from '../IndicesManagement';

const mockDispatch = jest.fn();
const mockSetBreadcrumbs = jest.fn();
const mockChangeDocTitle = jest.fn();
const mockHttpGet = jest.fn();
const mockNavigateToApp = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddDanger = jest.fn();
const mockAddWarning = jest.fn();
const mockStartPolling = jest.fn();
const mockSetActionMenu = jest.fn();
const mockDataSourceMenu = jest.fn(({ componentConfig }) => (
  <button
    type="button"
    onClick={() => componentConfig.onSelectedDataSources([{ id: 'ds-next' }])}
  >
    Select data source
  </button>
));
const mockGetDetectorList = jest.fn((params) => ({
  type: 'ad/GET_DETECTOR_LIST',
  params,
}));
const mockExecuteAutoCreateAgent = jest.fn(
  (indices, agentId, dataSourceId) => ({
    type: 'ml/EXECUTE_ML_AGENT',
    indices,
    agentId,
    dataSourceId,
  })
);

let mockAdState: any;
let mockDataSourceEnabled = false;
let mockAgentTask: any = null;
let mockIsPolling = false;

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../services', () => ({
  getDataSourceEnabled: () => ({ enabled: mockDataSourceEnabled }),
  getApplication: () => ({ navigateToApp: mockNavigateToApp }),
  getNotifications: () => ({
    toasts: {
      addSuccess: mockAddSuccess,
      addDanger: mockAddDanger,
      addWarning: mockAddWarning,
    },
  }),
  getDataSourceManagementPlugin: () => ({
    ui: {
      getDataSourceMenu: () => mockDataSourceMenu,
    },
  }),
  getSavedObjectsClient: () => ({ id: 'saved-objects-client' }),
}));

jest.mock('../../../../redux/reducers/ad', () => ({
  getDetectorList: (...args: any[]) => mockGetDetectorList(...args),
}));

jest.mock('../../../../redux/reducers/ml', () => ({
  executeAutoCreateAgent: (...args: any[]) =>
    mockExecuteAutoCreateAgent(...args),
}));

jest.mock('../../hooks/useAgentTaskPolling', () => ({
  useAgentTaskPolling: () => ({
    isPolling: mockIsPolling,
    startPolling: mockStartPolling,
  }),
}));

jest.mock('../../utils/agentTaskStorage', () => ({
  getAgentTask: () => mockAgentTask,
}));

jest.mock('../EnhancedSelectionModal', () => ({
  EnhancedSelectionModal: (props: any) =>
    props.isVisible ? (
      <div data-test-subj="mockEnhancedSelectionModal">
        <span>{props.modalTitle}</span>
        <span>{props.selectedIndices.join(',')}</span>
        <button
          type="button"
          onClick={() => props.onSelectionChange(['logs-new'])}
        >
          Select logs-new
        </button>
        <button
          type="button"
          onClick={() => props.onConfirm('agent-from-modal')}
        >
          Confirm modal selection
        </button>
        <button type="button" onClick={props.onCancel}>
          Cancel modal
        </button>
      </div>
    ) : null,
}));

const mockCore = {
  http: {
    get: mockHttpGet,
  },
  chrome: {
    setBreadcrumbs: mockSetBreadcrumbs,
    docTitle: {
      change: mockChangeDocTitle,
    },
  },
};

const renderIndicesManagement = (initialEntry = '/indices') =>
  render(
    <Router initialEntries={[initialEntry]}>
      <Route
        path="/indices"
        render={(props: RouteComponentProps) => (
          <CoreServicesContext.Provider value={mockCore as any}>
            <IndicesManagement {...props} setActionMenu={mockSetActionMenu} />
          </CoreServicesContext.Provider>
        )}
      />
    </Router>
  );

const buildDetector = (overrides: any = {}) => ({
  id: 'detector-id',
  name: 'detector-name',
  indices: ['logs-*'],
  curState: 'Running',
  auto_created: true,
  ...overrides,
});

describe('IndicesManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockAdState = {
      detectorList: {},
    };
    mockAgentTask = null;
    mockIsPolling = false;
    mockDataSourceEnabled = false;
    mockHttpGet.mockResolvedValue({ response: { enabled: false } });
    mockDispatch.mockResolvedValue({});
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as jest.Mock).mockImplementation((selector) =>
      selector({ ad: mockAdState })
    );
  });

  test('renders the first-index empty state and navigates to setup', async () => {
    renderIndicesManagement();

    expect(
      await screen.findByText('No indices configured for insights')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Add Your First Index' })
    );

    expect(mockNavigateToApp).toHaveBeenCalledWith(
      'daily_insights_dashboard-overview',
      {
        path: '',
      }
    );
    expect(mockSetBreadcrumbs).toHaveBeenCalled();
    expect(mockChangeDocTitle).toHaveBeenCalledWith('Daily Insights');
  });

  test('renders the active-job empty states and failed-task retry path', async () => {
    mockHttpGet.mockResolvedValue({ response: { enabled: true } });
    mockAgentTask = { finalState: 'FAILED' };

    renderIndicesManagement();

    expect(
      await screen.findByText('Detector creation failed')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('addNewIndicesButton'));

    expect(
      screen.getByTestId('mockEnhancedSelectionModal')
    ).toBeInTheDocument();
  });

  test('groups auto-created detectors by index and expands long detector lists', async () => {
    mockHttpGet.mockResolvedValue({ response: { enabled: true } });
    mockAgentTask = {
      failedIndices: [{ index: 'metrics-*', error: 'permissions denied' }],
    };
    mockAdState = {
      detectorList: {
        one: buildDetector({
          id: 'det-1',
          name: 'CPU detector',
          indices: ['logs-*', 'metrics-*'],
          curState: 'Running',
        }),
        two: buildDetector({
          id: 'det-2',
          name: 'Latency detector',
          indices: ['logs-*'],
          curState: 'Stopped',
          autoCreated: true,
          auto_created: false,
        }),
        three: buildDetector({
          id: 'det-3',
          name: 'Errors detector',
          indices: ['logs-*'],
          curState: 'Initializing',
        }),
        four: buildDetector({
          id: 'det-4',
          name: 'Traffic detector',
          indices: ['logs-*'],
          curState: 'Failed',
        }),
        manual: buildDetector({
          id: 'manual',
          name: 'Manual detector',
          auto_created: false,
          autoCreated: false,
        }),
      },
    };

    renderIndicesManagement();

    expect(await screen.findByText('Configured Indices')).toBeInTheDocument();
    expect(
      screen.getByText('Some detectors failed to create')
    ).toBeInTheDocument();
    expect(screen.getAllByText('metrics-*').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CPU detector').length).toBeGreaterThan(0);
    expect(screen.getByText('Latency detector')).toBeInTheDocument();
    expect(screen.getByText('Errors detector')).toBeInTheDocument();
    expect(screen.queryByText('Traffic detector')).not.toBeInTheDocument();
    expect(screen.queryByText('Manual detector')).not.toBeInTheDocument();
    expect(screen.getByText('1 Running, 1 Stopped')).toBeInTheDocument();

    fireEvent.click(screen.getByText('+1 more detectors'));
    expect(screen.getByText('Traffic detector')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show less'));
    expect(screen.queryByText('Traffic detector')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(mockGetDetectorList).toHaveBeenCalledWith(
      expect.objectContaining({ dataSourceId: '' })
    );
  });

  test('starts auto insights from the add-indices modal', async () => {
    mockHttpGet.mockResolvedValue({ response: { enabled: true } });
    mockDispatch.mockImplementation(async (action: any) => {
      if (action.type === 'ml/EXECUTE_ML_AGENT') {
        return { response: { task_id: 'task-123' } };
      }
      return {};
    });

    renderIndicesManagement();

    fireEvent.click(await screen.findByTestId('addNewIndicesButton'));
    fireEvent.click(screen.getByRole('button', { name: 'Select logs-new' }));

    await waitFor(() => {
      expect(screen.getByText('logs-new')).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm modal selection' })
    );

    await waitFor(() => {
      expect(mockExecuteAutoCreateAgent).toHaveBeenCalledWith(
        ['logs-new'],
        'agent-from-modal',
        ''
      );
      expect(mockStartPolling).toHaveBeenCalledWith('task-123');
      expect(mockAddSuccess).toHaveBeenCalledWith(
        'Started creating anomaly detectors for 1 index'
      );
    });
  });

  test('shows a warning for empty modal selection and an error for agent failures', async () => {
    mockHttpGet.mockResolvedValue({ response: { enabled: true } });

    renderIndicesManagement();

    fireEvent.click(await screen.findByTestId('addNewIndicesButton'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm modal selection' })
    );

    expect(mockAddWarning).toHaveBeenCalledWith(
      'Please select at least one index'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select logs-new' }));
    await waitFor(() => {
      expect(screen.getByText('logs-new')).toBeInTheDocument();
    });

    mockDispatch.mockImplementation(async (action: any) => {
      if (action.type === 'ml/EXECUTE_ML_AGENT') {
        return { error: { message: 'agent unavailable' } };
      }
      return {};
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm modal selection' })
    );

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith(
        'Failed to execute ML agent: agent unavailable'
      );
    });
  });

  test('handles data source selection and updates data-source-specific calls', async () => {
    mockDataSourceEnabled = true;
    mockHttpGet.mockResolvedValue({ response: { enabled: false } });

    renderIndicesManagement('/indices?dataSourceId=ds-1');

    expect(await screen.findByText('Select data source')).toBeInTheDocument();
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      expect.anything(),
      { text: 'Daily Insights' },
    ]);
    expect(mockHttpGet).toHaveBeenCalledWith(
      '/api/anomaly_detectors/insights/_status/ds-1'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Select data source' }));

    await waitFor(() => {
      expect(mockGetDetectorList).toHaveBeenCalledWith(
        expect.objectContaining({ dataSourceId: 'ds-next' })
      );
      expect(mockHttpGet).toHaveBeenCalledWith(
        '/api/anomaly_detectors/insights/_status/ds-next'
      );
    });
  });
});
