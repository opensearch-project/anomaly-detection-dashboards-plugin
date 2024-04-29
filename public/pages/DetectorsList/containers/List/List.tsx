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
  EuiBasicTable,
  EuiButton,
  EuiComboBoxOptionProps,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
} from '@elastic/eui';
import { debounce, get, isEmpty } from 'lodash';
import queryString from 'querystring';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import {
  CatIndex,
  GetDetectorsQueryParams,
  IndexAlias,
} from '../../../../../server/models/types';
import { DetectorListItem } from '../../../../models/interfaces';
import { SORT_DIRECTION } from '../../../../../server/utils/constants';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { AppState } from '../../../../redux/reducers';
import {
  getDetectorList,
  startDetector,
  stopDetector,
  deleteDetector,
} from '../../../../redux/reducers/ad';
import {
  getIndices,
  getPrioritizedIndices,
} from '../../../../redux/reducers/opensearch';
import { APP_PATH, MDS_BREADCRUMBS, PLUGIN_NAME } from '../../../../utils/constants';
import { DETECTOR_STATE } from '../../../../../server/utils/constants';
import {
  constructHrefWithDataSourceId,
  getAllDetectorsQueryParamsWithDataSourceId,
  getVisibleOptions,
  sanitizeSearchText,
} from '../../../utils/helpers';
import { EmptyDetectorMessage } from '../../components/EmptyMessage/EmptyMessage';
import { ListFilters } from '../../components/ListFilters/ListFilters';
import {
  MAX_DETECTORS,
  MAX_SELECTED_INDICES,
  ALL_DETECTOR_STATES,
  ALL_INDICES,
  SINGLE_DETECTOR_NOT_FOUND_MSG,
} from '../../../utils/constants';
import { BREADCRUMBS } from '../../../../utils/constants';
import {
  getURLQueryParams,
  getDetectorsForAction,
  getMonitorsForAction,
} from '../../utils/helpers';
import {
  filterAndSortDetectors,
  getDetectorsToDisplay,
} from '../../../utils/helpers';
import { getColumns } from '../../utils/tableUtils';
import { DETECTOR_ACTION } from '../../utils/constants';
import { getTitleWithCount, Listener } from '../../../../utils/utils';
import { ListActions } from '../../components/ListActions/ListActions';
import { searchMonitors } from '../../../../redux/reducers/alerting';
import { Monitor } from '../../../../models/interfaces';
import { ConfirmStartDetectorsModal } from '../ConfirmActionModals/ConfirmStartDetectorsModal';
import { ConfirmStopDetectorsModal } from '../ConfirmActionModals/ConfirmStopDetectorsModal';
import { ConfirmDeleteDetectorsModal } from '../ConfirmActionModals/ConfirmDeleteDetectorsModal';
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
} from '../../../../services';

export interface ListRouterParams {
  from: string;
  size: string;
  search: string;
  indices: string;
  sortDirection: SORT_DIRECTION;
  sortField: string;
  dataSourceId: string;
}
interface ListProps extends RouteComponentProps<ListRouterParams> {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}
interface ListState {
  page: number;
  queryParams: GetDetectorsQueryParams;
  selectedDetectorStates: DETECTOR_STATE[];
  selectedIndices: string[];
  selectedDataSourceId: string | undefined;
}
interface ConfirmModalState {
  isOpen: boolean;
  action: DETECTOR_ACTION;
  isListLoading: boolean;
  isRequestingToClose: boolean;
  affectedDetectors: DetectorListItem[];
  affectedMonitors: { [key: string]: Monitor };
}
interface ListActionsState {
  isDisabled: boolean;
  isStartDisabled: boolean;
  isStopDisabled: boolean;
}

