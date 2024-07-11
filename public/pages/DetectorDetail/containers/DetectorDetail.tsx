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

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import {
  EuiTabs,
  EuiTab,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiOverlayMask,
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiFieldText,
  EuiLoadingSpinner,
  EuiSmallButton,
} from '@elastic/eui';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { get, isEmpty } from 'lodash';
import {
  RouteComponentProps,
  Switch,
  Route,
  Redirect,
  useLocation,
} from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useFetchDetectorInfo } from '../../CreateDetectorSteps/hooks/useFetchDetectorInfo';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import { AppState } from '../../../redux/reducers';
import {
  deleteDetector,
  startDetector,
  stopDetector,
  getDetector,
  stopHistoricalDetector,
} from '../../../redux/reducers/ad';
import { getAliases, getIndices } from '../../../redux/reducers/opensearch';
import { getErrorMessage, Listener } from '../../../utils/utils';
import { darkModeEnabled } from '../../../utils/opensearchDashboardsUtils';
import { BREADCRUMBS, MDS_BREADCRUMBS } from '../../../utils/constants';
import { DetectorControls } from '../components/DetectorControls';
import { ConfirmModal } from '../components/ConfirmModal/ConfirmModal';
import { useFetchMonitorInfo } from '../hooks/useFetchMonitorInfo';
import { MonitorCallout } from '../components/MonitorCallout/MonitorCallout';
import { DETECTOR_DETAIL_TABS } from '../utils/constants';
import { DetectorConfig } from '../../DetectorConfig/containers/DetectorConfig';
import { AnomalyResults } from '../../DetectorResults/containers/AnomalyResults';
import { HistoricalDetectorResults } from '../../HistoricalDetectorResults/containers/HistoricalDetectorResults';
import {
  NO_PERMISSIONS_KEY_WORD,
  prettifyErrorMessage,
} from '../../../../server/utils/helpers';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { CatIndex, IndexAlias } from '../../../../server/models/types';
import { containsIndex, containsAlias } from '../utils/helpers';
import { DataSourceViewConfig } from '../../../../../../src/plugins/data_source_management/public';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
} from '../../../services';
import { constructHrefWithDataSourceId, getDataSourceFromURL } from '../../../pages/utils/helpers';

