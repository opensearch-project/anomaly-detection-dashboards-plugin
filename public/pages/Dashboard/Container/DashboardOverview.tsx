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

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { AnomaliesLiveChart } from '../Components/AnomaliesLiveChart';
import { AnomaliesDistributionChart } from '../Components/AnomaliesDistribution';
import queryString from 'querystring';

import { useDispatch, useSelector } from 'react-redux';
import { get, isEmpty, cloneDeep } from 'lodash';

import { DetectorListItem, MDSStates } from '../../../models/interfaces';
import { getIndices, getAliases } from '../../../redux/reducers/opensearch';
import { getDetectorList } from '../../../redux/reducers/ad';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { AnomalousDetectorsList } from '../Components/AnomalousDetectorsList';
import {
  ALL_DETECTORS_MESSAGE,
  ALL_DETECTOR_STATES_MESSAGE,
  ALL_INDICES_MESSAGE,
} from '../utils/constants';
import { AppState } from '../../../redux/reducers';
import {
  CatIndex,
  IndexAlias,
} from '../../../../server/models/types';
import {
  getAllDetectorsQueryParamsWithDataSourceId,
  getDataSourceFromURL,
  getVisibleOptions,
} from '../../utils/helpers';
import { BREADCRUMBS, MDS_BREADCRUMBS } from '../../../utils/constants';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import {
  getDetectorStateOptions,
} from '../../DetectorsList/utils/helpers';
import { DashboardHeader } from '../Components/utils/DashboardHeader';
import { EmptyDashboard } from '../Components/EmptyDashboard/EmptyDashboard';
import {
  prettifyErrorMessage,
  NO_PERMISSIONS_KEY_WORD,
} from '../../../../server/utils/helpers';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { DataSourceSelectableConfig } from '../../../../../../src/plugins/data_source_management/public';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
} from '../../../services';
import { RouteComponentProps } from 'react-router-dom';

interface OverviewProps extends RouteComponentProps {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
  landingDataSourceId: string | undefined;
}

