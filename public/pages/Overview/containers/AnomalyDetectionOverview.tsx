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
  EuiSpacer,
  EuiPageHeader,
  EuiTitle,
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiButton,
  EuiLoadingSpinner,
  EuiFlexGrid,
} from '@elastic/eui';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  APP_PATH,
  BREADCRUMBS,
  PLUGIN_NAME,
  BASE_DOCS_LINK,
  MDS_BREADCRUMBS,
} from '../../../utils/constants';
import { SAMPLE_TYPE } from '../../../../server/utils/constants';
import { GET_SAMPLE_INDICES_QUERY } from '../../utils/constants';
import { AppState } from '../../../redux/reducers';
import { getDetectorList } from '../../../redux/reducers/ad';
import { createSampleData } from '../../../redux/reducers/sampleData';

import { getIndices, createIndex } from '../../../redux/reducers/opensearch';
import { createDetector, startDetector } from '../../../redux/reducers/ad';
import {
  sampleHttpResponses,
  sampleEcommerce,
  sampleHostHealth,
} from '../utils/constants';
import {
  containsSampleIndex,
  getDetectorId,
  getSampleDetector,
} from '../utils/helpers';
import { SampleDataBox } from '../components/SampleDataBox/SampleDataBox';
import { SampleDetailsFlyout } from '../components/SampleDetailsFlyout/SampleDetailsFlyout';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { CreateWorkflowStepDetails } from '../components/CreateWorkflowStepDetails';
import { CreateWorkflowStepSeparator } from '../components/CreateWorkflowStepSeparator';
import { DataSourceSelectableConfig } from '../../../../../../src/plugins/data_source_management/public';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
} from '../../../../public/services';
import { RouteComponentProps } from 'react-router-dom';
import queryString from 'querystring';
import { getDataSourceFromURL, getSampleDetectorsQueryParamsWithDataSouceId, isDataSourceCompatible } from '../../../../public/pages/utils/helpers';
import { MDSStates } from '../../../models/interfaces';

interface AnomalyDetectionOverviewProps extends RouteComponentProps {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
  landingDataSourceId: string | undefined;
}

