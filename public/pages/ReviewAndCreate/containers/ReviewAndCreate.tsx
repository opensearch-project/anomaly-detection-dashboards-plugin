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
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPage,
  EuiButton,
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import {
  createDetector,
  getDetectorCount,
  startDetector,
  startHistoricalDetector,
  validateDetector
} from '../../../redux/reducers/ad';
import { Formik, FormikHelpers } from 'formik';
import { get } from 'lodash';
import React, { Fragment, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../../redux/reducers';
import { BREADCRUMBS, MAX_DETECTORS } from '../../../utils/constants';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import { CoreStart } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { CreateDetectorFormikValues } from '../../CreateDetectorSteps/models/interfaces';
import { DetectorDefinitionFields } from '../components/DetectorDefinitionFields';
import { ModelConfigurationFields } from '../components/ModelConfigurationFields';
import { formikToDetector } from '../utils/helpers';
import {
  getErrorMessage,
  convertTimestampToNumber,
} from '../../../utils/utils';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { DetectorScheduleFields } from '../components/DetectorScheduleFields';
import { validationFeatureResponse, validationSettingResponse, VALIDATION_ISSUE_TYPES } from '../../../models/interfaces'

interface ReviewAndCreateProps extends RouteComponentProps {
  setStep(stepNumber: number): void;
  values: CreateDetectorFormikValues;
}





export function ReviewAndCreate(props: ReviewAndCreateProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  useHideSideNavBar(true, false);

  const [validDetectorSettings, setValidDetectorSettings] = useState(false);
  const [validModelConfigurations, setValidModelConfigurations] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [settingsResponse, setDetectorMessageResponse] = useState<validationSettingResponse>({} as validationSettingResponse);
  const [featureResponse, setFeatureResponse] = useState<validationFeatureResponse>({} as validationFeatureResponse);
  const isLoading = useSelector(
    (state: AppState) => state.ad.requesting
  );

  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);

  }, []);

  useEffect(() => {
    dispatch(validateDetector(formikToDetector(props.values)))
      .then((resp: any) => {
        if (!Object.keys(resp.response).length) {
          setValidDetectorSettings(true);
          setValidModelConfigurations(true);
        } else {
          if (resp.response.hasOwnProperty('detector')) {
            const issueType = Object.keys(resp.response.detector)[0];
            if (resp.response.detector[issueType].hasOwnProperty('message')) {
              const validationMessage = resp.response.detector[issueType].message;
              const detectorSettingIssue: validationSettingResponse = {
                issueType: issueType,
                message: validationMessage
              }
              switch (issueType) {
                case VALIDATION_ISSUE_TYPES.FEATURE_ATTRIBUTES:
                  const featureResp = resp.response.detector.feature_attributes as validationFeatureResponse;
                  setFeatureResponse(featureResp)
                  setValidDetectorSettings(true);
                  setValidModelConfigurations(false);
                  break;
                // case VALIDATION_ISSUE_TYPES.CATEGORY:
                //   break;
                // case VALIDATION_ISSUE_TYPES.SHINGLE_SIZE_FIELD:
                //   break;
                case VALIDATION_ISSUE_TYPES.PARSING_ISSUE:
                  detectorSettingIssue.message = "Custom query error: " + detectorSettingIssue.message;
                  setValidModelConfigurations(true);
                  setValidDetectorSettings(false);
                  setDetectorMessageResponse(detectorSettingIssue)
                  break;
                // this includes all other detector setting issues that don't need
                // anything else added to their message
                default:
                  setValidModelConfigurations(true);
                  setValidDetectorSettings(false);
                  setDetectorMessageResponse(detectorSettingIssue)
              }
            }
          }
        }
      })
      .catch((err: any) => {
        setValidationError(true);
        core.notifications.toasts.addDanger(
          prettifyErrorMessage(
            getErrorMessage(
              err,
              'There was a problem validating the detector'
            )
          )
        );
      });
  }, []); // <-- Have to pass in [] here!



  useEffect(() => {
    core.chrome.setBreadcrumbs([
      BREADCRUMBS.ANOMALY_DETECTOR,
      BREADCRUMBS.DETECTORS,
      BREADCRUMBS.CREATE_DETECTOR,
    ]);
  }, []);

  const handleSubmit = async (
    values: CreateDetectorFormikValues,
    formikHelpers: FormikHelpers<CreateDetectorFormikValues>
  ) => {
    try {
      formikHelpers.setSubmitting(true);
      const detectorToCreate = formikToDetector(values);
      dispatch(createDetector(detectorToCreate))
        .then((response: any) => {
          core.notifications.toasts.addSuccess(
            `Detector created: ${detectorToCreate.name}`
          );
          // Optionally start RT job
          if (get(props, 'values.realTime', true)) {
            dispatch(startDetector(response.response.id))
              .then((response: any) => {
                core.notifications.toasts.addSuccess(
                  `Successfully started the real-time detector`
                );
              })
              .catch((err: any) => {
                core.notifications.toasts.addDanger(
                  prettifyErrorMessage(
                    getErrorMessage(
                      err,
                      'There was a problem starting the real-time detector'
                    )
                  )
                );
              });
          }

          // Optionally start historical job
          if (get(props, 'values.historical', false)) {
            const startTime = convertTimestampToNumber(
              get(props, 'values.startTime')
            );
            const endTime = convertTimestampToNumber(
              get(props, 'values.endTime')
            );
            dispatch(
              //@ts-ignore
              startHistoricalDetector(response.response.id, startTime, endTime)
            )
              .then((response: any) => {
                core.notifications.toasts.addSuccess(
                  `Successfully started the historical analysis`
                );
              })
              .catch((err: any) => {
                core.notifications.toasts.addDanger(
                  prettifyErrorMessage(
                    getErrorMessage(
                      err,
                      'There was a problem starting the historical analysis'
                    )
                  )
                );
              });
          }

          props.history.push(
            `/detectors/${response.response.id}/configurations/`
          );
        })
        .catch((err: any) => {
          dispatch(getDetectorCount()).then((response: any) => {
            const totalDetectors = get(response, 'response.count', 0);
            if (totalDetectors === MAX_DETECTORS) {
              core.notifications.toasts.addDanger(
                'Cannot create detector - limit of ' +
                MAX_DETECTORS +
                ' detectors reached'
              );
            } else {
              core.notifications.toasts.addDanger(
                prettifyErrorMessage(
                  getErrorMessage(
                    err,
                    'There was a problem creating the detector'
                  )
                )
              );
            }
          });
        });
    } catch (e) {
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  // Converting to detector for passing to the fields
  const detectorToCreate = formikToDetector(props.values);

  return (
    <Formik
      initialValues={props.values}
      onSubmit={handleSubmit}
      validateOnMount={true}
    >
      {(formikProps) => (
        <Fragment>
          <EuiPage
            style={{
              marginTop: '-24px',
            }}
          >
            <EuiPageBody>
              <EuiPageHeader>
                <EuiPageHeaderSection>
                  <EuiTitle size="l">
                    <h1>Review and create </h1>
                  </EuiTitle>
                </EuiPageHeaderSection>
              </EuiPageHeader>

              <DetectorDefinitionFields
                validationError={validationError}
                validDetectorSettings={validDetectorSettings}
                validationResponse={settingsResponse}
                onEditDetectorDefinition={() => props.setStep(1)}
                detector={detectorToCreate}
                isCreate={true}
                isLoading={isLoading}
              />
              <EuiSpacer />
              <ModelConfigurationFields
                detector={detectorToCreate}
                onEditModelConfiguration={() => props.setStep(2)}
                validationFeatureResponse={featureResponse}
                validModel={validModelConfigurations}
                validationError={validationError}
                isLoading={isLoading}
              />
              <EuiSpacer />
              <DetectorScheduleFields
                onEditDetectorSchedule={() => props.setStep(3)}
                values={props.values}
              />
            </EuiPageBody>
          </EuiPage>

          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            style={{ marginRight: '12px' }}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => {
                  props.history.push('/detectors');
                }}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconSide="left"
                iconType="arrowLeft"
                fill={false}
                data-test-subj="reviewAndCreatePreviousButton"
                //@ts-ignore
                onClick={() => {
                  props.setStep(3);
                }}
              >
                Previous
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                fill={true}
                data-test-subj="createDetectorButton"
                isLoading={formikProps.isSubmitting}
                //@ts-ignore
                onClick={formikProps.handleSubmit}
              >
                Create detector
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )}
    </Formik>
  );
}
