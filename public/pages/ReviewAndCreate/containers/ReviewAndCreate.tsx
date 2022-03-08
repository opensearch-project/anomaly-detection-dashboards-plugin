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
} from '@elastic/eui';
import {
  createDetector,
  getDetectorCount,
  startDetector,
  startHistoricalDetector,
  validateDetector,
} from '../../../redux/reducers/ad';
import { Formik, FormikHelpers } from 'formik';
import { get, isEmpty } from 'lodash';
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
import {
  ValidationModelResponse,
  ValidationSettingResponse,
  VALIDATION_ISSUE_TYPES,
} from '../../../models/interfaces';

interface ReviewAndCreateProps extends RouteComponentProps {
  setStep(stepNumber: number): void;
  values: CreateDetectorFormikValues;
}

export function ReviewAndCreate(props: ReviewAndCreateProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  useHideSideNavBar(true, false);

  // This variable indicates if validate API declared detector settings as valid for AD creation
  const [validDetectorSettings, setValidDetectorSettings] =
    useState<boolean>(false);
  // This variable indicates if validate API declared model configs as valid for AD creation
  const [validModelConfigurations, setValidModelConfigurations] =
    useState<boolean>(false);
  // This variable indicates if validate API returned an exception and hence no callout regarding
  // specifically detector or model configs
  const [validationError, setValidationError] = useState<boolean>(false);
  const [settingsResponse, setDetectorMessageResponse] =
    useState<ValidationSettingResponse>({} as ValidationSettingResponse);
  const [featureResponse, setFeatureResponse] =
    useState<ValidationModelResponse>({} as ValidationModelResponse);
  const [isCreatingDetector, setIsCreatingDetector] = useState<boolean>(false);
  const isLoading = useSelector((state: AppState) => state.ad.requesting);

  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);
  }, []);

  // This hook only gets called once as the page is rendered, sending a request to
  // AD validation API with the detector values. This will either return an empty response
  // meaning validation has passed and succesful callout will display or validation has failed
  // and callouts displaying what the issue is will be displayed instead.
  useEffect(() => {
    dispatch(validateDetector(formikToDetector(props.values), 'model'))
      .then((resp: any) => {
        if (isEmpty(Object.keys(resp.response))) {
          setValidDetectorSettings(true);
          setValidModelConfigurations(true);
        } else {
          if (
            resp.response.hasOwnProperty('detector') ||
            resp.response.hasOwnProperty('model')
          ) {
            const validationType = Object.keys(resp.response)[0];
            const issueType = Object.keys(resp.response[validationType])[0];
            if (
              resp.response[validationType][issueType].hasOwnProperty('message')
            ) {
              const validationMessage =
                resp.response[validationType][issueType].message;
              const detectorSettingIssue: ValidationSettingResponse = {
                issueType: issueType,
                message: validationMessage,
                validationType: validationType,
              };

              // These issue types only come up during non-blocker validation after blocker validation has passed
              // This means that the configurations don't have any blocking issues but request either timed out during
              // non blocking validation or due to an issue in core. This means we aren't able to provide any recommendation
              // and user has no way of re-trying except re-rendering page which isn't straightforward. At the moment we will
              // hide these failures instead of explaining both levels of validation being done in the backend.
              if (issueType == 'aggregation' || issueType == 'timeout') {
                setValidDetectorSettings(true);
                setValidModelConfigurations(true);
                return;
              }

              switch (issueType) {
                // need to handle model validation issue case seperatly
                case VALIDATION_ISSUE_TYPES.FEATURE_ATTRIBUTES:
                case VALIDATION_ISSUE_TYPES.CATEGORY:
                case VALIDATION_ISSUE_TYPES.SHINGLE_SIZE_FIELD:
                  const modelResp = resp.response[validationType][
                    issueType
                  ] as ValidationModelResponse;
                  modelResp.validationType = validationType;
                  setFeatureResponse(modelResp);
                  setValidDetectorSettings(true);
                  setValidModelConfigurations(false);
                  break;
                // this includes all other detector setting issues that don't need
                // anything else added to their message
                default:
                  setValidModelConfigurations(true);
                  setValidDetectorSettings(false);
                  setDetectorMessageResponse(detectorSettingIssue);
              }
            }
          }
        }
      })
      .catch((err: any) => {
        setValidationError(true);
        core.notifications.toasts.addDanger(
          prettifyErrorMessage(
            getErrorMessage(err, 'There was a problem validating the detector')
          )
        );
      });
  }, []);

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
      setIsCreatingDetector(true);
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
                  <EuiTitle size="l" data-test-subj="reviewAndCreateTitle">
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
                isCreatingDetector={isCreatingDetector}
              />
              <EuiSpacer />
              <ModelConfigurationFields
                detector={detectorToCreate}
                onEditModelConfiguration={() => props.setStep(2)}
                validationFeatureResponse={featureResponse}
                validModel={validModelConfigurations}
                validationError={validationError}
                isLoading={isLoading}
                isCreatingDetector={isCreatingDetector}
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
