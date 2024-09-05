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
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { FormikProps, Formik } from 'formik';
import { get, isEmpty } from 'lodash';
import React, { Fragment, useState, useEffect, ReactElement } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps, useLocation } from 'react-router-dom';
import { AppState } from '../../../redux/reducers';
import { getMappings } from '../../../redux/reducers/opensearch';
import { useFetchDetectorInfo } from '../../CreateDetectorSteps/hooks/useFetchDetectorInfo';
import {
  BREADCRUMBS,
  BASE_DOCS_LINK,
  MDS_BREADCRUMBS,
} from '../../../utils/constants';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import { updateDetector } from '../../../redux/reducers/ad';
import {
  validateFeatures,
  focusOnFirstWrongFeature,
  getCategoryFields,
  focusOnCategoryField,
  modelConfigurationToFormik,
  focusOnImputationOption,
  focusOnSuppressionRules,
} from '../utils/helpers';
import { formikToDetector } from '../../ReviewAndCreate/utils/helpers';
import { formikToModelConfiguration } from '../utils/helpers';
import { Features } from '../components/Features';
import { CategoryField } from '../components/CategoryField';
import { AdvancedSettings } from '../components/AdvancedSettings';
import { SampleAnomalies } from './SampleAnomalies';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { Detector } from '../../../models/interfaces';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { DetectorDefinitionFormikValues } from '../../DefineDetector/models/interfaces';
import {
  ModelConfigurationFormikValues,
  FeaturesFormikValues,
  RuleFormikValues
} from '../models/interfaces';
import { CreateDetectorFormikValues } from '../../CreateDetectorSteps/models/interfaces';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { getErrorMessage } from '../../../utils/utils';
import {
  constructHrefWithDataSourceId,
  getDataSourceFromURL,
} from '../../../pages/utils/helpers';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
} from '../../../services';
import { DataSourceViewConfig } from '../../../../../../src/plugins/data_source_management/public';
import { SparseDataOptionValue } from '../utils/constants';

interface ConfigureModelRouterProps {
  detectorId?: string;
}