export function AnomalyDetectionOverview(props: AnomalyDetectionOverviewProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const isLoadingSampleDetectors = useSelector(
    (state: AppState) => state.ad.requesting
  );
  const isLoadingSampleIndices = useSelector(
    (state: AppState) => state.opensearch.requesting
  );
  const dispatch = useDispatch();
  const visibleSampleIndices = useSelector(
    (state: AppState) => state.opensearch.indices
  );
  const allSampleDetectors = Object.values(
    useSelector((state: AppState) => state.ad.detectorList)
  );
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  const [isLoadingHttpData, setIsLoadingHttpData] = useState<boolean>(false);
  const [isLoadingEcommerceData, setIsLoadingEcommerceData] =
    useState<boolean>(false);
  const [isLoadingHostHealthData, setIsLoadingHostHealthData] =
    useState<boolean>(false);
  const [showHttpResponseDetailsFlyout, setShowHttpResponseDetailsFlyout] =
    useState<boolean>(false);
  const [showEcommerceDetailsFlyout, setShowEcommerceDetailsFlyout] =
    useState<boolean>(false);
  const [showHostHealthDetailsFlyout, setShowHostHealthDetailsFlyout] =
    useState<boolean>(false);

  const queryParams = getDataSourceFromURL(props.location);
  const [MDSOverviewState, setMDSOverviewState] = useState<MDSStates>({
    queryParams,
    selectedDataSourceId: queryParams.dataSourceId === undefined 
      ? undefined 
      : queryParams.dataSourceId,
  });

  // Set breadcrumbs on page initialization
  useEffect(() => {
    if (dataSourceEnabled) {
      core.chrome.setBreadcrumbs([MDS_BREADCRUMBS.ANOMALY_DETECTOR(MDSOverviewState.selectedDataSourceId)]);
    } else {
      core.chrome.setBreadcrumbs([BREADCRUMBS.ANOMALY_DETECTOR]);
    }
  }, []);

  // Getting all initial sample detectors & indices
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
    fetchData();
  }, [MDSOverviewState]);

  // fetch smaple detectors and sample indices
  const fetchData = async () => {
    await dispatch(
      getDetectorList(
        getSampleDetectorsQueryParamsWithDataSouceId(
          MDSOverviewState.selectedDataSourceId
        )
      )
    ).catch((error: any) => {
      console.error('Error getting sample detectors: ', error);
    });
    await dispatch(
      getIndices(
        GET_SAMPLE_INDICES_QUERY,
        MDSOverviewState.selectedDataSourceId
      )
    ).catch((error: any) => {
      console.error('Error getting sample indices: ', error);
    });
  };

  // Create and populate sample index, create and start sample detector
  const handleLoadData = async (
    sampleType: SAMPLE_TYPE,
    indexConfig: any,
    detectorConfig: any,
    setLoadingState: (isLoading: boolean) => void
  ) => {
    setLoadingState(true);
    let errorDuringAction = false;
    let errorMessage = '';

    // Create the index (if it doesn't exist yet)
    if (!containsSampleIndex(visibleSampleIndices, sampleType)) {
      await dispatch(
        createIndex(indexConfig, MDSOverviewState.selectedDataSourceId)
      ).catch((error: any) => {
        errorDuringAction = true;
        errorMessage =
          'Error creating sample index. ' + prettifyErrorMessage(error);
        console.error(errorMessage);
      });
    }

    // Get the sample data from the server and bulk insert
    if (!errorDuringAction) {
      await dispatch(
        createSampleData(sampleType, MDSOverviewState.selectedDataSourceId)
      ).catch((error: any) => {
        errorDuringAction = true;
        errorMessage = prettifyErrorMessage(error.message);
        console.error('Error bulk inserting data: ', errorMessage);
      });
    }

    // Create the detector
    if (!errorDuringAction) {
      await dispatch(
        createDetector(detectorConfig, MDSOverviewState.selectedDataSourceId)
      )
        .then(function (response: any) {
          const detectorId = response.response.id;
          // Start the detector
          dispatch(
            startDetector(detectorId, MDSOverviewState.selectedDataSourceId)
          ).catch((error: any) => {
            errorDuringAction = true;
            errorMessage = prettifyErrorMessage(error.message);
            console.error('Error starting sample detector: ', errorMessage);
          });
        })
        .catch((error: any) => {
          errorDuringAction = true;
          errorMessage = prettifyErrorMessage(error.message);
          console.error('Error creating sample detector: ', errorMessage);
        });
    }
    fetchData();
    setLoadingState(false);
    if (!errorDuringAction) {
      core.notifications.toasts.addSuccess(
        'Successfully loaded the sample detector'
      );
    } else {
      core.notifications.toasts.addDanger(
        `Unable to load all sample data, please try again. ${errorMessage}`
      );
    }
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
            dataSourceFilter: isDataSourceCompatible,
          }}
        />
      );
    }, [getSavedObjectsClient, getNotifications, props.setActionMenu]);
  }

  const createDetectorUrl =
    `${PLUGIN_NAME}#` +
    (dataSourceEnabled
      ? `${APP_PATH.CREATE_DETECTOR}?dataSourceId=${MDSOverviewState.selectedDataSourceId}`
      : `${APP_PATH.CREATE_DETECTOR}`);

  return isLoadingSampleDetectors && isLoadingSampleIndices ? (
    <div>
      <EuiLoadingSpinner size="xl" />
    </div>
  ) : (
    <Fragment>
      <EuiPageHeader>
        {dataSourceEnabled && renderDataSourceComponent}
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l" data-test-subj="overviewTitle">
              <h1>Get started</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              href={createDetectorUrl}
              data-test-subj="add_detector"
            >
              Create detector
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
      <EuiText>
        The anomaly detection plugin automatically detects anomalies in your
        data in near real-time using the Random Cut Forest (RCF) algorithm.{' '}
        <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
          Learn more
        </EuiLink>
      </EuiText>
      <EuiSpacer size="xl" />
      <ContentPanel title="How it works">
        <EuiFlexGroup>
          <CreateWorkflowStepDetails
            title="1. Define your detector"
            content="Select a data source, set the detector interval, and specify a window delay."
          />
          <CreateWorkflowStepSeparator />
          <CreateWorkflowStepDetails
            title="2. Configure your detector"
            content="Choose the fields in your index that you want to check for anomalies. You may also set a category field to see a granular view of anomalies within each entity."
          />
          <CreateWorkflowStepSeparator />
          <CreateWorkflowStepDetails
            title="3. Preview your detector"
            content="After configuring your model, preview your results with sample data to fine-tune your settings."
          />
          <CreateWorkflowStepSeparator />
          <CreateWorkflowStepDetails
            title="4. View results"
            content="Run your detector to observe results in real-time. You can also enable historical analysis to view anomalies in your data history. "
          />
        </EuiFlexGroup>
      </ContentPanel>
      <EuiSpacer size="xl" />
      <ContentPanel
        title="Start with a sample detector to learn about anomaly detection"
        subTitle={
          <EuiText style={{ marginTop: '5px' }}>
            New to anomaly detection? Get a better understanding of how it works
            by creating a detector with one of the sample datasets.
          </EuiText>
        }
        horizontalRuleClassName="hide-horizontal-rule"
      >
        <EuiFlexGrid columns={3} gutterSize="l">
          <EuiFlexItem>
            <SampleDataBox
              title="Monitor HTTP responses"
              icon={sampleHttpResponses.icon}
              description={sampleHttpResponses.description}
              loadDataButtonDescription="Create HTTP response detector"
              buttonDataTestSubj="createHttpSampleDetectorButton"
              onOpenFlyout={() => {
                setShowHttpResponseDetailsFlyout(true);
                setShowEcommerceDetailsFlyout(false);
                setShowHostHealthDetailsFlyout(false);
              }}
              onLoadData={() => {
                handleLoadData(
                  SAMPLE_TYPE.HTTP_RESPONSES,
                  sampleHttpResponses.indexConfig,
                  sampleHttpResponses.detectorConfig,
                  setIsLoadingHttpData
                );
              }}
              isLoadingData={isLoadingHttpData}
              isDataLoaded={
                getSampleDetector(
                  allSampleDetectors,
                  SAMPLE_TYPE.HTTP_RESPONSES
                ) !== undefined
              }
              detectorId={getDetectorId(
                allSampleDetectors,
                sampleHttpResponses.detectorName,
                sampleHttpResponses.legacyDetectorName
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <SampleDataBox
              title="Monitor eCommerce orders"
              icon={sampleEcommerce.icon}
              description={sampleEcommerce.description}
              loadDataButtonDescription="Create eCommerce orders detector"
              buttonDataTestSubj="createECommerceSampleDetectorButton"
              onOpenFlyout={() => {
                setShowHttpResponseDetailsFlyout(false);
                setShowEcommerceDetailsFlyout(true);
                setShowHostHealthDetailsFlyout(false);
              }}
              onLoadData={() => {
                handleLoadData(
                  SAMPLE_TYPE.ECOMMERCE,
                  sampleEcommerce.indexConfig,
                  sampleEcommerce.detectorConfig,
                  setIsLoadingEcommerceData
                );
              }}
              isLoadingData={isLoadingEcommerceData}
              isDataLoaded={
                getSampleDetector(allSampleDetectors, SAMPLE_TYPE.ECOMMERCE) !==
                undefined
              }
              detectorId={getDetectorId(
                allSampleDetectors,
                sampleEcommerce.detectorName,
                sampleEcommerce.legacyDetectorName
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <SampleDataBox
              title="Monitor host health"
              icon={sampleHostHealth.icon}
              description={sampleHostHealth.description}
              loadDataButtonDescription="Create health monitor detector"
              buttonDataTestSubj="createHostHealthSampleDetectorButton"
              onOpenFlyout={() => {
                setShowHttpResponseDetailsFlyout(false);
                setShowEcommerceDetailsFlyout(false);
                setShowHostHealthDetailsFlyout(true);
              }}
              onLoadData={() => {
                handleLoadData(
                  SAMPLE_TYPE.HOST_HEALTH,
                  sampleHostHealth.indexConfig,
                  sampleHostHealth.detectorConfig,
                  setIsLoadingHostHealthData
                );
              }}
              isLoadingData={isLoadingHostHealthData}
              isDataLoaded={
                getSampleDetector(
                  allSampleDetectors,
                  SAMPLE_TYPE.HOST_HEALTH
                ) !== undefined
              }
              detectorId={getDetectorId(
                allSampleDetectors,
                sampleHostHealth.detectorName,
                sampleHostHealth.legacyDetectorName
              )}
            />
          </EuiFlexItem>
          <EuiSpacer size="m" />
        </EuiFlexGrid>
      </ContentPanel>
      {showHttpResponseDetailsFlyout ? (
        <SampleDetailsFlyout
          title="Monitor HTTP responses"
          sampleData={sampleHttpResponses}
          detector={getSampleDetector(
            allSampleDetectors,
            SAMPLE_TYPE.HTTP_RESPONSES
          )}
          interval={1}
          onClose={() => setShowHttpResponseDetailsFlyout(false)}
        />
      ) : null}
      {showEcommerceDetailsFlyout ? (
        <SampleDetailsFlyout
          title="Monitor eCommerce orders"
          sampleData={sampleEcommerce}
          detector={getSampleDetector(
            allSampleDetectors,
            SAMPLE_TYPE.ECOMMERCE
          )}
          interval={1}
          onClose={() => setShowEcommerceDetailsFlyout(false)}
        />
      ) : null}
      {showHostHealthDetailsFlyout ? (
        <SampleDetailsFlyout
          title="Monitor host health"
          sampleData={sampleHostHealth}
          detector={getSampleDetector(
            allSampleDetectors,
            SAMPLE_TYPE.HOST_HEALTH
          )}
          interval={1}
          onClose={() => setShowHostHealthDetailsFlyout(false)}
        />
      ) : null}
    </Fragment>
  );
}
