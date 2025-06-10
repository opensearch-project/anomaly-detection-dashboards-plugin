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
  EuiFlexItem,
  EuiFlexGroup,
  EuiPage,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiBottomBar,
} from '@elastic/eui';
import { Formik, FormikHelpers } from 'formik';
import { get, isEmpty } from 'lodash';
import React, { Fragment, useState, useEffect, ReactElement, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { RouteComponentProps, useLocation } from 'react-router-dom';
import { useFetchForecasterInfo } from '../../CreateForecasterSteps/hooks/useFetchForecasterInfo';
import {
  BREADCRUMBS,
  MDS_BREADCRUMBS,
  FORECASTER_INSUFFICIENT_DATA_MESSAGE,
  FORECASTER_VALIDATION_ERROR_MESSAGE,
  FORECASTER_EMPTY_DATA_IDENTIFIER,
} from '../../../utils/constants';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import { suggestForecaster, updateForecaster, createForecaster, getForecasterCount, testForecaster, getForecaster } from '../../../redux/reducers/forecast';
import {
  modelConfigurationToFormik,
  focusOnImputationOption,
} from '../utils/helpers';
import { formikToModelConfiguration } from '../utils/helpers';
import { AdvancedSettings } from '../components/AdvancedSettings';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import {
  ModelConfigurationFormikValues,
} from '../models/interfaces';
import { isActiveState, MAX_FORECASTER } from '../../../../server/utils/constants';
import { getErrorMessage } from '../../../utils/utils';
import {
  constructHrefWithDataSourceId,
  getDataSourceFromURL,
} from '../../utils/helpers';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
} from '../../../services';
import { DataSourceViewConfig } from '../../../../../../src/plugins/data_source_management/public';
import { SparseDataOptionValue } from '../utils/constants';
import { Settings } from '../components/Settings';
import { ForecasterDefinitionFormikValues } from '../../DefineForecaster/models/interfaces';
import { StorageSettings } from '../components/StorageSettings';
import { formikToForecaster, formikToForecasterDefinition } from '../../ReviewAndCreate/utils/helpers';
import { SuggestParametersDialog } from '../components/SuggestParametersDialog/SuggestParametersDialog';
import { ValidationCallout } from '../components/ValidationCallout/ValidationCallout';
import { DEFAULT_SHINGLE_SIZE, DEFAULT_OUTPUT_AFTER } from '../../../utils/constants'


interface ConfigureForecastModelRouterProps {
  forecasterId?: string;
}