interface ConfigureModelProps
  extends RouteComponentProps<ConfigureModelRouterProps> {
  isEdit: boolean;
  setStep?(stepNumber: number): void;
  initialValues?: ModelConfigurationFormikValues;
  setInitialValues?(initialValues: ModelConfigurationFormikValues): void;
  detectorDefinitionValues?: DetectorDefinitionFormikValues;
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

export function ConfigureModel(props: ConfigureModelProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  const dataSourceId = MDSQueryParams.dataSourceId;

  useHideSideNavBar(true, false);
  const detectorId = get(props, 'match.params.detectorId', '');
  const { detector, hasError } = useFetchDetectorInfo(detectorId, dataSourceId);
  const indexDataTypes = useSelector(
    (state: AppState) => state.opensearch.dataTypes
  );
  const [isHCDetector, setIsHCDetector] = useState<boolean>(
    props.initialValues ? props.initialValues.categoryFieldEnabled : false
  );
  const isLoading = useSelector(
    (state: AppState) => state.opensearch.requesting
  );

  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);
  }, []);

  // When detector is loaded: get any category fields (if applicable) and
  // get all index mappings based on detector's selected index
  useEffect(() => {
    if (detector && get(detector, 'categoryField', []).length > 0) {
      setIsHCDetector(true);
    }
    if (detector?.indices) {
      dispatch(getMappings(detector.indices, dataSourceId));
    }
  }, [detector]);

  useEffect(() => {
    if (dataSourceEnabled) {
      if (props.isEdit) {
        core.chrome.setBreadcrumbs([
          MDS_BREADCRUMBS.ANOMALY_DETECTOR(dataSourceId),
          MDS_BREADCRUMBS.DETECTORS(dataSourceId),
          {
            text: detector && detector.name ? detector.name : '',
            href: constructHrefWithDataSourceId(
              `#/detectors/${detectorId}`,
              dataSourceId,
              false
            ),
          },
          MDS_BREADCRUMBS.EDIT_MODEL_CONFIGURATION,
        ]);
      } else {
        core.chrome.setBreadcrumbs([
          MDS_BREADCRUMBS.ANOMALY_DETECTOR(dataSourceId),
          MDS_BREADCRUMBS.DETECTORS(dataSourceId),
          MDS_BREADCRUMBS.CREATE_DETECTOR,
        ]);
      }
    } else {
      if (props.isEdit) {
        core.chrome.setBreadcrumbs([
          BREADCRUMBS.ANOMALY_DETECTOR,
          BREADCRUMBS.DETECTORS,
          {
            text: detector && detector.name ? detector.name : '',
            href: `#/detectors/${detectorId}`,
          },
          BREADCRUMBS.EDIT_MODEL_CONFIGURATION,
        ]);
      } else {
        core.chrome.setBreadcrumbs([
          BREADCRUMBS.ANOMALY_DETECTOR,
          BREADCRUMBS.DETECTORS,
          BREADCRUMBS.CREATE_DETECTOR,
        ]);
      }
    }
  }, [detector]);

  useEffect(() => {
    if (hasError) {
      if (dataSourceEnabled) {
        props.history.push(
          constructHrefWithDataSourceId('/detectors', dataSourceId, false)
        );
      } else {
        props.history.push('/detectors');
      }
    }
  }, [hasError]);

  const validateImputationOption = (
    formikValues: ModelConfigurationFormikValues,
    errors: any
  ) => {
    const imputationOption = get(formikValues, 'imputationOption', null);

    // Initialize an array to hold individual error messages
    const customValueErrors: string[] = [];

    // Validate imputationOption when method is CUSTOM_VALUE
    if (imputationOption && imputationOption.imputationMethod === SparseDataOptionValue.CUSTOM_VALUE) {
      const enabledFeatures = formikValues.featureList.filter(
        (feature: FeaturesFormikValues) => feature.featureEnabled
      );

      // Validate that the number of custom values matches the number of enabled features
      if ((imputationOption.custom_value || []).length !== enabledFeatures.length) {
        customValueErrors.push(
          `The number of custom values (${(imputationOption.custom_value || []).length}) does not match the number of enabled features (${enabledFeatures.length}).`
        );
      }

      // Validate that each enabled feature has a corresponding custom value
      const missingFeatures = enabledFeatures
        .map((feature: FeaturesFormikValues) => feature.featureName)
        .filter(
          (name: string | undefined) =>
            !imputationOption.custom_value?.some((cv) => cv.featureName === name)
        );

      if (missingFeatures.length > 0) {
        customValueErrors.push(
          `The following enabled features are missing in custom values: ${missingFeatures.join(', ')}.`
        );
      }

      // If there are any custom value errors, join them into a single string with proper formatting
      if (customValueErrors.length > 0) {
        errors.custom_value = customValueErrors.join(' ');
      }
    }
  };

  const validateRules = (
    formikValues: ModelConfigurationFormikValues,
    errors: any
  ) => {
    const rules = formikValues.suppressionRules || [];

  // Initialize an array to hold individual error messages
  const featureNameErrors: string[] = [];

  // List of enabled features
  const enabledFeatures = formikValues.featureList
    .filter((feature: FeaturesFormikValues) => feature.featureEnabled)
    .map((feature: FeaturesFormikValues) => feature.featureName);

  // Validate that each featureName in suppressionRules exists in enabledFeatures
  rules.forEach((rule: RuleFormikValues) => {
    if (!enabledFeatures.includes(rule.featureName)) {
      featureNameErrors.push(
        `Feature "${rule.featureName}" in suppression rules does not exist or is not enabled in the feature list.`
      );
    }
  });

      // If there are any custom value errors, join them into a single string with proper formatting
      if (featureNameErrors.length > 0) {
        errors.suppressionRules = featureNameErrors.join(' ');
      }
  };

  const handleFormValidation = async (
    formikProps: FormikProps<ModelConfigurationFormikValues>
  ) => {
    if (props.isEdit && detector.curState === DETECTOR_STATE.RUNNING) {
      core.notifications.toasts.addDanger(
        'Detector cannot be updated while it is running'
      );
    } else {
      formikProps.setSubmitting(true);
      formikProps.setFieldTouched('featureList');
      formikProps.setFieldTouched('categoryField', isHCDetector);
      formikProps.setFieldTouched('shingleSize');
      formikProps.setFieldTouched('imputationOption');
      formikProps.setFieldTouched('suppressionRules');

      formikProps.validateForm().then((errors) => {
        // Call the extracted validation method
        validateImputationOption(formikProps.values, errors);
        validateRules(formikProps.values, errors);

        if (isEmpty(errors)) {
          if (props.isEdit) {
            // TODO: possibly add logic to also start RT and/or historical from here. Need to think
            // about adding similar logic from edit detector definition page
            const detectorToUpdate = formikToModelConfiguration(
              formikProps.values,
              detector
            );
            handleUpdateDetector(detectorToUpdate);
          } else {
            optionallySaveValues({
              ...formikProps.values,
              categoryFieldEnabled: isHCDetector,
            });
            //@ts-ignore
            props.setStep(3);
          }
        } else {
          const customValueError = get(errors, 'custom_value')
          if (customValueError) {
            core.notifications.toasts.addDanger(
              customValueError
            );
            focusOnImputationOption();
            return;
          }

          const ruleValueError = get(errors, 'suppressionRules')
          if (ruleValueError) {
            core.notifications.toasts.addDanger(
              ruleValueError
            );
            focusOnSuppressionRules();
            return;
          }

          // TODO: can add focus to all components or possibly customize error message too
          if (get(errors, 'featureList')) {
            focusOnFirstWrongFeature(errors, formikProps.setFieldTouched);
          } else if (get(errors, 'categoryField')) {
            focusOnCategoryField();
          } else {
            console.log(`unexpected error ${JSON.stringify(errors)}`);
          }

          core.notifications.toasts.addDanger(
            'One or more input fields is invalid'
          );
        }
      });
    }
    formikProps.setSubmitting(false);
  };

  const handleUpdateDetector = async (detectorToUpdate: Detector) => {
    dispatch(updateDetector(detectorId, detectorToUpdate, dataSourceId))
      .then((response: any) => {
        core.notifications.toasts.addSuccess(
          `Detector updated: ${response.response.name}`
        );
        props.history.push(
          constructHrefWithDataSourceId(
            `/detectors/${detectorId}/configurations/`,
            dataSourceId,
            false
          )
        );
      })
      .catch((err: any) => {
        core.notifications.toasts.addDanger(
          prettifyErrorMessage(
            getErrorMessage(err, 'There was a problem updating the detector')
          )
        );
      });
  };

  const optionallySaveValues = (values: ModelConfigurationFormikValues) => {
    if (props.setInitialValues) {
      props.setInitialValues(values);
    }
  };

  const detectorToCreate = props.isEdit
    ? detector
    : formikToDetector({
        ...props.detectorDefinitionValues,
        ...props.initialValues,
      } as CreateDetectorFormikValues);

  let renderDataSourceComponent: ReactElement | null = null;
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
    <Formik
      initialValues={
        props.initialValues
          ? props.initialValues
          : modelConfigurationToFormik(detector)
      }
      enableReinitialize={true}
      onSubmit={() => {}}
      validateOnMount={props.isEdit ? false : true}
      validate={validateFeatures}
    >
      {(formikProps) => (
        <Fragment>
          {dataSourceEnabled && renderDataSourceComponent}
          <EuiPage
            style={{
              marginTop: '-24px',
            }}
          >
            <EuiPageBody>
              <EuiPageHeader>
                <EuiPageHeaderSection>
                  <EuiText
                    size="s"
                    data-test-subj="configureOrEditModelConfigurationTitle"
                  >
                    <h1>
                      {props.isEdit
                        ? 'Edit model configuration'
                        : 'Configure model'}{' '}
                    </h1>
                  </EuiText>
                  <Fragment>
                    <EuiSpacer size="s" />
                    <EuiText size="s">
                      Set the index fields that you want to find anomalies for
                      by defining the model features. You can also set other
                      model parameters such as category field and shingle size
                      for more granular views. After you set the model features
                      and other optional parameters, you can preview your
                      anomalies from a sample feature output.{' '}
                      <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
                        Learn more
                      </EuiLink>
                    </EuiText>
                    <EuiSpacer size="s" />
                  </Fragment>
                </EuiPageHeaderSection>
              </EuiPageHeader>
              <Features detector={detector} formikProps={formikProps} />
              <EuiSpacer />
              <CategoryField
                isEdit={props.isEdit}
                isHCDetector={isHCDetector}
                categoryFieldOptions={getCategoryFields(indexDataTypes)}
                setIsHCDetector={setIsHCDetector}
                isLoading={isLoading}
                formikProps={formikProps}
              />
              <EuiSpacer />
              <AdvancedSettings />
              {!isEmpty(detectorToCreate) ? <EuiSpacer /> : null}
              {!isEmpty(detectorToCreate) ? (
                <SampleAnomalies
                  detector={detectorToCreate}
                  featureList={formikProps.values.featureList}
                  shingleSize={formikProps.values.shingleSize}
                  categoryFields={formikProps.values.categoryField}
                  errors={formikProps.errors}
                  setFieldTouched={formikProps.setFieldTouched}
                />
              ) : null}
            </EuiPageBody>
          </EuiPage>

          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            style={{ marginRight: '12px' }}
          >
            <EuiFlexItem grow={false}>
              <EuiSmallButtonEmpty
                onClick={() => {
                  if (props.isEdit) {
                    props.history.push(
                      constructHrefWithDataSourceId(
                        `/detectors/${detectorId}/configurations/`,
                        dataSourceId,
                        false
                      )
                    );
                  } else {
                    props.history.push(
                      constructHrefWithDataSourceId(
                        '/detectors',
                        dataSourceId,
                        false
                      )
                    );
                  }
                }}
              >
                Cancel
              </EuiSmallButtonEmpty>
            </EuiFlexItem>
            {props.isEdit ? null : (
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  iconSide="left"
                  iconType="arrowLeft"
                  fill={false}
                  data-test-subj="configureModelPreviousButton"
                  //@ts-ignore
                  onClick={() => {
                    optionallySaveValues({
                      ...formikProps.values,
                      categoryFieldEnabled: isHCDetector,
                    });
                    //@ts-ignore
                    props.setStep(1);
                  }}
                >
                  Previous
                </EuiSmallButton>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              {props.isEdit ? (
                <EuiSmallButton
                  type="submit"
                  fill={true}
                  data-test-subj="updateDetectorButton"
                  //@ts-ignore
                  onClick={() => {
                    handleFormValidation(formikProps);
                  }}
                >
                  Save changes
                </EuiSmallButton>
              ) : (
                <EuiSmallButton
                  type="submit"
                  iconSide="right"
                  iconType="arrowRight"
                  fill={true}
                  data-test-subj="configureModelNextButton"
                  isLoading={formikProps.isSubmitting}
                  //@ts-ignore
                  onClick={() => {
                    handleFormValidation(formikProps);
                  }}
                >
                  Next
                </EuiSmallButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )}
    </Formik>
  );
}
