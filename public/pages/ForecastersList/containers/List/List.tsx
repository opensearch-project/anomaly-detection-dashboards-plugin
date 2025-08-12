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

import {
  //@ts-ignore
  EuiDataGrid,
  EuiSmallButton,
  EuiComboBoxOptionProps,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiSmallButtonIcon,
  EuiScreenReaderOnly,
  EuiDataGridCellValueElementProps,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { debounce, get } from 'lodash';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import {
  CatIndex,
  GetForecastersQueryParams,
  IndexAlias,
} from '../../../../../server/models/types';
import { ForecasterListItem, MDSStates } from '../../../../models/interfaces';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { AppState } from '../../../../redux/reducers';
import {
  getForecasterList,
  startForecaster,
  stopForecaster,
  deleteForecaster,
} from '../../../../redux/reducers/forecast';
import {
  getAliases,
  getClustersInfo,
  getIndices,
  getIndicesAndAliases,
  getPrioritizedIndices,
} from '../../../../redux/reducers/opensearch';
import { APP_PATH, FORECASTING_FEATURE_NAME, MDS_BREADCRUMBS, USE_NEW_HOME_PAGE } from '../../../../utils/constants';
import { FORECASTER_STATE, FORECASTER_STATE_DISPLAY } from '../../../../../server/utils/constants';
import {
  constructHrefWithDataSourceId,
  filterAndSortForecasters,
  getAllForecastersQueryParamsWithDataSourceId,
  getDataSourceFromURL,
  getVisibleOptions,
  isForecastingDataSourceCompatible,
  sanitizeSearchText,
} from '../../../utils/helpers';
import { ListFilters } from '../../components/ListFilters/ListFilters';
import {
  MAX_SELECTED_INDICES,
  EMPTY_FORECASTER_STATES,
  ALL_INDICES,
  SINGLE_FORECASTER_NOT_FOUND_MSG,
} from '../../../utils/constants';
import { BREADCRUMBS } from '../../../../utils/constants';
import {
  getURLQueryParams,
} from '../../utils/helpers';
import { renderCellValueFactory, getDataGridColumns } from '../../utils/tableUtils';
import { FORECASTER_ACTION } from '../../utils/constants';
import { getTitleWithCount } from '../../../../utils/utils';
import { searchMonitors } from '../../../../redux/reducers/alerting';
import { ConfirmStartForecastersModal } from '../ConfirmActionModals/ConfirmStartForecastersModal';
import { ConfirmStopForecastersModal } from '../ConfirmActionModals/ConfirmStopForecastersModal';
import { ConfirmDeleteForecastersModal } from '../ConfirmActionModals/ConfirmDeleteForecastersModal';
import { ForecasterActionsCell } from '../ConfirmActionModals/ForecasterActionsCell';
import {
  NO_PERMISSIONS_KEY_WORD,
  prettifyErrorMessage,
} from '../../../../../server/utils/helpers';
import { CoreStart, MountPoint } from '../../../../../../../src/core/public';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { DataSourceOption, DataSourceSelectableConfig } from '../../../../../../../src/plugins/data_source_management/public';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
  getUISettings,
  getNavigationUI,
  getApplication,
} from '../../../../services';
import { TopNavControlButtonData } from '../../../../../../../src/plugins/navigation/public';
import queryString from 'querystring';
import { EmptyForecasterMessage } from '../../components/EmptyMessage/EmptyMessage';