interface ConfigureForecastModelProps
  extends RouteComponentProps<ConfigureForecastModelRouterProps> {
  setStep?(stepNumber: number): void;
  initialValues?: ModelConfigurationFormikValues;
  setInitialValues?(initialValues: ModelConfigurationFormikValues): void;
  forecasterDefinitionValues: ForecasterDefinitionFormikValues;
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

export function ConfigureForecastModel(props: ConfigureForecastModelProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  const dataSourceId = MDSQueryParams.dataSourceId;

  useHideSideNavBar(true, false);
  const forecasterId = get(props, 'match.params.forecasterId', '');
  const { forecaster, hasError } = useFetchForecasterInfo(forecasterId, dataSourceId)

  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);
  }, []);

  useEffect(() => {
    if (dataSourceEnabled) {
        core.chrome.setBreadcrumbs([
          MDS_BREADCRUMBS.FORECASTING(dataSourceId),
          MDS_BREADCRUMBS.CREATE_FORECASTER,
        ]);
    } else {
        core.chrome.setBreadcrumbs([
          BREADCRUMBS.FORECASTING,
          BREADCRUMBS.CREATE_FORECASTER,
        ]);
    }
  }, [forecaster]);

  // If there's an error fetching the forecaster while editing a forecaster
  // (e.g., forecaster doesn't exist), redirect to the forecaster list page
  useEffect(() => {
    if (hasError) {
      if (dataSourceEnabled) {
        props.history.push(
          constructHrefWithDataSourceId('/forecasters', dataSourceId, false)
        );
      } else {
        props.history.push('/forecasters');
      }
    }
  }, [hasError]);

  // This variable indicates if validate API declared forecaster definition settings as valid
  const [forecasterDefinitionMessageResponse, setForecasterDefinitionMessageResponse] =
    useState<string>('');

  // This hook only gets called once as the page is rendered, sending a request to
  // Forecast suggest API with the forecast values. This will either return suggest
  // parameters or suggest has failed and callouts displaying what the issue is
  // will be displayed instead.
  useEffect(() => {
    if (!props.forecasterDefinitionValues) {
      return; // Early return if no values
    }

    // When suggest API fails to find an interval, it throws a runtime exception with message:
    // {"error":{"root_cause":[{"type":"runtime_exception","reason":"Fail to suggest parameters for null Exceptions: [Empty data. Cannot find a good interval.]"}],"type":"runtime_exception","reason":"Fail to suggest parameters for null Exceptions: [Empty data. Cannot find a good interval.]"},"status":500}
    dispatch(
      suggestForecaster(
        formikToForecasterDefinition(props.forecasterDefinitionValues),
        'forecast_interval',
        dataSourceId
      )
    )
      .then((resp: any) => {
        if (isEmpty(Object.keys(resp.response)) || !resp.response.hasOwnProperty('interval')) {
          setForecasterDefinitionMessageResponse(FORECASTER_INSUFFICIENT_DATA_MESSAGE);
        }
      })
      .catch((err: any) => {
        const errorMessage = getErrorMessage(err, FORECASTER_VALIDATION_ERROR_MESSAGE);

        if (errorMessage.includes(FORECASTER_EMPTY_DATA_IDENTIFIER)) {
          setForecasterDefinitionMessageResponse(FORECASTER_INSUFFICIENT_DATA_MESSAGE);
        } else {
          setForecasterDefinitionMessageResponse(errorMessage);
        }
      });
  }, []);


  // Using useRef instead of useState since useState updates state asynchronously,
  // but we need the most up-to-date value immediately in handleCreateForecaster
  // to determine whether to run the test after creation
  const shouldRunOnceRef = useRef(false);

  const validateImputationOption = (
    formikValues: ModelConfigurationFormikValues,
    errors: any
  ) => {
    const imputationOption = get(formikValues, 'imputationOption', null);


    // Validate imputationOption when method is CUSTOM_VALUE
    // No need to lidate that the custom value's feature name matches formikValues.featureName as we only have one feature
    if (imputationOption && imputationOption.imputationMethod === SparseDataOptionValue.CUSTOM_VALUE) {
      // Validate that the number of custom values matches the number of enabled features
      if ((imputationOption.custom_value || []).length !== 1) {
        errors.custom_value =
          `The number of custom values (${(imputationOption.custom_value || []).length}) should be 1.`;
      }
    }
  };

  const handleFormValidation = async (
    values: ModelConfigurationFormikValues,
    formikHelpers: FormikHelpers<ModelConfigurationFormikValues>,
  ) => {
      formikHelpers.setSubmitting(true);
      formikHelpers.setFieldTouched('shingleSize');
      formikHelpers.setFieldTouched('imputationOption');
      formikHelpers.setFieldTouched('interval');
      formikHelpers.setFieldTouched('windowDelay');
      formikHelpers.setFieldTouched('suggestedSeasonality');
      formikHelpers.setFieldTouched('recencyEmphasis');
      formikHelpers.setFieldTouched('resultIndex');
      formikHelpers.setFieldTouched('resultIndexMinAge');
      formikHelpers.setFieldTouched('resultIndexMinSize');
      formikHelpers.setFieldTouched('resultIndexTtl');
      formikHelpers.setFieldTouched('flattenCustomResultIndex');

      formikHelpers.validateForm().then((errors) => {
        // Call the extracted validation method
        validateImputationOption(values, errors);

        if (isEmpty(errors)) {
          
            handleCreateForecaster(values, formikHelpers);
        } else {
          const customValueError = get(errors, 'custom_value')
          if (customValueError) {
            core.notifications.toasts.addDanger(
              customValueError
            );
            focusOnImputationOption();
            return;
          }

          core.notifications.toasts.addDanger(
            'One or more input fields is invalid'
          );
        }
      });

    formikHelpers.setSubmitting(false);
  };

  const handleCreateForecaster = async (values: ModelConfigurationFormikValues,
    formikHelpers: FormikHelpers<ModelConfigurationFormikValues>,
  ) => {
    try {
      const forecasterFormikValues = {
        ...values,
        ...props.forecasterDefinitionValues,
      }
      formikHelpers.setSubmitting(true);
      const forecasterToCreate = formikToForecaster(forecasterFormikValues);

      // interval is in minutes
      const forecastInterval = values.interval || 0;
      const history = values.history || 0;
      let requiredConsecutiveIntervals;
      if (forecastInterval > 0) {
        const shingleSize = values.shingleSize ? values.shingleSize : DEFAULT_SHINGLE_SIZE;
        requiredConsecutiveIntervals = history > 0 ? history : (DEFAULT_OUTPUT_AFTER + shingleSize);
      }

      // Decide subtitle text
      const subTitle = shouldRunOnceRef.current
        ? `The test is initializing with historical data. This may take approximately 1–2 minutes if your data covers each of the last ${requiredConsecutiveIntervals} consecutive intervals.`
        : "Start forecasting or run the test first.";

      dispatch(createForecaster(forecasterToCreate, dataSourceId))
        .then((response: any) => {
          const forecasterId = response.response.id;
          // if not running test, show success message and navigate
          if (!shouldRunOnceRef.current) {

            // Call getForecaster to refresh forecaster state after creation
            // This ensures useFetchForecasterInfo gets correct forecaster state
            // Otherwise, ForecasterDetail's useEffect won't work as it depends on forecaster.curState
            dispatch(getForecaster(forecasterId, dataSourceId));
            core.notifications.toasts.addSuccess({
              title: `${forecasterToCreate.name} forecast has been created`,
              text: subTitle,
            });
            props.history.push(
              constructHrefWithDataSourceId(
                `/forecasters/${forecasterId}/details`,
                dataSourceId,
                false
              )
            );
          }
          // Optionally run test
          else {
            dispatch(
              //@ts-ignore
              testForecaster(
                forecasterId,
                dataSourceId
              )
            )
              .then((response: any) => {
                // Call getForecaster to refresh forecaster state after creation
                // This ensures useFetchForecasterInfo gets correct forecaster state
                // Otherwise, ForecasterDetail's useEffect won't work as it depends on forecaster.curState
                dispatch(getForecaster(forecasterId, dataSourceId));
                shouldRunOnceRef.current = false;  // Reset after success
                core.notifications.toasts.addSuccess({
                  title: `${forecasterToCreate.name} forecast has been created`,
                  text: subTitle,
                });
                props.history.push(
                  constructHrefWithDataSourceId(
                    `/forecasters/${forecasterId}/details`,
                    dataSourceId,
                    false
                  )
                );
              })
              .catch((err: any) => {
                shouldRunOnceRef.current = false;  // Reset after failure
                core.notifications.toasts.addDanger(
                  prettifyErrorMessage(
                    getErrorMessage(
                      err,
                      'There was a problem running the test.'
                    )
                  )
                );
              });
          }
        })
        .catch((err: any) => {
          dispatch(getForecasterCount(dataSourceId)).then((response: any) => {
            const totalForecasters = get(response, 'response.count', 0);
            if (totalForecasters === MAX_FORECASTER) {
              core.notifications.toasts.addDanger(
                'Cannot create forecaster - limit of ' +
                MAX_FORECASTER +
                ' forecasters reached'
              );
            } else {
              core.notifications.toasts.addDanger(
                prettifyErrorMessage(
                  getErrorMessage(
                    err,
                    'There was a problem creating the forecaster'
                  )
                )
              );
            }
          });
        });
    } catch (e) {
      console.error('Failed to create forecaster:', e);
      core.notifications.toasts.addDanger(
        'There was a problem creating the forecaster'
      );
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  let renderDataSourceComponent: ReactElement | null = null;
  if (dataSourceEnabled) {
    const DataSourceMenu =
      getDataSourceManagementPlugin()?.ui.getDataSourceMenu<DataSourceViewConfig>();
    renderDataSourceComponent = (
      <DataSourceMenu
        setMenuMountPoint={props.setActionMenu}
        componentType={'DataSourceView'} // read-only
        componentConfig={{
          activeOption: [{ id: dataSourceId }],
          fullWidth: false,
          savedObjects: getSavedObjectsClient(),
          notifications: getNotifications(),
        }}
      />
    );
  }

  const [showSuggestDialog, setShowSuggestDialog] = useState(false);

  return (
    <Formik
      initialValues={
        props.initialValues
          ? props.initialValues
          : modelConfigurationToFormik(forecaster)
      }
      enableReinitialize={true}
      onSubmit={handleFormValidation}
      validateOnMount={true}
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
              <div style={{ background: 'white', padding: '24px', borderRadius: '6px' }}>
                <EuiText size="s" data-test-subj="configureOrEditModelConfigurationTitle">
                  <h1>
                    {
                      'Create forecaster'}{' '}
                  </h1>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiText size="s" color="subdued">
                  <h3>Add model parameters</h3>
                </EuiText>
                <EuiSpacer size="m" />
                <ValidationCallout
                  isLoading={formikProps.isSubmitting}
                  validationResponse={forecasterDefinitionMessageResponse}
                />
                <EuiText size="s">
                  <p>
                    Core parameters
                    <br />
                    Define how often the forecast will generate the next value based on historical data and how far to
                    forecast into the future.
                  </p>
                </EuiText>
                <EuiSpacer size="l" />

                <EuiSmallButton
                  data-test-subj="suggestParametersButton"
                  onClick={() => setShowSuggestDialog(true)}
                >
                  Suggest parameters
                </EuiSmallButton>

                {/* Conditionally render the SuggestParametersDialog */}
                {showSuggestDialog && (
                  <SuggestParametersDialog
                    onClose={() => setShowSuggestDialog(false)}
                    dataSourceId={dataSourceId}
                    forecasterDefinitionValues={props.forecasterDefinitionValues!}
                    formikProps={formikProps}
                  />
                )}

                <EuiSpacer size="l" />
                <Settings />
                <EuiSpacer size="l" />
                <AdvancedSettings />
                <EuiSpacer size="l" />
                <StorageSettings
                  formikProps={formikProps}
                  isEditable={true}
                />
              </div>
            </EuiPageBody>
          </EuiPage>

          <EuiBottomBar paddingSize="m">
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              style={{ marginRight: '12px' }}
            >
              <EuiFlexItem grow={false}>
                <EuiSmallButtonEmpty
                  iconSide='left'
                  iconType="cross"
                  onClick={() => {
                      props.history.push(
                        constructHrefWithDataSourceId(
                          '/forecasters',
                          dataSourceId,
                          false
                        )
                      );
                    
                  }}
                >
                  Cancel
                </EuiSmallButtonEmpty>
              </EuiFlexItem>
              {
                <EuiFlexItem grow={false}>
                  <EuiSmallButton
                    iconSide="left"
                    iconType="arrowLeft"
                    fill={false}
                    data-test-subj="configureModelPreviousButton"
                    //@ts-ignore
                    onClick={() => {
                      //@ts-ignore
                      props.setStep(1);
                    }}
                  >
                    Previous
                  </EuiSmallButton>
                </EuiFlexItem>
              }
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  type="submit"
                  fill={false}
                  data-test-subj="createForecasterButton"
                  isLoading={formikProps.isSubmitting}
                  //@ts-ignore
                  onClick={() => {
                    shouldRunOnceRef.current = false;
                    formikProps.handleSubmit();
                  }}
                >
                  Create
                </EuiSmallButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  type="submit"
                  fill={true}
                  data-test-subj="createTestForecasterButton"
                  isLoading={formikProps.isSubmitting}
                  //@ts-ignore
                  onClick={() => {
                    shouldRunOnceRef.current = true;
                    formikProps.handleSubmit();
                  }}
                >
                  Create and test
                </EuiSmallButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        </Fragment>
      )}
    </Formik>
  );
}