export interface DetectorRouterProps {
  detectorId?: string;
}
interface DetectorDetailProps extends RouteComponentProps<DetectorRouterProps> {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

const tabs = [
  {
    id: DETECTOR_DETAIL_TABS.RESULTS,
    name: 'Real-time results',
    route: DETECTOR_DETAIL_TABS.RESULTS,
  },
  {
    id: DETECTOR_DETAIL_TABS.HISTORICAL,
    name: 'Historical analysis',
    route: DETECTOR_DETAIL_TABS.HISTORICAL,
  },
  {
    id: DETECTOR_DETAIL_TABS.CONFIGURATIONS,
    name: 'Detector configuration',
    route: DETECTOR_DETAIL_TABS.CONFIGURATIONS,
  },
];

const getSelectedTabId = (pathname: string) => {
  return pathname.includes(DETECTOR_DETAIL_TABS.CONFIGURATIONS)
    ? DETECTOR_DETAIL_TABS.CONFIGURATIONS
    : pathname.includes(DETECTOR_DETAIL_TABS.HISTORICAL)
    ? DETECTOR_DETAIL_TABS.HISTORICAL
    : DETECTOR_DETAIL_TABS.RESULTS;
};

interface DetectorDetailModel {
  selectedTab: DETECTOR_DETAIL_TABS;
  showDeleteDetectorModal: boolean;
  showStopDetectorModalFor: string | undefined;
  showMonitorCalloutModal: boolean;
  deleteTyped: boolean;
}

export const DetectorDetail = (props: DetectorDetailProps) => {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const detectorId = get(props, 'match.params.detectorId', '') as string;
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;

  const { detector, hasError, isLoadingDetector, errorMessage } =
    useFetchDetectorInfo(detectorId, dataSourceId);
  const { monitor } = useFetchMonitorInfo(
    detectorId,
    dataSourceId,
    dataSourceEnabled
  );
  const visibleIndices = useSelector(
    (state: AppState) => state.opensearch.indices
  ) as CatIndex[];
  const isCatIndicesRequesting = useSelector(
    (state: AppState) => state.opensearch.requesting
  ) as boolean;
  const visibleAliases = useSelector(
    (state: AppState) => state.opensearch.aliases
  ) as IndexAlias[];

  /*
  Determine if the result index is missing based on several conditions:
  - If the detector is still loading, the result index is not missing.
  - If the result index retrieved from the detector is empty, it is not missing.
  - If cat indices are being requested, the result index is not missing.
  - If visible indices/aliaes are empty, it is likely there is an issue retrieving existing indices.
    To be safe, we'd rather not show the error message and consider the result index not missing.
  - If the result index is not found in the visible indices, then it is missing.
  */
  const resultIndexOrAlias = get(detector, 'resultIndex', '')
  const isResultIndexMissing = isLoadingDetector
    ? false
    : isEmpty(get(detector, 'resultIndex', ''))
    ? false
    : isCatIndicesRequesting
    ? false
    : isEmpty(visibleIndices) || isEmpty(visibleAliases)
    ? false
    : !containsIndex(resultIndexOrAlias, visibleIndices) && !containsAlias(resultIndexOrAlias, visibleAliases);

  // debug message: prints visibleIndices if isResultIndexMissing is true
  if (isResultIndexMissing) {
    // The JSON.stringify method converts a JavaScript object or value to a JSON string. The optional null parameter is for the replacer function (not used here), and 2 specifies the indentation level for pretty-printing the JSON.
    console.log(`isResultIndexMissing is true, visibleIndices: ${JSON.stringify(visibleIndices, null, 2)}, visibleAliases: ${JSON.stringify(visibleAliases, null, 2)}, detector result index: ${resultIndexOrAlias}`);
  }

  // String to set in the modal if the realtime detector and/or historical analysis
  // are running when the user tries to edit the detector details or model config
  const isRTJobRunning = get(detector, 'enabled');
  const isHistoricalJobRunning =
    get(detector, 'taskState') === DETECTOR_STATE.RUNNING ||
    get(detector, 'taskState') === DETECTOR_STATE.INIT;
  const runningJobsAsString =
    isRTJobRunning && isHistoricalJobRunning
      ? 'detector and historical analysis'
      : isRTJobRunning
      ? 'detector'
      : isHistoricalJobRunning
      ? 'historical analysis'
      : '';

  //TODO: test dark mode once detector configuration and AD result page merged
  const isDark = darkModeEnabled();

  const [detectorDetailModel, setDetectorDetailModel] =
    useState<DetectorDetailModel>({
      selectedTab: getSelectedTabId(
        props.location.pathname
      ) as DETECTOR_DETAIL_TABS,
      showDeleteDetectorModal: false,
      showStopDetectorModalFor: undefined,
      showMonitorCalloutModal: false,
      deleteTyped: false,
    });

  useHideSideNavBar(true, false);

  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);
  }, []);

  // Getting all visible indices & aliases. Will re-fetch if changes to the detector (e.g.,
  // detector starts, result index recreated or user switches tabs to re-fetch detector)
  useEffect(() => {
    const getInitialIndicesAliases = async () => {
      try {
        await dispatch(getIndices('', dataSourceId));
        await dispatch(getAliases('', dataSourceId));
      } catch (error) {
        console.error(error);
        core.notifications.toasts.addDanger('Error getting all indices or aliases');
      }
    };
    // only need to check if indices exist after detector finishes loading
    if (!isLoadingDetector) {
      getInitialIndicesAliases();
    }
  }, [detector]);

  useEffect(() => {
    if (hasError) {
      core.notifications.toasts.addDanger(
        errorMessage.includes(NO_PERMISSIONS_KEY_WORD)
          ? prettifyErrorMessage(errorMessage)
          : 'Unable to find the detector'
      );
      props.history.push(constructHrefWithDataSourceId('/detectors', dataSourceId, false));
    }
  }, [hasError]);

  useEffect(() => {
    if (detector) {
      if(dataSourceEnabled) {
        core.chrome.setBreadcrumbs([
          MDS_BREADCRUMBS.ANOMALY_DETECTOR(dataSourceId),
          MDS_BREADCRUMBS.DETECTORS(dataSourceId),
          { text: detector ? detector.name : '' },
        ]);
      } else {
        core.chrome.setBreadcrumbs([
          BREADCRUMBS.ANOMALY_DETECTOR,
          BREADCRUMBS.DETECTORS,
          { text: detector ? detector.name : '' },
        ]);
      }
    }
  }, [detector]);

  // If the detector state was changed after opening the stop detector modal,
  // re-check if any jobs are running, and close the modal if it's not needed anymore
  useEffect(() => {
    if (!isRTJobRunning && !isHistoricalJobRunning && !isEmpty(detector)) {
      hideStopDetectorModal();
    }
  }, [detector]);

  const handleSwitchToConfigurationTab = useCallback(() => {
    setDetectorDetailModel({
      ...detectorDetailModel,
      selectedTab: DETECTOR_DETAIL_TABS.CONFIGURATIONS,
    });
    props.history.push(constructHrefWithDataSourceId(
      `/detectors/${detectorId}/configurations`, dataSourceId, false)
    );
  }, []);

  const handleSwitchToHistoricalTab = useCallback(() => {
    setDetectorDetailModel({
      ...detectorDetailModel,
      selectedTab: DETECTOR_DETAIL_TABS.HISTORICAL,
    });
    props.history.push(constructHrefWithDataSourceId(
      `/detectors/${detectorId}/historical`, dataSourceId, false)
    );
  }, []);

  const handleTabChange = (route: DETECTOR_DETAIL_TABS) => {
    setDetectorDetailModel({
      ...detectorDetailModel,
      selectedTab: route,
    });
    props.history.push(constructHrefWithDataSourceId(
      `/detectors/${detectorId}/${route}`, dataSourceId, false)
    );
  };

  const hideMonitorCalloutModal = () => {
    setDetectorDetailModel({
      ...detectorDetailModel,
      showMonitorCalloutModal: false,
    });
  };

  const hideStopDetectorModal = () => {
    setDetectorDetailModel({
      ...detectorDetailModel,
      showStopDetectorModalFor: undefined,
    });
  };

  const hideDeleteDetectorModal = () => {
    setDetectorDetailModel({
      ...detectorDetailModel,
      showDeleteDetectorModal: false,
    });
  };

  const handleStopDetectorForEditing = (detectorId: string) => {
    const listener: Listener = {
      onSuccess: () => {
        if (detectorDetailModel.showStopDetectorModalFor === 'detector') {
          props.history.push(constructHrefWithDataSourceId(`/detectors/${detectorId}/edit`, dataSourceId, false));
        } else {
          props.history.push(constructHrefWithDataSourceId(`/detectors/${detectorId}/features`, dataSourceId, false));
        }
        hideStopDetectorModal();
      },
      onException: hideStopDetectorModal,
    };
    handleStopAdJob(detectorId, listener);
  };

  const handleStartAdJob = async (detectorId: string) => {
    try {
      // Await for the start detector call to succeed before displaying toast.
      // Don't wait for get detector call; the page will be updated
      // via hooks automatically when the new detector info is returned.
      await dispatch(startDetector(detectorId, dataSourceId));
      dispatch(getDetector(detectorId, dataSourceId));
      core.notifications.toasts.addSuccess(
        `Successfully started the detector job`
      );
    } catch (err) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(
          getErrorMessage(err, 'There was a problem starting the detector job')
        )
      );
    }
  };

  const handleStopAdJob = async (detectorId: string, listener?: Listener) => {
    try {
      if (isRTJobRunning) {
        await dispatch(stopDetector(detectorId, dataSourceId));
      }
      if (isHistoricalJobRunning) {
        await dispatch(stopHistoricalDetector(detectorId, dataSourceId));
      }
      core.notifications.toasts.addSuccess(
        `Successfully stopped the ${runningJobsAsString}`
      );
      if (listener) listener.onSuccess();
    } catch (err) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(
          getErrorMessage(
            err,
            `There was a problem stopping the ${runningJobsAsString}`
          )
        )
      );
      if (listener) listener.onException();
    }
  };

  const handleDelete = useCallback(async (detectorId: string) => {
    try {
      await dispatch(deleteDetector(detectorId, dataSourceId));
      core.notifications.toasts.addSuccess(`Successfully deleted the detector`);
      hideDeleteDetectorModal();
      props.history.push(constructHrefWithDataSourceId('/detectors', dataSourceId, false));
    } catch (err) {
      core.notifications.toasts.addDanger(
        prettifyErrorMessage(
          getErrorMessage(err, 'There was a problem deleting the detector')
        )
      );
      hideDeleteDetectorModal();
    }
  }, []);

  const handleEditDetector = () => {
    isRTJobRunning || isHistoricalJobRunning
      ? setDetectorDetailModel({
          ...detectorDetailModel,
          showStopDetectorModalFor: 'detector',
        })
      : props.history.push(constructHrefWithDataSourceId(`/detectors/${detectorId}/edit`, dataSourceId, false));
  };

  const handleEditFeature = () => {
    isRTJobRunning || isHistoricalJobRunning
      ? setDetectorDetailModel({
          ...detectorDetailModel,
          showStopDetectorModalFor: 'features',
        })
      : props.history.push(constructHrefWithDataSourceId(`/detectors/${detectorId}/features`, dataSourceId, false));
  };

  const lightStyles = {
    backgroundColor: '#FFF',
  };
  const monitorCallout = monitor ? (
    <MonitorCallout monitorId={monitor.id} monitorName={monitor.name} />
  ) : null;

  const deleteDetectorCallout =
    isRTJobRunning || isHistoricalJobRunning ? (
      <EuiCallOut
        title={`The ${runningJobsAsString} is running. Are you sure you want to proceed?`}
        color="warning"
        iconType="alert"
      ></EuiCallOut>
    ) : null;

  let renderDataSourceComponent = null;
  if (dataSourceEnabled) {
    const DataSourceMenu =
      getDataSourceManagementPlugin()?.ui.getDataSourceMenu<DataSourceViewConfig>();
    renderDataSourceComponent = (
      <DataSourceMenu
        setMenuMountPoint={props.setActionMenu}
        componentType={'DataSourceView'}
        componentConfig={{
          activeOption: [{ id: dataSourceId }],
          fullWidth: false,
          savedObjects: getSavedObjectsClient(),
          notifications: getNotifications(),
        }}
      />
    );
  }

  return (
    <React.Fragment>
      {!isEmpty(detector) && !hasError ? (
        <EuiFlexGroup
          direction="column"
          style={{
            ...(isDark
              ? { flexGrow: 'unset' }
              : { ...lightStyles, flexGrow: 'unset' }),
          }}
        >
          {dataSourceEnabled && renderDataSourceComponent}
          <EuiFlexGroup
            justifyContent="spaceBetween"
            style={{ padding: '10px' }}
          >
            <EuiFlexItem grow={false}>
              <EuiTitle size="l" data-test-subj="detectorNameHeader">
                {<h1>{detector && detector.name} </h1>}
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DetectorControls
                onEditDetector={handleEditDetector}
                onDelete={() =>
                  setDetectorDetailModel({
                    ...detectorDetailModel,
                    showDeleteDetectorModal: true,
                  })
                }
                onStartDetector={() => handleStartAdJob(detectorId)}
                onStopDetector={() =>
                  monitor
                    ? setDetectorDetailModel({
                        ...detectorDetailModel,
                        showMonitorCalloutModal: true,
                      })
                    : handleStopAdJob(detectorId)
                }
                onEditFeatures={handleEditFeature}
                detector={detector}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {isResultIndexMissing ? (
            <EuiCallOut
              style={{
                marginLeft: '10px',
                marginRight: '10px',
                marginBottom: '10px',
              }}
              title={`Your detector is using custom result index '${get(
                detector,
                'resultIndex',
                ''
              )}', but is not found in the cluster. The index will be recreated when you start a real-time or historical job.`}
              color="danger"
              iconType="alert"
              data-test-subj="missingResultIndexCallOut"
            ></EuiCallOut>
          ) : null}

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTabs>
                {tabs.map((tab) => (
                  <EuiTab
                    onClick={() => {
                      handleTabChange(tab.route);
                    }}
                    isSelected={tab.id === detectorDetailModel.selectedTab}
                    key={tab.id}
                    data-test-subj={`${tab.id}Tab`}
                  >
                    {tab.name}
                  </EuiTab>
                ))}
              </EuiTabs>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      ) : (
        <div>
          <EuiLoadingSpinner size="xl" />
        </div>
      )}
      {detectorDetailModel.showDeleteDetectorModal ? (
        <EuiOverlayMask>
          <ConfirmModal
            title="Delete detector?"
            description={
              <EuiFlexGroup direction="column">
                <EuiFlexItem>
                  <EuiText>
                    <p>
                      Detector and feature configuration will be permanently
                      removed. This action is irreversible. To confirm deletion,
                      type <i>delete</i> in the field.
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                  <EuiFieldText
                    data-test-subj="typeDeleteField"
                    fullWidth={true}
                    placeholder="delete"
                    onChange={(e) => {
                      if (e.target.value === 'delete') {
                        setDetectorDetailModel({
                          ...detectorDetailModel,
                          deleteTyped: true,
                        });
                      } else {
                        setDetectorDetailModel({
                          ...detectorDetailModel,
                          deleteTyped: false,
                        });
                      }
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            callout={
              <Fragment>
                {deleteDetectorCallout}
                {monitorCallout ? <EuiSpacer size="s" /> : null}
                {monitorCallout}
              </Fragment>
            }
            confirmButtonText="Delete"
            confirmButtonColor="danger"
            confirmButtonDisabled={!detectorDetailModel.deleteTyped}
            onClose={hideDeleteDetectorModal}
            onCancel={hideDeleteDetectorModal}
            onConfirm={() => {
              if (detector.enabled) {
                const listener: Listener = {
                  onSuccess: () => {
                    handleDelete(detectorId);
                  },
                  onException: hideDeleteDetectorModal,
                };
                handleStopAdJob(detectorId, listener);
              } else {
                handleDelete(detectorId);
              }
            }}
          />
        </EuiOverlayMask>
      ) : null}

      {detectorDetailModel.showStopDetectorModalFor ? (
        <EuiOverlayMask>
          <ConfirmModal
            title="Stop detector to proceed?"
            description={`You must stop the ${runningJobsAsString} to change its configuration. After you reconfigure the detector, be sure to restart it.`}
            callout={monitorCallout}
            confirmButtonText="Stop and proceed to edit"
            confirmButtonColor="primary"
            onClose={hideStopDetectorModal}
            onCancel={hideStopDetectorModal}
            onConfirm={() => handleStopDetectorForEditing(detectorId)}
          />
        </EuiOverlayMask>
      ) : null}

      {detectorDetailModel.showMonitorCalloutModal ? (
        <EuiOverlayMask>
          <ConfirmModal
            title="Stop detector will impact associated monitor"
            description=""
            callout={monitorCallout}
            confirmButtonText="Stop detector"
            confirmButtonColor="primary"
            onClose={hideMonitorCalloutModal}
            onCancel={hideMonitorCalloutModal}
            onConfirm={() => {
              handleStopAdJob(detectorId);
              hideMonitorCalloutModal();
            }}
          />
        </EuiOverlayMask>
      ) : null}

      <Switch>
        <Route
          exact
          path="/detectors/:detectorId/results"
          render={(resultsProps) => (
            <AnomalyResults
              {...resultsProps}
              detectorId={detectorId}
              onStartDetector={() => handleStartAdJob(detectorId)}
              onStopDetector={() => handleStopAdJob(detectorId)}
              onSwitchToConfiguration={handleSwitchToConfigurationTab}
              onSwitchToHistorical={handleSwitchToHistoricalTab}
            />
          )}
        />
        <Route
          exact
          path="/detectors/:detectorId/historical"
          render={(configProps) => (
            <HistoricalDetectorResults
              {...configProps}
              detectorId={detectorId}
            />
          )}
        />
        <Route
          exact
          path="/detectors/:detectorId/configurations"
          render={(configProps) => (
            <DetectorConfig
              {...configProps}
              detectorId={detectorId}
              onEditFeatures={handleEditFeature}
              onEditDetector={handleEditDetector}
            />
          )}
        />
        <Redirect to="/detectors/:detectorId/results" />
      </Switch>
    </React.Fragment>
  );
};