export interface ListRouterParams {
  dataSourceId: string;
}
interface ListProps extends RouteComponentProps<ListRouterParams> {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

interface ListState {
  queryParams: GetForecastersQueryParams;
  selectedForecasterStates: FORECASTER_STATE[];
  selectedIndices: string[];
  selectedDataSourceId: string | undefined;
  searchText: string;
}

export interface ConfirmModalState {
  isOpen: boolean;
  action: FORECASTER_ACTION;
  isListLoading: boolean;
  isRequestingToClose: boolean;
  affectedForecasters: ForecasterListItem[];
  actionText?: string;
}

// Mapping from display state back to actual states
const displayStateToActualStates: { [key: string]: FORECASTER_STATE[] } = {
  [FORECASTER_STATE_DISPLAY.INACTIVE_STOPPED]: [ // 'Inactive'
    FORECASTER_STATE.INACTIVE_STOPPED,
    FORECASTER_STATE.INACTIVE_NOT_STARTED,
  ],
  [FORECASTER_STATE_DISPLAY.AWAITING_DATA_TO_INIT]: [ // 'Awaiting data'
    FORECASTER_STATE.AWAITING_DATA_TO_INIT,
    FORECASTER_STATE.AWAITING_DATA_TO_RESTART,
  ],
  [FORECASTER_STATE_DISPLAY.INITIALIZING_TEST]: [ // 'Initializing...'
    FORECASTER_STATE.INIT_TEST,
    FORECASTER_STATE.INITIALIZING_FORECAST,
  ],
  [FORECASTER_STATE_DISPLAY.TEST_COMPLETE]: [ // 'Test complete'
    FORECASTER_STATE.TEST_COMPLETE,
  ],
  [FORECASTER_STATE_DISPLAY.RUNNING]: [ // 'Running'
    FORECASTER_STATE.RUNNING,
  ],
  [FORECASTER_STATE_DISPLAY.INIT_FORECAST_FAILURE]: [ // 'Error'
    FORECASTER_STATE.INIT_ERROR,
    FORECASTER_STATE.FORECAST_FAILURE,
    FORECASTER_STATE.INIT_TEST_FAILED,
  ],
};

export const ForecastersList = (props: ListProps) => {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const allForecasters = useSelector((state: AppState) => state.forecast.forecasterList);
  const errorGettingForecasters = useSelector(
    (state: AppState) => state.forecast.errorMessage
  );
  const opensearchState = useSelector((state: AppState) => state.opensearch);
  const isRequestingFromES = useSelector(
    (state: AppState) => state.forecast.requesting
  );

  const dataSourceEnabled = getDataSourceEnabled().enabled;

  const [forecastersToDisplay, setForecastersToDisplay] = useState(
    [] as ForecasterListItem[]
  );
  const [isLoadingFinalForecasters, setIsLoadingFinalForecasters] =
    useState<boolean>(true);

  const isLoading = isRequestingFromES || isLoadingFinalForecasters;
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>(
    {
      isOpen: false,
      //@ts-ignore
      action: null,
      isListLoading: false,
      isRequestingToClose: false,
      affectedForecasters: [],
      affectedMonitors: {},
      actionText: undefined,
    }
  );

  // Add state for forcing grid re-render
  const [gridKey, setGridKey] = useState(0);

  const [localClusterName, setLocalClusterName] = useState("");

  // at the point of time, the url is either / (landing page) or /forecasters
  // props.location is the current URL the user is visiting within the application.
  // getURLQueryParams parses the props.location.search--query parameters in the URL--
  // and returns an object with the query parameters. For example, if the URL is
  // /forecasters?dataSourceId=xyz, then location.search would be the literal string
  // "?dataSourceId=xyz".
  const queryParams = getURLQueryParams(props.location);
  const [state, setState] = useState<ListState>({
    queryParams,
    selectedForecasterStates: EMPTY_FORECASTER_STATES,
    selectedIndices: ALL_INDICES,
    selectedDataSourceId: queryParams.dataSourceId === undefined
      ? undefined
      : queryParams.dataSourceId,
    searchText: '',
  });

  useEffect(() => {
    const { history, location } = props;
    if (dataSourceEnabled) {
      const updatedParams = {
        dataSourceId: state.selectedDataSourceId,
      };
      history.replace({
        ...location,
        search: queryString.stringify(updatedParams),
      });
    }
    intializeForecasters();
  }, [state.selectedDataSourceId]);

  const intializeForecasters = async () => {
    // wait until selected data source is ready before doing dispatch calls if mds is enabled
      dispatch(
        getForecasterList(
          getAllForecastersQueryParamsWithDataSourceId(
            state.selectedDataSourceId
          )
        )
      );
      dispatch(getIndices('', state.selectedDataSourceId));
      dispatch(getAliases('', state.selectedDataSourceId));
    //}
  };

  // Getting all initial monitors
  useEffect(() => {
    const getInitialClusters = async () => {
      await dispatch(getClustersInfo(state.selectedDataSourceId));
    }
    getInitialClusters();
  }, []);

  useEffect(() => {
    if (opensearchState.clusters && opensearchState.clusters.length > 0) {
      setLocalClusterName(opensearchState.clusters.find(cluster => cluster.localCluster)?.name || "local")
    }
  }, [opensearchState.clusters]);

  useEffect(() => {
    if (
      errorGettingForecasters &&
      !errorGettingForecasters.includes(SINGLE_FORECASTER_NOT_FOUND_MSG)
    ) {
      console.error("errorGettingForecasters", errorGettingForecasters);
      core.notifications.toasts.addDanger(
        typeof errorGettingForecasters === 'string' &&
          errorGettingForecasters.includes(NO_PERMISSIONS_KEY_WORD)
          ? prettifyErrorMessage(errorGettingForecasters)
          : 'Unable to get all forecasters'
      );
      setIsLoadingFinalForecasters(false);
    }
  }, [errorGettingForecasters]);

  // Updating displayed indices (initializing to first 20 for now)
  const visibleIndices = get(opensearchState, 'indices', []) as CatIndex[];
  const visibleAliases = get(opensearchState, 'aliases', []) as IndexAlias[];
  const indexOptions = getVisibleOptions(visibleIndices, visibleAliases, localClusterName);

  // Set breadcrumbs on the top of the page on page load
  useEffect(() => {
    if (dataSourceEnabled) {
      core.chrome.setBreadcrumbs([
        MDS_BREADCRUMBS.FORECASTING(state.selectedDataSourceId),
      ]);
    } else {
      core.chrome.setBreadcrumbs([
        BREADCRUMBS.FORECASTING,
      ]);
    }
  }, [state.selectedDataSourceId]);

  // Getting all initial indices
  const [indexQuery, setIndexQuery] = useState('');
  useEffect(() => {
    const getInitialIndices = async () => {
      await dispatch(getIndicesAndAliases(indexQuery, state.selectedDataSourceId, "*"))
    };
    getInitialIndices();
  }, [state.selectedDataSourceId]);

  // Handle all filtering / sorting of forecasters
  useEffect(() => {
    const curSelectedForecasters = filterAndSortForecasters(
      Object.values(allForecasters),
      state.searchText,
      state.selectedIndices,
      state.selectedForecasterStates
    );

    setForecastersToDisplay(curSelectedForecasters);

    setIsLoadingFinalForecasters(false);
  }, [
    allForecasters,
    state.queryParams,
    state.selectedForecasterStates,
    state.selectedIndices,
    state.selectedDataSourceId,
    state.searchText,
  ]);

  // Update modal state if user decides to close
  useEffect(() => {
    if (confirmModalState.isRequestingToClose) {
      if (isLoading) {
        setConfirmModalState({
          ...confirmModalState,
          isListLoading: true,
        });
      } else {
        setConfirmModalState({
          ...confirmModalState,
          isOpen: false,
          isListLoading: false,
          isRequestingToClose: false,
        });
      }
    }
  }, [confirmModalState.isRequestingToClose, isLoading]);

  const getUpdatedForecasters = async () => {
    // wait until selected data source is ready before doing dispatch calls if mds is enabled
    if (!dataSourceEnabled || (state.selectedDataSourceId && state.selectedDataSourceId !== "")) {
      dispatch(
        getForecasterList(
          getAllForecastersQueryParamsWithDataSourceId(state.selectedDataSourceId)
        )
      );
    }
  };

  // Pagination
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const onChangeItemsPerPage = useCallback(
    (pageSize: number) =>
      setPagination((pagination) => ({
        ...pagination,
        pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex: number) =>
      setPagination((pagination) => ({ ...pagination, pageIndex })),
    [setPagination]
  );

  // Sorting
  const [sortingColumns, setSortingColumns] = useState([]);
  const onSort = useCallback(
    (sortingColumns) => {
      setSortingColumns(sortingColumns);
    },
    [setSortingColumns]
  );

  /*
   * Changing the key prop on the <EuiDataGrid /> will force React to unmount the old grid
   * and mount a new one, effectively triggering a full recalculation of its layout
   * and resolving the scrollbar issue described in the comments.
   */
  const recalculateGridLayout = () => {
    // Force re-render with a new key
    setGridKey(prevKey => prevKey + 1);
  };

  // Refresh data if user is typing in the search bar
  const handleSearchForecasterChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setState({
      ...state,
      searchText: e.target.value,
    });
    
    // Force a re-render of the data grid when clearing search input
    // This addresses a layout calculation issue in EUI DataGrid where:
    // 1. When search filters the results, the grid calculates its height based on filtered items
    // 2. When search is cleared, the grid doesn't automatically recalculate its dimensions
    // 3. This causes unnecessary scrollbars to appear even when there's sufficient space
    // 
    // Example: With only 2 rows of data, if user types "a" to filter and then clears the search,
    // the scrollbar remains visible despite having enough vertical space to display all rows.
    // By forcing a re-render, we ensure the grid properly re-evaluates its layout dimensions.
    recalculateGridLayout();
  };

  // Refresh data if user is typing in the index filter
  const handleSearchIndexChange = debounce(async (searchValue: string) => {
    if (searchValue !== indexQuery) {
      const sanitizedQuery = sanitizeSearchText(searchValue);
      setIndexQuery(sanitizedQuery);
      await dispatch(
        getPrioritizedIndices(sanitizedQuery, state.selectedDataSourceId)
      );
      setState((state) => ({
        ...state,
        page: 0,
      }));
      
      // Add grid recalculation after state update
      recalculateGridLayout();
    }
  }, 300);

  // Refresh data if user is selecting a forecaster state filter
  const handleForecasterStateChange = (
    options: EuiComboBoxOptionProps[]
  ): void => {
    let mappedStates: FORECASTER_STATE[] = [];
    if (options.length === 0) {
      // If no options selected, use all states
      mappedStates = EMPTY_FORECASTER_STATES;
    } else {
      // Map selected display states back to actual FORECASTER_STATE values
      options.forEach((option) => {
        const displayState = option.label;
        const actualStates = displayStateToActualStates[displayState];
        if (actualStates) {
          mappedStates.push(...actualStates);
        }
      });
      // Remove duplicates
      mappedStates = [...new Set(mappedStates)];
    }

    setState((prevState) => ({
      ...prevState,
      page: 0, // Reset pagination
      selectedForecasterStates: mappedStates,
    }));

    // Add grid recalculation after state update
    recalculateGridLayout();
  };

  // Refresh data if user is selecting an index filter
  const handleIndexChange = (options: EuiComboBoxOptionProps[]): void => {
    let indices: string[];
    indices =
      options.length == 0
        ? ALL_INDICES
        : options.map((option) => {
            return option.label;
          }).slice(0, MAX_SELECTED_INDICES);
    
    
    setState((prevState) => {
      const newState = {
        ...prevState,
        selectedIndices: indices,
      };
      return newState;
    });
  };

  const handleDataSourceChange = (dataSources: DataSourceOption[]) => {
    const dataSourceId = dataSources[0].id;

    if (dataSourceEnabled && dataSourceId === undefined) {
      getNotifications().toasts.addDanger(
        prettifyErrorMessage('Unable to set data source.')
      );
    } else {
      setState((prevState) => ({
        ...prevState,
        selectedDataSourceId: dataSourceId,
      }));
    }
  };

  const handleHideModal = () => {
    setConfirmModalState({
      ...confirmModalState,
      isOpen: false,
    });
  };

  const handleConfirmModal = () => {
    setConfirmModalState({
      ...confirmModalState,
      isRequestingToClose: true,
    });
  };

  const getConfirmModal = () => {
    if (confirmModalState.isOpen) {
      //@ts-ignore
      switch (confirmModalState.action) {
        case FORECASTER_ACTION.START: {
          return (
            <ConfirmStartForecastersModal
              forecasters={confirmModalState.affectedForecasters}
              onStartForecaster={(forecasterId: string, forecasterName: string) => handleStartForecasterJob(forecasterId, forecasterName)}
              onHide={handleHideModal}
              onConfirm={handleConfirmModal}
              isListLoading={isLoading}
            />
          );
        }
        case FORECASTER_ACTION.STOP: {
          return (
            <ConfirmStopForecastersModal
              forecasters={confirmModalState.affectedForecasters}
              onStopForecaster={(forecasterId: string, forecasterName: string) => handleStopForecasterJob(forecasterId, forecasterName)}
              onHide={handleHideModal}
              onConfirm={handleConfirmModal}
              isListLoading={isLoading}
            />
          );
        }
        case FORECASTER_ACTION.DELETE: {
          return (
            <ConfirmDeleteForecastersModal
              forecasterId={confirmModalState.affectedForecasters[0].id}
              forecasterName={confirmModalState.affectedForecasters[0].name}
              forecasterState={confirmModalState.affectedForecasters[0].curState}
              onHide={handleHideModal}
              onConfirm={handleConfirmModal}
              onStopForecasters={(forecasterId: string, forecasterName: string) => handleStopForecasterJob(forecasterId, forecasterName)}
              onDeleteForecasters={(forecasterId: string, forecasterName: string) => handleDeleteForecasterJob(forecasterId, forecasterName)}
              isListLoading={isLoading}
            />
          );
        }
        default: {
          return null;
        }
      }
    } else {
      return null;
    }
  };

  const confirmModal = getConfirmModal();

  let renderDataSourceComponent = null;
  // We need to make sure all MDS related features are only turned on only when data source plugin is enabled
  // i.e. data_source.enabled:true.
  if (dataSourceEnabled) {
    const DataSourceMenu =
      getDataSourceManagementPlugin()?.ui.getDataSourceMenu<DataSourceSelectableConfig>();
    renderDataSourceComponent = useMemo(() => {
      return (
        <DataSourceMenu
          setMenuMountPoint={props.setActionMenu}
          componentType={'DataSourceSelectable'} // writeable
          componentConfig={{
            fullWidth: false,
            activeOption: 
              state.selectedDataSourceId === undefined
                ? undefined
                : [{ id: state.selectedDataSourceId }],
            savedObjects: getSavedObjectsClient(),
            notifications: getNotifications(),
            onSelectedDataSources: (dataSources) =>
              handleDataSourceChange(dataSources),
            dataSourceFilter: isForecastingDataSourceCompatible,
          }}
        />
      );
    }, [getSavedObjectsClient(), getNotifications(), props.setActionMenu]);
  }

  const columns = getDataGridColumns();

  const createForecasterUrl = `${FORECASTING_FEATURE_NAME}#` + constructHrefWithDataSourceId(APP_PATH.CREATE_FORECASTER, state.selectedDataSourceId, false);

  const useUpdatedUX = getUISettings().get(USE_NEW_HOME_PAGE);
  const { HeaderControl } = getNavigationUI();
  const { setAppRightControls } = getApplication();

  const renderCreateButton = () => {
    return useUpdatedUX ? (
      <HeaderControl
        setMountPoint={setAppRightControls}
        controls={[
          {
            id: 'Create forecaster',
            label: 'Create forecaster',
            iconType: 'plus',
            fill: true,
            href: createForecasterUrl,
            testId: 'createForecasterButton',
            controlType: 'button',
          } as TopNavControlButtonData,
        ]}
      />
    ) : (
      null
    )
  };

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(
    columns.map(({ id }) => id) // initialize to the full set of columns
  );

  const onColumnResize = useRef((eventData) => {
    console.log(eventData);
  });

  const ForecasterActionsCellMemo = React.memo(ForecasterActionsCell);

  const trailingControlColumns = [
    {
      id: 'actions',
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>Controls</span>
        </EuiScreenReaderOnly>
      ),
      width: 40,
      rowCellRender: useCallback((cellProps) => (
          <ForecasterActionsCellMemo
            rowIndex={cellProps.rowIndex}
            forecastersToDisplay={forecastersToDisplay}
            confirmModalState={confirmModalState}
            setConfirmModalState={setConfirmModalState}
            setIsLoadingFinalForecasters={setIsLoadingFinalForecasters}
            selectedDataSourceId={state.selectedDataSourceId}
            getUpdatedForecasters={getUpdatedForecasters}
            isLoading={isLoading}
          />
        ), [forecastersToDisplay, confirmModalState]),
    }
  ];

const handleStartForecasterJob = async (forecasterId: string, forecasterName: string) => {
    setIsLoadingFinalForecasters(true);
    
    try {
      await dispatch(startForecaster(forecasterId, state.selectedDataSourceId));
      core.notifications.toasts.addSuccess(`Successfully started ${forecasterName}`);
    } catch (error) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(`Error starting forecaster: ${error}`)
      );
    } finally {
      getUpdatedForecasters();
    }
  };

  const handleStopForecasterJob = async (forecasterId: string, forecasterName: string) => {
    setIsLoadingFinalForecasters(true);
    try {
      await dispatch(stopForecaster(forecasterId, state.selectedDataSourceId));
      core.notifications.toasts.addSuccess(`Successfully stopped ${forecasterName}`);
    } catch (error) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(`Error stopping forecaster: ${error}`)
      );
    } finally {
      getUpdatedForecasters();
    };
  };

  const handleDeleteForecasterJob = async (forecasterId: string, forecasterName: string) => {
    setIsLoadingFinalForecasters(true);
    try {
      await dispatch(deleteForecaster(forecasterId, state.selectedDataSourceId));
      core.notifications.toasts.addSuccess(`Successfully deleted ${forecasterName}`);
    } catch (error) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(`Error deleting forecaster: ${error}`)
      );
    } finally {
      getUpdatedForecasters();
    };
  };

  useEffect(() => {
    getUpdatedForecasters();
  }, [dataSourceEnabled, state.selectedDataSourceId, dispatch]);

  useEffect(() => {
    const { history, location } = props;
    if (dataSourceEnabled) {
      const updatedParams = {
        dataSourceId: state.selectedDataSourceId,
      };
      history.replace({
        ...location,
        search: queryString.stringify(updatedParams),
      });
    }
    intializeForecasters();
  }, [state.selectedDataSourceId]);

  // Keep track of which rows are "force collapsed"
  const [forceCollapsedRows, setForceCollapsedRows] = React.useState<Set<number>>(new Set());

  // Callback to add a row index to the collapsed set
  const forceCollapseRow = (rowIndex: number) => {
    setForceCollapsedRows((prev) => new Set([...prev, rowIndex]));
  };

  return (
    <EuiPage>
      <EuiPageBody> 
        {dataSourceEnabled && renderDataSourceComponent}
        {renderCreateButton()}
        <ContentPanel
          title={
            isLoading
              ? getTitleWithCount('Forecasters', '...')
              : getTitleWithCount('Forecasters', forecastersToDisplay.length)
          }
          titleDataTestSubj="forecasterListHeader"
          subTitle="Predict expected changes in data over time."
          actions={[
            <EuiSmallButton
              data-test-subj="refreshForecasterButton"
              onClick={getUpdatedForecasters}
              iconType="refresh"
            >
              Refresh
            </EuiSmallButton>,
            !useUpdatedUX && (<EuiSmallButton
              data-test-subj="createForecasterButton"
              fill
              href={createForecasterUrl}
            >
              Create forecaster
            </EuiSmallButton>),
          ]}
        >
          {confirmModal !== null && confirmModal}
          {isLoading ? (
            <EuiLoadingSpinner size="xl" />
          ) : 
          forecastersToDisplay.length === 0 ? (
            <EmptyForecasterMessage 
              isFilterApplied={state.searchText !== '' || state.selectedIndices !== ALL_INDICES || state.selectedForecasterStates !== EMPTY_FORECASTER_STATES}
              onResetFilters={() => {
                setState({
                  ...state,
                  queryParams: {
                    ...state.queryParams,
                  },
                  selectedForecasterStates: EMPTY_FORECASTER_STATES,
                  selectedIndices: ALL_INDICES,
                  searchText: '',
                });
              }}
            />
          ) : (
            <>
              <ListFilters
                search={state.searchText}
                selectedForecasterStates={state.selectedForecasterStates}
                selectedIndices={state.selectedIndices}
                indexOptions={indexOptions}
                onForecasterStateChange={handleForecasterStateChange}
                onIndexChange={handleIndexChange}
                onSearchForecasterChange={handleSearchForecasterChange}
                onSearchIndexChange={handleSearchIndexChange}
              />
              <EuiSpacer size="m" />
              
              <EuiDataGrid
                data-test-subj="forecasterListTable"
                aria-label="Forecasters list"
                columns={columns}
                columnVisibility={{ visibleColumns, setVisibleColumns }}
                trailingControlColumns={trailingControlColumns}
                rowCount={forecastersToDisplay.length}
                renderCellValue={renderCellValueFactory(
                  forecastersToDisplay, 
                  state.selectedDataSourceId,
                  forceCollapsedRows,
                  forceCollapseRow
                )}
                pagination={{
                  ...pagination,
                  pageSizeOptions: [10, 50, 100],
                  onChangeItemsPerPage: onChangeItemsPerPage,
                  onChangePage: onChangePage,
                }}
                height="auto"
                inMemory={{ level: 'sorting' }}
                sorting={{ columns: sortingColumns, onSort }}
                onColumnResize={onColumnResize.current}
                toolbarVisibility={{
                  showColumnSelector: true,
                  showStyleSelector: true,
                  showSortSelector: true,
                  /* FIXME: EuiDataGrid full screen mode displays incomplete rows.
                  One possible cause is the layout or CSS constraints in the parent
                  containers is preventing it from filling the viewport.
                  Setting height: 100% on parent containers (EuiPage, EuiPageBody, ContentPanel) 
                  doesn't resolve the grid expansion issue. 
                  Hiding full screen option until fixed. */
                  showFullScreenSelector: false,
                }}
                /* When isExpanded is true, renderCellValueFactory can cause cell values to wrap onto multiple lines,
                 * creating a cluttered UI. Setting rowHeightsOptions with defaultHeight of 1 line ensures consistent
                 * row heights and truncates longer text values appropriately.
                 */
                rowHeightsOptions={{
                  defaultHeight: { lineCount: 1 },
                }}
                key={gridKey}
              />
            </>
          )}
        </ContentPanel>
      </EuiPageBody>
    </EuiPage>
  );
};