export const DetectorList = (props: ListProps) => {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const allDetectors = useSelector((state: AppState) => state.ad.detectorList);
  const allMonitors = useSelector((state: AppState) => state.alerting.monitors);
  const errorGettingDetectors = useSelector(
    (state: AppState) => state.ad.errorMessage
  );
  const opensearchState = useSelector((state: AppState) => state.opensearch);
  const isRequestingFromES = useSelector(
    (state: AppState) => state.ad.requesting
  );

  const dataSourceEnabled = getDataSourceEnabled().enabled;

  const [selectedDetectors, setSelectedDetectors] = useState(
    [] as DetectorListItem[]
  );
  const [detectorsToDisplay, setDetectorsToDisplay] = useState(
    [] as DetectorListItem[]
  );
  const [isLoadingFinalDetectors, setIsLoadingFinalDetectors] =
    useState<boolean>(true);
  const [selectedDetectorsForAction, setSelectedDetectorsForAction] = useState(
    [] as DetectorListItem[]
  );
  const isLoading = isRequestingFromES || isLoadingFinalDetectors;
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>(
    {
      isOpen: false,
      //@ts-ignore
      action: null,
      isListLoading: false,
      isRequestingToClose: false,
      affectedDetectors: [],
      affectedMonitors: {},
    }
  );
  const [listActionsState, setListActionsState] = useState<ListActionsState>({
    isDisabled: true,
    isStartDisabled: false,
    isStopDisabled: false,
  });

  // Getting all initial monitors
  useEffect(() => {
    const getInitialMonitors = async () => {
      dispatch(searchMonitors(state.selectedDataSourceId));
    };
    getInitialMonitors();
  }, []);

  useEffect(() => {
    if (
      errorGettingDetectors &&
      !errorGettingDetectors.includes(SINGLE_DETECTOR_NOT_FOUND_MSG)
    ) {
      console.error(errorGettingDetectors);
      core.notifications.toasts.addDanger(
        typeof errorGettingDetectors === 'string' &&
          errorGettingDetectors.includes(NO_PERMISSIONS_KEY_WORD)
          ? prettifyErrorMessage(errorGettingDetectors)
          : 'Unable to get all detectors'
      );
      setIsLoadingFinalDetectors(false);
    }
  }, [errorGettingDetectors]);

  // Updating displayed indices (initializing to first 20 for now)
  const visibleIndices = get(opensearchState, 'indices', []) as CatIndex[];
  const visibleAliases = get(opensearchState, 'aliases', []) as IndexAlias[];
  const indexOptions = getVisibleOptions(visibleIndices, visibleAliases);

  const queryParams = getURLQueryParams(props.location);
  const [state, setState] = useState<ListState>({
    page: 0,
    queryParams,
    selectedDetectorStates: ALL_DETECTOR_STATES,
    selectedIndices: queryParams.indices
      ? queryParams.indices.split(',')
      : ALL_INDICES,
    selectedDataSourceId: queryParams.dataSourceId === undefined 
      ? undefined 
      : queryParams.dataSourceId,
  });

  // Set breadcrumbs on page initialization
  useEffect(() => {
    if (dataSourceEnabled) {
      core.chrome.setBreadcrumbs([
        MDS_BREADCRUMBS.ANOMALY_DETECTOR(state.selectedDataSourceId),
        MDS_BREADCRUMBS.DETECTORS(state.selectedDataSourceId),
      ]);
    } else {
      core.chrome.setBreadcrumbs([
        BREADCRUMBS.ANOMALY_DETECTOR,
        BREADCRUMBS.DETECTORS,
      ]);
    }
  }, [state.selectedDataSourceId]);

  // Getting all initial indices
  const [indexQuery, setIndexQuery] = useState('');
  useEffect(() => {
    const getInitialIndices = async () => {
      await dispatch(getIndices(indexQuery, state.selectedDataSourceId));
    };
    getInitialIndices();
  }, [state.selectedDataSourceId]);

  // Refresh data if user change any parameters / filter / sort
  useEffect(() => {
    const { history, location } = props;
    let updatedParams = {
      from: state.page * state.queryParams.size,
      size: state.queryParams.size,
      search: state.queryParams.search,
      indices: state.selectedIndices.join(','),
      sortDirection: state.queryParams.sortDirection,
      sortField: state.queryParams.sortField,
    } as GetDetectorsQueryParams; 

    if (dataSourceEnabled) {
      updatedParams = {
        ...updatedParams,
        dataSourceId: state.selectedDataSourceId,
      }
    }

    history.replace({
      ...location,
      search: queryString.stringify(updatedParams),
    });

    setIsLoadingFinalDetectors(true);

    getUpdatedDetectors();
  }, [
    state.page,
    state.queryParams,
    state.selectedDetectorStates,
    state.selectedIndices,
    state.selectedDataSourceId,
  ]);

  // Handle all filtering / sorting of detectors
  useEffect(() => {
    const curSelectedDetectors = filterAndSortDetectors(
      Object.values(allDetectors),
      state.queryParams.search,
      state.selectedIndices,
      state.selectedDetectorStates,
      state.queryParams.sortField,
      state.queryParams.sortDirection
    );
    setSelectedDetectors(curSelectedDetectors);

    const curDetectorsToDisplay = getDetectorsToDisplay(
      curSelectedDetectors,
      state.page,
      state.queryParams.size
    );
    setDetectorsToDisplay(curDetectorsToDisplay);

    setIsLoadingFinalDetectors(false);
  }, [allDetectors]);

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

  const getUpdatedDetectors = async () => {
    dispatch(
      getDetectorList(
        getAllDetectorsQueryParamsWithDataSourceId(state.selectedDataSourceId)
      )
    );
  };

  const handlePageChange = (pageNumber: number) => {
    setState({ ...state, page: pageNumber });
  };

  const handleTableChange = ({ page: tablePage = {}, sort = {} }: any) => {
    const { index: page, size } = tablePage;
    const { field: sortField, direction: sortDirection } = sort;
    setState({
      ...state,
      page,
      queryParams: {
        ...state.queryParams,
        size,
        sortField,
        sortDirection,
      },
    });
  };

  // Refresh data is user is typing in the search bar
  const handleSearchDetectorChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const searchText = e.target.value;
    setState({
      ...state,
      page: 0,
      queryParams: {
        ...state.queryParams,
        search: searchText,
      },
    });
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
    }
  }, 300);

  // Refresh data if user is selecting a detector state filter
  const handleDetectorStateChange = (
    options: EuiComboBoxOptionProps[]
  ): void => {
    let states: DETECTOR_STATE[];
    states =
      options.length == 0
        ? ALL_DETECTOR_STATES
        : options.map((option) => option.label as DETECTOR_STATE);
    setState((state) => ({
      ...state,
      page: 0,
      selectedDetectorStates: states,
    }));
  };

  // Refresh data if user is selecting an index filter
  const handleIndexChange = (options: EuiComboBoxOptionProps[]): void => {
    let indices: string[];
    indices =
      options.length == 0
        ? ALL_INDICES
        : options.map((option) => option.label).slice(0, MAX_SELECTED_INDICES);

    setState({
      ...state,
      page: 0,
      selectedIndices: indices,
    });
  };

  const handleResetFilter = () => {
    setState((state) => ({
      ...state,
      queryParams: {
        ...state.queryParams,
        search: '',
        indices: '',
      },
      selectedDetectorStates: ALL_DETECTOR_STATES,
      selectedIndices: ALL_INDICES,
    }));
  };

  const handleSelectionChange = (currentSelected: DetectorListItem[]) => {
    setSelectedDetectorsForAction(currentSelected);
    setListActionsState({
      ...listActionsState,
      isDisabled: isEmpty(currentSelected),
      isStartDisabled: isEmpty(
        getDetectorsForAction(currentSelected, DETECTOR_ACTION.START)
      ),
      isStopDisabled: isEmpty(
        getDetectorsForAction(currentSelected, DETECTOR_ACTION.STOP)
      ),
    });
  };

  const handleStartDetectorsAction = () => {
    const validDetectors = getDetectorsForAction(
      selectedDetectorsForAction,
      DETECTOR_ACTION.START
    );
    if (!isEmpty(validDetectors)) {
      setConfirmModalState({
        isOpen: true,
        action: DETECTOR_ACTION.START,
        isListLoading: false,
        isRequestingToClose: false,
        affectedDetectors: validDetectors,
        affectedMonitors: {},
      });
    } else {
      core.notifications.toasts.addWarning(
        'All selected detectors are unable to start. Make sure selected \
          detectors have features and are not already running'
      );
    }
  };

  const handleStopDetectorsAction = () => {
    const validDetectors = getDetectorsForAction(
      selectedDetectorsForAction,
      DETECTOR_ACTION.STOP
    );
    if (!isEmpty(validDetectors)) {
      const validMonitors = getMonitorsForAction(validDetectors, allMonitors);
      setConfirmModalState({
        isOpen: true,
        action: DETECTOR_ACTION.STOP,
        isListLoading: false,
        isRequestingToClose: false,
        affectedDetectors: validDetectors,
        affectedMonitors: validMonitors,
      });
    } else {
      core.notifications.toasts.addWarning(
        'All selected detectors are unable to stop. Make sure selected \
          detectors are already running'
      );
    }
  };

  const handleDeleteDetectorsAction = async () => {
    const validDetectors = getDetectorsForAction(
      selectedDetectorsForAction,
      DETECTOR_ACTION.DELETE
    );
    if (!isEmpty(validDetectors)) {
      const validMonitors = getMonitorsForAction(validDetectors, allMonitors);
      setConfirmModalState({
        isOpen: true,
        action: DETECTOR_ACTION.DELETE,
        isListLoading: false,
        isRequestingToClose: false,
        affectedDetectors: validDetectors,
        affectedMonitors: validMonitors,
      });
    } else {
      core.notifications.toasts.addWarning(
        'No detectors selected. Please select detectors to delete'
      );
    }
  };

  const handleStartDetectorJobs = async () => {
    setIsLoadingFinalDetectors(true);
    const validIds = getDetectorsForAction(
      selectedDetectorsForAction,
      DETECTOR_ACTION.START
    ).map((detector) => detector.id);
    const promises = validIds.map(async (id: string) => {
      return dispatch(startDetector(id, state.selectedDataSourceId));
    });
    await Promise.all(promises)
      .then(() => {
        core.notifications.toasts.addSuccess(
          'Successfully started all selected detectors'
        );
      })
      .catch((error) => {
        core.notifications.toasts.addDanger(
          prettifyErrorMessage(
            `Error starting all selected detectors: ${error}`
          )
        );
      })
      .finally(() => {
        getUpdatedDetectors();
      });
  };

  const handleStopDetectorJobs = async (listener?: Listener) => {
    setIsLoadingFinalDetectors(true);
    const validIds = getDetectorsForAction(
      selectedDetectorsForAction,
      DETECTOR_ACTION.STOP
    ).map((detector) => detector.id);
    const promises = validIds.map(async (id: string) => {
      return dispatch(stopDetector(id, state.selectedDataSourceId));
    });
    await Promise.all(promises)
      .then(() => {
        core.notifications.toasts.addSuccess(
          'Successfully stopped all selected detectors'
        );
        if (listener) listener.onSuccess();
      })
      .catch((error) => {
        core.notifications.toasts.addDanger(
          prettifyErrorMessage(
            `Error stopping all selected detectors: ${error}`
          )
        );
        if (listener) listener.onException();
      })
      .finally(() => {
        // only need to get updated list if we're just stopping (no need if deleting also)
        if (confirmModalState.action === DETECTOR_ACTION.STOP) {
          getUpdatedDetectors();
        }
      });
  };

  const handleDeleteDetectorJobs = async () => {
    setIsLoadingFinalDetectors(true);
    const validIds = getDetectorsForAction(
      selectedDetectorsForAction,
      DETECTOR_ACTION.DELETE
    ).map((detector) => detector.id);
    const promises = validIds.map(async (id: string) => {
      return dispatch(deleteDetector(id, state.selectedDataSourceId));
    });
    await Promise.all(promises)
      .then(() => {
        core.notifications.toasts.addSuccess(
          'Successfully deleted all selected detectors'
        );
      })
      .catch((error) => {
        core.notifications.toasts.addDanger(
          prettifyErrorMessage(
            `Error deleting all selected detectors: ${error}`
          )
        );
      })
      .finally(() => {
        getUpdatedDetectors();
      });
  };

  const getItemId = (item: any) => {
    return `${item.id}-${item.currentTime}`;
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

  const handleDataSourceChange = (dataSources: DataSourceOption[]) => {
    const dataSourceId = dataSources[0].id;

    if (dataSourceEnabled && dataSourceId === undefined) {
      getNotifications().toasts.addDanger(
        prettifyErrorMessage('Unable to set data source.')
      );
    } else {
      setState((prevState) => ({
        ...prevState,
        page: 0,
        selectedDataSourceId: dataSourceId,
      }));
    }
  };

  const getConfirmModal = () => {
    if (confirmModalState.isOpen) {
      //@ts-ignore
      switch (confirmModalState.action) {
        case DETECTOR_ACTION.START: {
          return (
            <ConfirmStartDetectorsModal
              detectors={confirmModalState.affectedDetectors}
              onStartDetectors={handleStartDetectorJobs}
              onHide={handleHideModal}
              onConfirm={handleConfirmModal}
              isListLoading={isLoading}
            />
          );
        }
        case DETECTOR_ACTION.STOP: {
          return (
            <ConfirmStopDetectorsModal
              detectors={confirmModalState.affectedDetectors}
              monitors={confirmModalState.affectedMonitors}
              onStopDetectors={handleStopDetectorJobs}
              onHide={handleHideModal}
              onConfirm={handleConfirmModal}
              isListLoading={isLoading}
            />
          );
        }
        case DETECTOR_ACTION.DELETE: {
          return (
            <ConfirmDeleteDetectorsModal
              detectors={confirmModalState.affectedDetectors}
              monitors={confirmModalState.affectedMonitors}
              onStopDetectors={handleStopDetectorJobs}
              onDeleteDetectors={handleDeleteDetectorJobs}
              onHide={handleHideModal}
              onConfirm={handleConfirmModal}
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

  const sorting = {
    sort: {
      direction: state.queryParams.sortDirection,
      field: state.queryParams.sortField,
    },
  };

  const selection = {
    onSelectionChange: handleSelectionChange,
  };

  const isFilterApplied =
    !isEmpty(state.queryParams.search) ||
    !isEmpty(state.selectedDetectorStates) ||
    !isEmpty(state.selectedIndices);

  const pagination = {
    pageIndex: state.page,
    pageSize: state.queryParams.size,
    totalItemCount: Math.min(MAX_DETECTORS, selectedDetectors.length),
    pageSizeOptions: [5, 10, 20, 50],
  };

  const confirmModal = getConfirmModal();

  let renderDataSourceComponent = null;
  if (dataSourceEnabled) {
    const DataSourceMenu =
      getDataSourceManagementPlugin()?.ui.getDataSourceMenu<DataSourceSelectableConfig>();
    renderDataSourceComponent = useMemo(() => {
      return (
        <DataSourceMenu
          setMenuMountPoint={props.setActionMenu}
          componentType={'DataSourceSelectable'}
          componentConfig={{
            fullWidth: false,
            activeOption: state.selectedDataSourceId !== undefined 
              ? [{ id: state.selectedDataSourceId }]
              : undefined,
            savedObjects: getSavedObjectsClient(),
            notifications: getNotifications(),
            onSelectedDataSources: (dataSources) =>
              handleDataSourceChange(dataSources),
          }}
        />
      );
    }, [getSavedObjectsClient(), getNotifications(), props.setActionMenu]);
  }

  const columns = getColumns(state.selectedDataSourceId);

  const createDetectorUrl =`${PLUGIN_NAME}#` + constructHrefWithDataSourceId(APP_PATH.CREATE_DETECTOR, state.selectedDataSourceId, false);

  return (
    <EuiPage>
      <EuiPageBody>
        {dataSourceEnabled && renderDataSourceComponent}
        <ContentPanel
          title={
            isLoading
              ? getTitleWithCount('Detectors', '...')
              : getTitleWithCount('Detectors', selectedDetectors.length)
          }
          titleDataTestSubj="detectorListHeader"
          actions={[
            <ListActions
              onStartDetectors={handleStartDetectorsAction}
              onStopDetectors={handleStopDetectorsAction}
              onDeleteDetectors={handleDeleteDetectorsAction}
              isActionsDisabled={listActionsState.isDisabled}
              isStartDisabled={listActionsState.isStartDisabled}
              isStopDisabled={listActionsState.isStopDisabled}
            />,
            <EuiButton
              data-test-subj="createDetectorButton"
              fill
              href={createDetectorUrl}
            >
              Create detector
            </EuiButton>,
          ]}
        >
          {confirmModal}
          <ListFilters
            activePage={state.page}
            pageCount={
              isLoading
                ? 0
                : Math.ceil(
                    selectedDetectors.length / state.queryParams.size
                  ) || 1
            }
            search={state.queryParams.search}
            selectedDetectorStates={state.selectedDetectorStates}
            selectedIndices={state.selectedIndices}
            indexOptions={indexOptions}
            onDetectorStateChange={handleDetectorStateChange}
            onIndexChange={handleIndexChange}
            onSearchDetectorChange={handleSearchDetectorChange}
            onSearchIndexChange={handleSearchIndexChange}
            onPageClick={handlePageChange}
          />
          <EuiSpacer size="m" />
          <EuiBasicTable<any>
            data-test-subj="detectorListTable"
            items={isLoading ? [] : detectorsToDisplay}
            /*
              itemId here is used to keep track of the selected detectors and render appropriately.
              Because the item id is dependent on the current time (see getItemID() above), all selected
              detectors will be deselected once new detectors are retrieved because the page will
              re-render with a new timestamp. This logic is borrowed from Alerting Dashboards plugin's
              monitors list page.
            */
            itemId={getItemId}
            columns={columns}
            onChange={handleTableChange}
            isSelectable={true}
            selection={selection}
            sorting={sorting}
            pagination={pagination}
            noItemsMessage={
              isLoading ? (
                'Loading detectors...'
              ) : (
                <EmptyDetectorMessage
                  isFilterApplied={isFilterApplied}
                  onResetFilters={handleResetFilter}
                />
              )
            }
          />
        </ContentPanel>
      </EuiPageBody>
    </EuiPage>
  );
};
