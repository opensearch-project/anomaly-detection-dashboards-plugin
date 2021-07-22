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

/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import {
  EuiSpacer,
  EuiPageHeader,
  EuiTitle,
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiIcon,
  EuiButton,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  APP_PATH,
  BREADCRUMBS,
  PLUGIN_NAME,
  BASE_DOCS_LINK,
} from '../../../utils/constants';
import { SAMPLE_TYPE } from '../../../../server/utils/constants';
import {
  GET_SAMPLE_DETECTORS_QUERY_PARAMS,
  GET_SAMPLE_INDICES_QUERY,
} from '../../utils/constants';
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
import { CoreStart } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { CreateWorkflowStepDetails } from '../components/CreateWorkflowStepDetails';
import { CreateWorkflowStepSeparator } from '../components/CreateWorkflowStepSeparator';

interface AnomalyDetectionOverviewProps {
  isLoadingDetectors: boolean;
}

export function AnomalyDetectionOverview(props: AnomalyDetectionOverviewProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const visibleSampleIndices = useSelector(
    (state: AppState) => state.opensearch.indices
  );

  const allSampleDetectors = Object.values(
    useSelector((state: AppState) => state.ad.detectorList)
  );

  const [isLoadingHttpData, setIsLoadingHttpData] = useState<boolean>(false);
  const [isLoadingEcommerceData, setIsLoadingEcommerceData] = useState<boolean>(
    false
  );
  const [isLoadingHostHealthData, setIsLoadingHostHealthData] = useState<
    boolean
  >(false);
  const [
    showHttpResponseDetailsFlyout,
    setShowHttpResponseDetailsFlyout,
  ] = useState<boolean>(false);
  const [showEcommerceDetailsFlyout, setShowEcommerceDetailsFlyout] = useState<
    boolean
  >(false);
  const [
    showHostHealthDetailsFlyout,
    setShowHostHealthDetailsFlyout,
  ] = useState<boolean>(false);

  const getAllSampleDetectors = async () => {
    await dispatch(getDetectorList(GET_SAMPLE_DETECTORS_QUERY_PARAMS)).catch(
      (error: any) => {
        console.error('Error getting all detectors: ', error);
      }
    );
  };

  const getAllSampleIndices = async () => {
    await dispatch(getIndices(GET_SAMPLE_INDICES_QUERY)).catch((error: any) => {
      console.error('Error getting all indices: ', error);
    });
  };

  // Set breadcrumbs on page initialization
  useEffect(() => {
    core.chrome.setBreadcrumbs([BREADCRUMBS.ANOMALY_DETECTOR]);
  }, []);

  // Getting all initial sample detectors & indices
  useEffect(() => {
    getAllSampleDetectors();
    getAllSampleIndices();
  }, []);

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
      await dispatch(createIndex(indexConfig)).catch((error: any) => {
        errorDuringAction = true;
        errorMessage =
          'Error creating sample index. ' + prettifyErrorMessage(error);
        console.error(errorMessage);
      });
    }

    // Get the sample data from the server and bulk insert
    if (!errorDuringAction) {
      await dispatch(createSampleData(sampleType)).catch((error: any) => {
        errorDuringAction = true;
        errorMessage = prettifyErrorMessage(error.message);
        console.error('Error bulk inserting data: ', errorMessage);
      });
    }

    // Create the detector
    if (!errorDuringAction) {
      await dispatch(createDetector(detectorConfig))
        .then(function (response: any) {
          const detectorId = response.response.id;
          // Start the detector
          dispatch(startDetector(detectorId)).catch((error: any) => {
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

    getAllSampleDetectors();
    getAllSampleIndices();
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

  return props.isLoadingDetectors ? (
    <div>
      <EuiLoadingSpinner size="xl" />
    </div>
  ) : (
    <Fragment>
      <EuiPageHeader>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>Anomaly detection</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              href={`${PLUGIN_NAME}#${APP_PATH.CREATE_DETECTOR_STEPS}`}
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
          Learn more <EuiIcon size="s" type="popout" />
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
            content="Choose the fields in your index that you want to check for anomalies.
             You may also set a category field to see a granular view of anomalies within each entity."
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
        <EuiFlexGroup direction="row" gutterSize="l">
          <EuiFlexItem>
            <SampleDataBox
              title="Monitor HTTP responses"
              icon={sampleHttpResponses.icon}
              description={sampleHttpResponses.description}
              loadDataButtonDescription="Create HTTP response detector"
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
        </EuiFlexGroup>
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
