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

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

// System under test
import { ForecastersList } from '../List';
import {
  startForecaster,
  stopForecaster,
  deleteForecaster,
  getForecasterList
} from '../../../../../redux/reducers/forecast';

// Re-export server constants
// Acts as a safeguard to make sure the constants are available to the component
// being tested and all of its dependencies.
export * from '../../../../../../server/utils/constants';
import { FORECASTER_STATE } from '../../../../../../server/utils/constants';


// ----- Module mocks -------------------------------------------------------

// 1. EUI components with essential props preserved
jest.mock('@elastic/eui', () => {
  const Original = jest.requireActual('@elastic/eui');
  return {
    ...Original,
    EuiDataGrid: ({ 
      ['data-test-subj']: testSubj, 
      columns, 
      rowCount, 
      renderCellValue,
      trailingControlColumns,
      pagination,
      onChangePage,
      onChangeItemsPerPage,
      sorting,
      onSort,
      columnVisibility,
      ...props 
    }: any) => (
      <div data-test-subj={testSubj}>
        <div data-test-subj="gridRowCount">{rowCount}</div>
        <div data-test-subj="gridColumns">{columns?.length || 0}</div>
        {pagination && (
          <div data-test-subj="gridPagination">
            <button onClick={() => onChangePage?.(1)}>Next Page</button>
            <button onClick={() => onChangeItemsPerPage?.(25)}>Change Page Size</button>
          </div>
        )}
        {sorting && (
          <button onClick={() => onSort?.([{ id: 'name', direction: 'asc' }])}>Sort</button>
        )}
        {trailingControlColumns && (
          <div data-test-subj="trailingColumns">
            {Array.from({ length: rowCount }).map((_, rowIndex) =>
              trailingControlColumns.map((col: any, colIndex: number) => (
                <div key={`${rowIndex}-${colIndex}`}>
                  {col.rowCellRender && col.rowCellRender({ rowIndex })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    ),
    EuiSmallButton: ({ children, onClick, href, ...props }: any) => (
      <button onClick={onClick} data-href={href} {...props}>
        {children}
      </button>
    ),
    EuiSmallButtonIcon: ({ onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>Icon</button>
    ),
    EuiLoadingSpinner: () => <div data-test-subj="loadingSpinner" />,
    EuiPage: ({ children }: any) => <div data-test-subj="page">{children}</div>,
    EuiPageBody: ({ children }: any) => <div data-test-subj="pageBody">{children}</div>,
    EuiSpacer: () => <div data-test-subj="spacer" />,
    EuiScreenReaderOnly: ({ children }: any) => <div>{children}</div>,
  };
});

// 2. Core services context
import { CoreServicesContext } from '../../../../../components/CoreServices/CoreServices';

const coreMock = {
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
    },
  },
  chrome: { 
    setBreadcrumbs: jest.fn() 
  },
};

// 3. Child components
jest.mock('../../../components/ListFilters/ListFilters', () => ({
  ListFilters: ({ 
    onSearchForecasterChange, 
    onForecasterStateChange, 
    onIndexChange,
    onSearchIndexChange,
    search,
    selectedForecasterStates,
    selectedIndices 
  }: any) => (
    <div data-test-subj="listFilters">
    <input
        data-test-subj="searchInput"
      placeholder="Search forecasters"
        value={search}
      onChange={onSearchForecasterChange}
    />
      <select
        data-test-subj="stateFilter"
        multiple
        onChange={(e) => onForecasterStateChange(Array.from(e.target.selectedOptions, option => ({ label: option.value })))}
      >
        <option value="Running">Running</option>
        <option value="Inactive">Inactive</option>
      </select>
      <select
        data-test-subj="indexFilter"
        multiple
        onChange={(e) => onIndexChange(Array.from(e.target.selectedOptions, option => ({ label: option.value })))}
      >
        <option value="index1">index1</option>
        <option value="index2">index2</option>
      </select>
      <input
        data-test-subj="indexSearchInput"
        placeholder="Search indices"
        onChange={(e) => onSearchIndexChange(e.target.value)}
      />
    </div>
  ),
}));

jest.mock('../../../components/EmptyMessage/EmptyMessage', () => ({
  EmptyForecasterMessage: ({ isFilterApplied, onResetFilters }: any) => (
    <div data-test-subj="emptyMessage">
      {isFilterApplied ? 'No forecasters match current filters.' : 'No forecasters yet.'}
      {isFilterApplied && (
        <button data-test-subj="resetFiltersButton" onClick={onResetFilters}>
          Reset filters
        </button>
      )}
    </div>
  ),
}));

jest.mock('../../ConfirmActionModals/ConfirmStartForecastersModal', () => ({
  ConfirmStartForecastersModal: ({ onHide, onConfirm, onStartForecaster, forecasters }: any) => (
    <div data-test-subj="confirmStartModal">
      <button data-test-subj="startModalConfirm" onClick={onConfirm}>Confirm Start</button>
      <button data-test-subj="startModalCancel" onClick={onHide}>Cancel</button>
      <button 
        data-test-subj="startForecasterAction" 
        onClick={() => onStartForecaster(forecasters[0]?.id, forecasters[0]?.name)}
      >
        Start Forecaster
      </button>
    </div>
  ),
}));

jest.mock('../../ConfirmActionModals/ConfirmStopForecastersModal', () => ({
  ConfirmStopForecastersModal: ({ onHide, onConfirm, onStopForecaster, forecasters }: any) => (
    <div data-test-subj="confirmStopModal">
      <button data-test-subj="stopModalConfirm" onClick={onConfirm}>Confirm Stop</button>
      <button data-test-subj="stopModalCancel" onClick={onHide}>Cancel</button>
      <button 
        data-test-subj="stopForecasterAction" 
        onClick={() => onStopForecaster(forecasters[0]?.id, forecasters[0]?.name)}
      >
        Stop Forecaster
      </button>
    </div>
  ),
}));

jest.mock('../../ConfirmActionModals/ConfirmDeleteForecastersModal', () => ({
  ConfirmDeleteForecastersModal: ({ onHide, onConfirm, onDeleteForecasters, forecasterId, forecasterName }: any) => (
    <div data-test-subj="confirmDeleteModal">
      <button data-test-subj="deleteModalConfirm" onClick={onConfirm}>Confirm Delete</button>
      <button data-test-subj="deleteModalCancel" onClick={onHide}>Cancel</button>
      <button 
        data-test-subj="deleteForecasterAction" 
        onClick={() => onDeleteForecasters(forecasterId, forecasterName)}
      >
        Delete Forecaster
      </button>
    </div>
  ),
}));

jest.mock('../../ConfirmActionModals/ForecasterActionsCell', () => ({
  ForecasterActionsCell: ({ 
    rowIndex, 
    forecastersToDisplay, 
    setConfirmModalState,
    selectedDataSourceId 
  }: any) => {
    const forecaster = forecastersToDisplay[rowIndex];
    if (!forecaster) return null;
    
    return (
      <div data-test-subj={`actionsCell-${rowIndex}`}>
        <button 
          data-test-subj={`startButton-${rowIndex}`}
          onClick={() => setConfirmModalState({
            isOpen: true,
            action: 'START',
            affectedForecasters: [forecaster],
            isListLoading: false,
            isRequestingToClose: false
          })}
        >
          Start
        </button>
        <button 
          data-test-subj={`stopButton-${rowIndex}`}
          onClick={() => setConfirmModalState({
            isOpen: true,
            action: 'STOP',
            affectedForecasters: [forecaster],
            isListLoading: false,
            isRequestingToClose: false
          })}
        >
          Stop
        </button>
        <button 
          data-test-subj={`deleteButton-${rowIndex}`}
          onClick={() => setConfirmModalState({
            isOpen: true,
            action: 'DELETE',
            affectedForecasters: [forecaster],
            isListLoading: false,
            isRequestingToClose: false
          })}
        >
          Delete
        </button>
      </div>
    );
  },
}));

jest.mock('../../../../../components/ContentPanel/ContentPanel', () => {
  return ({ children, title, actions, titleDataTestSubj, subTitle }: any) => (
    <div data-test-subj="contentPanel">
      <div data-test-subj={titleDataTestSubj}>
        {title}
      </div>
      <div data-test-subj="contentPanelSubTitle">{subTitle}</div>
      <div data-test-subj="contentPanelActions">
        {actions?.map((action: any, idx: number) => (
          <div key={idx}>{action}</div>
        ))}
      </div>
      <div data-test-subj="contentPanelBody">{children}</div>
    </div>
  );
});

// Services
jest.mock('../../../../../services', () => ({
  getDataSourceEnabled: jest.fn(() => ({ enabled: false })),
  getDataSourceManagementPlugin: jest.fn(() => null),
  getNotifications: jest.fn(() => ({ toasts: { addDanger: jest.fn() } })),
  getSavedObjectsClient: jest.fn(() => ({})),
  getUISettings: jest.fn(() => ({ get: jest.fn(() => false) })),
  getNavigationUI: jest.fn(() => ({ HeaderControl: () => null })),
  getApplication: jest.fn(() => ({ setAppRightControls: jest.fn() })),
}));

// Action creators
// We define the mock directly inside jest.mock() to avoid a common hoisting issue.
// Jest's engine automatically hoists all jest.mock() calls to the top of the module,
// ensuring that mocks are in place before any `import` statements are resolved.
//
// If we were to define the mock implementation in a separate `const` variable,
// the hoisted jest.mock() call would execute before the variable declaration.
// This would cause the variable to be in a "Temporal Dead Zone" (uninitialized)
// when the mock is being created, leading to a ReferenceError and a failed mock setup.
// Later, when the component code attempts to use the mocked functions (e.g., getForecasterList),
// it would result in a TypeError because the mock is undefined.
//
// By defining the mock object inside the factory function `() => ({...})`, we create a
// self-contained mock that doesn't rely on any external variables, thus sidestepping
// the entire hoisting problem.
jest.mock('../../../../../redux/reducers/forecast', () => ({
  getForecasterList: jest.fn((params: any) => ({ type: 'forecast/getForecasterList', payload: params })),
  startForecaster: jest.fn((id: string, dataSourceId?: string) => () => Promise.resolve()),
  stopForecaster: jest.fn((id: string, dataSourceId?: string) => () => Promise.resolve()),
  deleteForecaster: jest.fn((id: string, dataSourceId?: string) => () => Promise.resolve()),
}));

jest.mock('../../../../../redux/reducers/opensearch', () => ({
  getIndices: jest.fn(() => ({ type: 'opensearch/getIndices' })),
  getAliases: jest.fn(() => ({ type: 'opensearch/getAliases' })),
  getIndicesAndAliases: jest.fn(() => ({ type: 'opensearch/getIndicesAndAliases' })),
  getPrioritizedIndices: jest.fn(() => ({ type: 'opensearch/getPrioritizedIndices' })),
  getClustersInfo: jest.fn(() => ({ type: 'opensearch/getClustersInfo' })),
}));

jest.mock('../../../../../redux/reducers/alerting', () => ({
  searchMonitors: jest.fn(() => ({ type: 'alerting/searchMonitors' })),
}));

// 6. Utils and helpers
jest.mock('../../../../utils/helpers', () => ({
  constructHrefWithDataSourceId: jest.fn((path: string) => path),
  filterAndSortForecasters: jest.fn((forecasters, searchText, indices, states) => {
    if (!forecasters) return [];
    let filtered = [...forecasters];
    if (searchText) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(searchText.toLowerCase()));
    }
    if (states && states.length > 0) {
      filtered = filtered.filter(f => states.includes(f.curState));
    }
    return filtered;
  }),
  getAllForecastersQueryParamsWithDataSourceId: jest.fn(() => ({})),
  getDataSourceFromURL: jest.fn(() => undefined),
  getVisibleOptions: jest.fn(() => []),
  isDataSourceCompatible: jest.fn(() => true),
  sanitizeSearchText: jest.fn((text: string) => text),
}));

jest.mock('../../../utils/helpers', () => ({
  getURLQueryParams: jest.fn(() => ({})),
}));

jest.mock('../../../utils/tableUtils', () => ({
  renderCellValueFactory: jest.fn(() => () => 'Cell Value'),
  getDataGridColumns: jest.fn(() => [
    { id: 'name', displayAsText: 'Name' },
    { id: 'state', displayAsText: 'State' },
    { id: 'lastUpdateTime', displayAsText: 'Last Updated' },
  ]),
}));

jest.mock('../../../../../utils/utils', () => ({
  getTitleWithCount: jest.fn((title: string, count: number | string) => `${title} (${count})`),
}));

// 7. Constants
jest.mock('../../../../../utils/constants', () => ({
  APP_PATH: { CREATE_FORECASTER: '/create' },
  FORECASTING_FEATURE_NAME: 'forecasting',
  MDS_BREADCRUMBS: { FORECASTING: jest.fn() },
  USE_NEW_HOME_PAGE: 'useNewHomePage',
  BREADCRUMBS: { FORECASTING: { text: 'Forecasting' } },
}));

jest.mock('../../../../utils/constants', () => ({
  MAX_SELECTED_INDICES: 10,
  EMPTY_FORECASTER_STATES: [],
  ALL_INDICES: [],
  SINGLE_FORECASTER_NOT_FOUND_MSG: 'Forecaster not found',
}));

jest.mock('../../../utils/constants', () => ({
  FORECASTER_ACTION: {
    START: 'START',
    STOP: 'STOP',
    DELETE: 'DELETE',
  },
}));

// ----- Test Helpers --------------------------------------------------------

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

const defaultState = {
    forecast: {
      forecasterList: {},
      requesting: false,
      errorMessage: '',
    },
    opensearch: {
    indices: [
      { index: 'index1', health: 'green' },
      { index: 'index2', health: 'yellow' },
    ],
      aliases: [],
    clusters: [
      { name: 'local', localCluster: true },
    ],
  },
};

function renderWithProviders(
  ui: React.ReactElement, 
  { preloadedState = {}, route = '/' } = {}
) {
  const store = mockStore({
    ...defaultState,
    ...preloadedState,
  });

  const history = createMemoryHistory();
  history.push(route);

  const utils = render(
    <CoreServicesContext.Provider value={coreMock as any}>
      <Provider store={store}>
        <Router history={history}>{ui}</Router>
      </Provider>
    </CoreServicesContext.Provider>
  );

  return { ...utils, store, history };
}

const sampleForecasters = {
  forecaster1: {
    id: 'forecaster1',
    name: 'CPU Utilization Forecaster',
    curState: FORECASTER_STATE.RUNNING,
    indices: ['index1'],
    lastUpdateTime: Date.now(),
  },
  forecaster2: {
    id: 'forecaster2',
    name: 'Memory Usage Predictor',
    curState: FORECASTER_STATE.INACTIVE_STOPPED,
    indices: ['index2'],
    lastUpdateTime: Date.now(),
  },
  forecaster3: {
    id: 'forecaster3',
    name: 'Disk Space Monitor',
    curState: FORECASTER_STATE.INIT_ERROR,
    indices: ['index1', 'index2'],
    lastUpdateTime: Date.now(),
  },
};

// ----- Tests ---------------------------------------------------------------

describe('<ForecastersList />', () => {
  beforeEach(() => {
    // Clear all mock implementations and calls before each test.
    // This is sufficient to reset state between tests while preserving
    // the mock implementations defined in `jest.mock`.
    jest.clearAllMocks();
  });

  describe('Loading and Empty States', () => {
    it('renders loading spinner when data is being fetched', () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: {}, requesting: true, errorMessage: '' },
        },
      });

    expect(screen.getByTestId('loadingSpinner')).toBeInTheDocument();
  });

    it('shows empty message when no forecasters exist', async () => {
    renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />);

    expect(await screen.findByTestId('emptyMessage')).toHaveTextContent('No forecasters yet.');
  });

    it('shows filtered empty message when filters are applied', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      // Apply search filter
      const searchInput = screen.getByTestId('searchInput');
      fireEvent.change(searchInput, { target: { value: 'NonExistentForecaster' } });
      
      expect(await screen.findByTestId('emptyMessage')).toHaveTextContent('No forecasters match current filters.');
      expect(screen.getByTestId('resetFiltersButton')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('renders correct forecaster count in header', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const header = await screen.findByTestId('forecasterListHeader');
      expect(header).toHaveTextContent('Forecasters (3)');
    });

    it('renders data grid with correct structure', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      expect(await screen.findByTestId('forecasterListTable')).toBeInTheDocument();
      expect(screen.getByTestId('gridRowCount')).toHaveTextContent('3');
      expect(screen.getByTestId('gridColumns')).toHaveTextContent('3');
    });

    it('renders action buttons for each forecaster', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      expect(await screen.findByTestId('trailingColumns')).toBeInTheDocument();
      expect(screen.getByTestId('startButton-0')).toBeInTheDocument();
      expect(screen.getByTestId('stopButton-1')).toBeInTheDocument();
      expect(screen.getByTestId('deleteButton-2')).toBeInTheDocument();
    });
  });

  describe('Filtering Functionality', () => {
    it('filters forecasters by search text', async () => {
    renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
      preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const searchInput = await screen.findByTestId('searchInput');
      fireEvent.change(searchInput, { target: { value: 'CPU' } });

      await waitFor(() => {
        const header = screen.getByTestId('forecasterListHeader');
        expect(header).toHaveTextContent('Forecasters (1)');
      });
    });

    it('filters forecasters by state', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

    const header = await screen.findByTestId('forecasterListHeader');
      expect(header).toHaveTextContent('Forecasters (3)');

      const stateFilter = (await screen.findByTestId(
        'stateFilter'
      )) as HTMLSelectElement;

      // For multi-select elements, directly passing a value to fireEvent.change
      // is unreliable in jsdom. Instead, we manually set the .selected property
      // on the desired <option> and then dispatch a 'change' event on the
      // parent <select>. This more closely mimics real browser behavior.
      const optionToSelect = within(stateFilter).getByText(
        'Running'
      ) as HTMLOptionElement;
      optionToSelect.selected = true;
      fireEvent.change(stateFilter);

      await waitFor(() => {
        expect(header).toHaveTextContent('Forecasters (1)');
      });
    });

    it('resets filters when reset button is clicked', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      // Apply search filter first
      const searchInput = await screen.findByTestId('searchInput');
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      const resetButton = await screen.findByTestId('resetFiltersButton');
      fireEvent.click(resetButton);

      await waitFor(() => {
        const header = screen.getByTestId('forecasterListHeader');
        expect(header).toHaveTextContent('Forecasters (3)');
      });
    });
  });

  describe('Forecaster Actions', () => {
    it('opens start confirmation modal when start button is clicked', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const startButton = await screen.findByTestId('startButton-0');
      fireEvent.click(startButton);

      expect(await screen.findByTestId('confirmStartModal')).toBeInTheDocument();
    });

    it('opens stop confirmation modal when stop button is clicked', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const stopButton = await screen.findByTestId('stopButton-0');
      fireEvent.click(stopButton);

      expect(await screen.findByTestId('confirmStopModal')).toBeInTheDocument();
    });

    it('opens delete confirmation modal when delete button is clicked', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const deleteButton = await screen.findByTestId('deleteButton-0');
      fireEvent.click(deleteButton);

      expect(await screen.findByTestId('confirmDeleteModal')).toBeInTheDocument();
    });

    it('calls start forecaster action when confirmed', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const startButton = await screen.findByTestId('startButton-0');
      fireEvent.click(startButton);
      
      const startAction = await screen.findByTestId('startForecasterAction');
      fireEvent.click(startAction);

      expect(startForecaster).toHaveBeenCalledWith('forecaster1', undefined);
    });

    it('shows success toast when forecaster action succeeds', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const startButton = await screen.findByTestId('startButton-0');
      fireEvent.click(startButton);
      
      const startAction = await screen.findByTestId('startForecasterAction');
      fireEvent.click(startAction);

      await waitFor(() => {
        expect(coreMock.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          'Successfully started CPU Utilization Forecaster'
        );
      });
    });
  });

  describe('Pagination and Sorting', () => {
    it('handles pagination changes', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const pagination = await screen.findByTestId('gridPagination');
      expect(pagination).toBeInTheDocument();

      // Test page navigation
      fireEvent.click(screen.getByText('Next Page'));
      fireEvent.click(screen.getByText('Change Page Size'));

      // Pagination changes are handled by the component's internal state
      expect(screen.getByTestId('gridPagination')).toBeInTheDocument();
    });

    it('handles sorting changes', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const sortButton = await screen.findByText('Sort');
      fireEvent.click(sortButton);

      // Sorting is handled by the component's internal state
      expect(screen.getByTestId('forecasterListTable')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('dispatches getForecasterList when refresh is clicked', async () => {
      const { store } = renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />);

      const initialCallCount = store.getActions().filter(a => a.type === 'forecast/getForecasterList').length;

      const refreshButton = await screen.findByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        const newCallCount = store.getActions().filter(a => a.type === 'forecast/getForecasterList').length;
        expect(newCallCount).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error toast when forecaster list fetch fails', async () => {
    renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
      preloadedState: {
          forecast: {
            forecasterList: {},
            requesting: false,
            errorMessage: 'Failed to fetch forecasters',
          },
        },
      });

      await waitFor(() => {
        expect(coreMock.notifications.toasts.addDanger).toHaveBeenCalledWith(
          'Unable to get all forecasters'
        );
      });
    });

    it('handles forecaster action errors gracefully', async () => {
      // To test the component's `try...catch` block around an asynchronous
      // action, we must correctly simulate how `redux-thunk` works.
      //
      // 1. The component code calls `await dispatch(startForecaster(...))`.
      // 2. `redux-thunk` middleware intercepts this. If the dispatched item
      //    is a function (a "thunk"), it executes it and returns the
      //    result (in this case, a Promise).
      // 3. The `await` in the component waits for this Promise to resolve or reject.
      //
      // Therefore, our mock for `startForecaster` must be an action creator
      // that returns a thunk function. This thunk function, when executed
      // by the middleware, will then return a rejected Promise, correctly
      // simulating a failed API call and allowing the component's `catch`
      // block to execute.
      const rejectingThunk = () => Promise.reject(new Error('Action failed'));
      (startForecaster as jest.Mock).mockReturnValueOnce(rejectingThunk);

      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      const startButton = await screen.findByTestId('startButton-0');
      fireEvent.click(startButton);
      
      const startAction = await screen.findByTestId('startForecasterAction');
      fireEvent.click(startAction);

    await waitFor(() => {
        expect(coreMock.notifications.toasts.addDanger).toHaveBeenCalledWith(
          expect.stringContaining('Error starting forecaster')
        );
      });
    });
  });

  describe('Component Integration', () => {
    it('renders create forecaster button', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />);

      const createButton = await screen.findByText('Create forecaster');
      expect(createButton).toBeInTheDocument();
      expect(createButton.getAttribute('data-href')).toContain('/create');
    });

    it('sets correct breadcrumbs on mount', () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />);

      expect(coreMock.chrome.setBreadcrumbs).toHaveBeenCalled();
    });

    it('dispatches initial actions on mount', () => {
    const { store } = renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />);

      const actions = store.getActions().map(a => a.type);
      expect(actions).toContain('forecast/getForecasterList');
      expect(actions).toContain('opensearch/getIndices');
      expect(actions).toContain('opensearch/getAliases');
      expect(actions).toContain('opensearch/getClustersInfo');
    });
  });

  describe('Modal Interactions', () => {
    it('closes modal when cancel is clicked', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      // Open modal
      const startButton = await screen.findByTestId('startButton-0');
      fireEvent.click(startButton);

      // Close modal
      const cancelButton = await screen.findByTestId('startModalCancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('confirmStartModal')).not.toBeInTheDocument();
      });
    });

    it('closes modal when confirmation is completed', async () => {
      renderWithProviders(<ForecastersList setActionMenu={jest.fn()} />, {
        preloadedState: {
          forecast: { forecasterList: sampleForecasters, requesting: false, errorMessage: '' },
        },
      });

      // Open modal
      const startButton = await screen.findByTestId('startButton-0');
      fireEvent.click(startButton);
      
      // Confirm action
      const confirmButton = await screen.findByTestId('startModalConfirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByTestId('confirmStartModal')).not.toBeInTheDocument();
      });
    });
  });
});