export function DashboardOverview(props: OverviewProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const adState = useSelector((state: AppState) => state.ad);
  const allDetectorList = adState.detectorList;
  const totalRealtimeDetectors = Object.values(allDetectorList).length;
  const errorGettingDetectors = adState.errorMessage;
  const isLoadingDetectors = adState.requesting;

  const dataSourceEnabled = getDataSourceEnabled().enabled;

  const [currentDetectors, setCurrentDetectors] = useState(
    Object.values(allDetectorList)
  );
  const [allDetectorsSelected, setAllDetectorsSelected] = useState(true);
  const [selectedDetectorsName, setSelectedDetectorsName] = useState(
    [] as string[]
  );
  const queryParams = getDataSourceFromURL(props.location);
  const [MDSOverviewState, setMDSOverviewState] = useState<MDSStates>({
    queryParams,
    selectedDataSourceId: queryParams.dataSourceId === undefined 
      ? undefined 
      : queryParams.dataSourceId,
  });
  
  const getDetectorOptions = (detectorsIdMap: {
    [key: string]: DetectorListItem;
  }) => {
    const detectorNames = Object.values(detectorsIdMap).map(
      (detectorListItem) => {
        return detectorListItem.name;
      }
    );
    return detectorNames.map(buildItemOption);
  };

  const buildItemOption = (name: string) => {
    return {
      label: name,
    };
  };

  const handleDetectorsFilterChange = (
    options: EuiComboBoxOptionProps[]
  ): void => {
    const selectedNames = options.map((option) => option.label);

    setSelectedDetectorsName(selectedNames);
    setAllDetectorsSelected(isEmpty(selectedNames));
  };

  const [selectedDetectorStates, setSelectedDetectorStates] = useState(
    [] as DETECTOR_STATE[]
  );

  const [allDetectorStatesSelected, setAllDetectorStatesSelected] =
    useState(true);

  const handleDetectorStateFilterChange = (
    options: EuiComboBoxOptionProps[]
  ): void => {
    const selectedStates = options.map(
      (option) => option.label as DETECTOR_STATE
    );
    setSelectedDetectorStates(selectedStates);
    setAllDetectorStatesSelected(isEmpty(selectedStates));
  };

  const handleDataSourceChange = ([event]) => {
    const dataSourceId = event?.id;
    if (dataSourceEnabled && dataSourceId === undefined) {
      getNotifications().toasts.addDanger(
        prettifyErrorMessage('Unable to set data source.')
      );
    } else {
      setMDSOverviewState({
        queryParams: dataSourceId,
        selectedDataSourceId: dataSourceId,
      });
    }
  };

  const opensearchState = useSelector((state: AppState) => state.opensearch);

  const [selectedIndices, setSelectedIndices] = useState([] as string[]);
  const [allIndicesSelected, setAllIndicesSelected] = useState(true);

  const visibleIndices = get(opensearchState, 'indices', []) as CatIndex[];
  const visibleAliases = get(opensearchState, 'aliases', []) as IndexAlias[];

  const handleIndicesFilterChange = (
    options: EuiComboBoxOptionProps[]
  ): void => {
    const selectedIndices = options.map((option) => option.label);
    setSelectedIndices(selectedIndices);
    setAllIndicesSelected(isEmpty(selectedIndices));
  };

  const filterSelectedDetectors = async (
    selectedNameList: string[],
    selectedStateList: DETECTOR_STATE[],
    selectedIndexList: string[]
  ) => {
    let detectorsToFilter: DetectorListItem[];
    if (allDetectorsSelected) {
      detectorsToFilter = cloneDeep(Object.values(allDetectorList));
    } else {
      detectorsToFilter = cloneDeep(Object.values(allDetectorList)).filter(
        (detectorItem) => selectedNameList.includes(detectorItem.name)
      );
    }

    let filteredDetectorItemsByNamesAndIndex = detectorsToFilter;
    if (!allIndicesSelected) {
      filteredDetectorItemsByNamesAndIndex = detectorsToFilter.filter(
        (detectorItem) =>
          selectedIndexList.includes(detectorItem.indices.toString())
      );
    }

    let finalFilteredDetectors = filteredDetectorItemsByNamesAndIndex;
    if (!allDetectorStatesSelected) {
      finalFilteredDetectors = filteredDetectorItemsByNamesAndIndex.filter(
        (detectorItem) => selectedStateList.includes(detectorItem.curState)
      );
    }

    setCurrentDetectors(finalFilteredDetectors);
  };

  const intializeDetectors = async () => {
    dispatch(
      getDetectorList(
        getAllDetectorsQueryParamsWithDataSourceId(
          MDSOverviewState.selectedDataSourceId
        )
      )
    );
    dispatch(getIndices('', MDSOverviewState.selectedDataSourceId));
    dispatch(getAliases('', MDSOverviewState.selectedDataSourceId));
  };

  useEffect(() => {
    const { history, location } = props;
    if (dataSourceEnabled) {
      const updatedParams = {
        dataSourceId: MDSOverviewState.selectedDataSourceId,
      };
      history.replace({
        ...location,
        search: queryString.stringify(updatedParams),
      });
    }
    intializeDetectors();
  }, [MDSOverviewState]);

  useEffect(() => {
    if (errorGettingDetectors) {
      console.error(errorGettingDetectors);
      core.notifications.toasts.addDanger(
        typeof errorGettingDetectors === 'string' &&
          errorGettingDetectors.includes(NO_PERMISSIONS_KEY_WORD)
          ? prettifyErrorMessage(errorGettingDetectors)
          : 'Unable to get all detectors'
      );
    }
  }, [errorGettingDetectors]);

  useEffect(() => {
    if (dataSourceEnabled) {
      core.chrome.setBreadcrumbs([
        MDS_BREADCRUMBS.ANOMALY_DETECTOR(MDSOverviewState.selectedDataSourceId),
        MDS_BREADCRUMBS.DASHBOARD(MDSOverviewState.selectedDataSourceId),
      ]);
    } else {
      core.chrome.setBreadcrumbs([
        BREADCRUMBS.ANOMALY_DETECTOR,
        BREADCRUMBS.DASHBOARD,
      ]);
    }
  });

  useEffect(() => {
    setCurrentDetectors(Object.values(allDetectorList));
  }, [allDetectorList]);

  useEffect(() => {
    filterSelectedDetectors(
      selectedDetectorsName,
      selectedDetectorStates,
      selectedIndices
    );
  }, [selectedDetectorsName, selectedIndices, selectedDetectorStates]);

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
            activeOption: props.landingDataSourceId === undefined 
              || MDSOverviewState.selectedDataSourceId === undefined
                ? undefined
                : [{ id: MDSOverviewState.selectedDataSourceId }],
            savedObjects: getSavedObjectsClient(),
            notifications: getNotifications(),
            onSelectedDataSources: (dataSources) =>
              handleDataSourceChange(dataSources),
          }}
        />
      );
    }, [getSavedObjectsClient(), getNotifications(), props.setActionMenu]);
  }

  return (
    <div style={{ height: '1200px' }}>
      <Fragment>
        {dataSourceEnabled && renderDataSourceComponent}
        <DashboardHeader hasDetectors={totalRealtimeDetectors > 0} />
        {isLoadingDetectors ? (
          <div>
            <EuiLoadingSpinner size="xl" />
          </div>
        ) : totalRealtimeDetectors === 0 ? (
          <EmptyDashboard />
        ) : (
          <Fragment>
            <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
              <EuiFlexItem>
                <EuiComboBox
                  id="detectorFilter"
                  data-test-subj="detectorFilter"
                  placeholder={ALL_DETECTORS_MESSAGE}
                  options={getDetectorOptions(allDetectorList)}
                  onChange={handleDetectorsFilterChange}
                  selectedOptions={selectedDetectorsName.map(buildItemOption)}
                  isClearable={true}
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiComboBox
                  id="detectorStateFilter"
                  data-test-subj="detectorStateFilter"
                  placeholder={ALL_DETECTOR_STATES_MESSAGE}
                  options={getDetectorStateOptions()}
                  onChange={handleDetectorStateFilterChange}
                  selectedOptions={selectedDetectorStates.map(buildItemOption)}
                  isClearable={true}
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiComboBox
                  id="indicesFilter"
                  data-test-subj="indicesFilter"
                  placeholder={ALL_INDICES_MESSAGE}
                  options={getVisibleOptions(visibleIndices, visibleAliases)}
                  onChange={handleIndicesFilterChange}
                  selectedOptions={selectedIndices.map(buildItemOption)}
                  isClearable={true}
                  fullWidth
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <AnomaliesLiveChart selectedDetectors={currentDetectors} />
            <EuiSpacer />
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={6}>
                <AnomaliesDistributionChart
                  selectedDetectors={currentDetectors}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={3}>
                <AnomalousDetectorsList selectedDetectors={currentDetectors} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </Fragment>
        )}
      </Fragment>
    </div>
  );
}
