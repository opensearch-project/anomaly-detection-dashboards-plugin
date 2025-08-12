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

import React, {
  Fragment,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { RouteComponentProps, useLocation } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { FormikProps, Formik } from 'formik';
import { get, isEmpty } from 'lodash';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiPage,
  EuiPageBody,
  EuiText,
  EuiBottomBar,
} from '@elastic/eui';
import { matchForecaster } from '../../../redux/reducers/forecast';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import { useFetchForecasterInfo } from '../../CreateForecasterSteps/hooks/useFetchForecasterInfo';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { APIAction } from '../../../redux/middleware/types';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { BREADCRUMBS, MDS_BREADCRUMBS } from '../../../utils/constants';
import { validateForecasterName } from '../../../utils/utils';
import { NameAndDescription } from '../components/NameAndDescription';
import { DataSource } from '../components/Datasource/DataSource';
import {
  forecasterDefinitionToFormik,
  validateFeatures,
  focusOnFirstWrongFeature,
} from '../utils/helpers';
import { ForecasterDefinitionFormikValues } from '../models/interfaces';
import { MDSStates } from '../../../models/interfaces';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { ModelConfigurationFormikValues } from 'public/pages/ConfigureForecastModel/models/interfaces';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
} from '../../../services';
import { DataSourceSelectableConfig, } from '../../../../../../src/plugins/data_source_management/public';
import {
  constructHrefWithDataSourceId,
  getDataSourceFromURL,
  isForecastingDataSourceCompatible,
} from '../../utils/helpers';
import queryString from 'querystring';
import { Features } from '../components/Features/Features';
import { getMappings } from '../../../redux/reducers/opensearch';
import { ForecastCategoryField } from '../components/ForecastCategory/ForecastCategory';
import { AppState } from '../../../redux/reducers';
import { focusOnCategoryField } from '../../ConfigureForecastModel/utils/helpers';
import { getCategoryFields } from '../utils/helpers';

interface DefineForecasterRouterProps {
  forecasterId?: string;
}

interface DefineForecasterProps
  extends RouteComponentProps<DefineForecasterRouterProps> {
  setStep?(stepNumber: number): void;
  initialValues?: ForecasterDefinitionFormikValues;
  setInitialValues?(initialValues: ForecasterDefinitionFormikValues): void;
  setModelConfigValues?(initialValues: ModelConfigurationFormikValues): void;
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

export const validateForecasterNameTemplate = async (
  forecasterName: string,
  dispatch: Dispatch<APIAction>,
  dataSourceId: string | undefined,
  isEdit: boolean,
  existingForecasterName?: string
) => {
  if (isEmpty(forecasterName)) {
    return 'Forecaster name cannot be empty';
  }
  
  const error = validateForecasterName(forecasterName);
  if (error) {
    return error;
  }

  const resp = await dispatch(matchForecaster(forecasterName, dataSourceId));
  const match = get(resp, 'response.match', false);
  
  if (!match) {
    return undefined;
  }

  if (!isEdit && match) {
    return 'Duplicate forecaster name';
  }

  // there is a match of new name, cannot proceed
  if (isEdit && forecasterName !== existingForecasterName) {
    return 'Duplicate forecaster name';
  }
};

export const DefineForecaster = (props: DefineForecasterProps) => {
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;
  const dataSourceEnabled = getDataSourceEnabled().enabled;

  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch<Dispatch<APIAction>>();
  useHideSideNavBar(true, false);
  // forecasterId is empty during forecaster creation
  // when match.params.forecasterId is undefined).
  // Therefore, forecaster is undefined during forecaster creation
  const forecasterId: string = get(props, 'match.params.forecasterId', '');
  const { forecaster, hasError } = useFetchForecasterInfo(forecasterId, dataSourceId);

  const [newIndexSelected, setNewIndexSelected] = useState<boolean>(false);

  const [MDSCreateState, setMDSCreateState] = useState<MDSStates>({
    queryParams: MDSQueryParams,
    // MDS treats empty dataSourceId as the local cluster scenario, 
    // and only undefined actionOption will render the default remote data source.
    // If dataSourceId is '',  we get ''.
    selectedDataSourceId: dataSourceId === undefined? undefined : dataSourceId,
  });

  const [isHCForecaster, setIsHCForecaster] = useState<boolean>(
    props.initialValues ? props.initialValues.categoryFieldEnabled : false
  );

  // When forecaster is loaded: get any category fields (if applicable) and
  // get all index mappings based on forecaster's selected index
  useEffect(() => {
    if (forecaster && get(forecaster, 'categoryField', []).length > 0) {
      setIsHCForecaster(true);
    }
    if (forecaster?.indices) {
      dispatch(getMappings(forecaster.indices, dataSourceId));
    }
  }, [forecaster]);


  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);
  }, []);

  // Set breadcrumbs based on create / update
  useEffect(() => {
    if (dataSourceEnabled) {
      const createOrEditBreadcrumb = MDS_BREADCRUMBS.CREATE_FORECASTER;
      let breadCrumbs = [
        MDS_BREADCRUMBS.FORECASTING(dataSourceId),
        createOrEditBreadcrumb,
      ];
      if (forecaster && forecaster.name) {
        breadCrumbs.splice(2, 0, {
          text: forecaster.name,
          //@ts-ignore
          href: `#/forecasters/${forecasterId}/?dataSourceId=${dataSourceId}`,
        });
      }
      core.chrome.setBreadcrumbs(breadCrumbs);
    } else {
      const createOrEditBreadcrumb = BREADCRUMBS.CREATE_FORECASTER;
      let breadCrumbs = [
        BREADCRUMBS.FORECASTING,
        createOrEditBreadcrumb,
      ];
      if (forecaster && forecaster.name) {
        breadCrumbs.splice(2, 0, {
          text: forecaster.name,
          //@ts-ignore
          href: `#/forecasters/${forecasterId}`,
        });
      }
      core.chrome.setBreadcrumbs(breadCrumbs);
    }
  });

  // If no forecaster found with ID, redirect it to list
  useEffect(() => {
    if (dataSourceEnabled) {
      const { history, location } = props;
      const updatedParams = {
        dataSourceId: MDSCreateState.selectedDataSourceId,
      };
      history.replace({
        ...location,
        search: queryString.stringify(updatedParams),
      });
    }
  }, [MDSCreateState]);

  const indexDataTypes = useSelector(
    (state: AppState) => state.opensearch.dataTypes
  );
  
  const isLoading = useSelector(
    (state: AppState) => state.opensearch.requesting
  );

  const handleValidateName = async (forecasterName: string) => {
    return validateForecasterNameTemplate(
      forecasterName,
      dispatch,
      dataSourceId,
      true
    );
  };

  const handleFormValidation = async (
    formikProps: FormikProps<ForecasterDefinitionFormikValues>
  ) => {
      formikProps.setSubmitting(true);
      formikProps.setFieldTouched('name');
      formikProps.setFieldTouched('description');
      formikProps.setFieldTouched('index');
      formikProps.setFieldTouched('resultIndex');
      formikProps.setFieldTouched('filters');
      formikProps.setFieldTouched('timeField');
      formikProps.setFieldTouched('featureList');
      formikProps.setFieldTouched('categoryField', isHCForecaster);

      formikProps.validateForm().then((errors) => {
        if (isEmpty(errors)) {
          // only used for define forecaster
          optionallySaveValues(formikProps.values);
          //@ts-ignore
          props.setStep(2);
        } else {
          // TODO: can add focus to all components or possibly customize error message too
          if (get(errors, 'featureList')) {
            focusOnFirstWrongFeature(errors, formikProps.setFieldTouched);
          }
          else if (get(errors, 'categoryField')) {
            focusOnCategoryField();
          } else {
            console.log(`unexpected error ${JSON.stringify(errors)}`);
          }
          
          // TODO: can add focus to all components or possibly customize error message too
          core.notifications.toasts.addDanger(
            'One or more input fields is invalid'
          );
        }
      });
    
    formikProps.setSubmitting(false);
  };

  const optionallySaveValues = (values: ForecasterDefinitionFormikValues) => {
    if (props.setInitialValues) {
      props.setInitialValues(values);
    }
  };

  const handleDataSourceChange = ([event]) => {
    // event can be either [] (error state), [{id: '', label: 'Local cluster'] (if Local cluster is enabled) or [{id: <dataSourceId>, label: <dataSourceTitle>}]. 
    // Thus, event can be undefined and it's expected that Plugins handle this case as an invalid/error state.
    const dataSourceId = event?.id;
    if (dataSourceEnabled && dataSourceId === undefined) {
      getNotifications().toasts.addDanger(
        prettifyErrorMessage('Unable to set data source.')
      );
    } else {
      setMDSCreateState({
        queryParams: dataSourceId,
        selectedDataSourceId: dataSourceId,
      });
    }
  };

  let renderDataSourceComponent: ReactElement | null = null;
  if (dataSourceEnabled) {
      const DataSourceMenu =
        getDataSourceManagementPlugin().ui.getDataSourceMenu<DataSourceSelectableConfig>();
      renderDataSourceComponent = useMemo(() => {
        return (
          <DataSourceMenu
            setMenuMountPoint={props.setActionMenu}
            componentType={'DataSourceSelectable'} // writeable
            componentConfig={{
              fullWidth: false,
              activeOption: MDSCreateState.selectedDataSourceId !== undefined 
                ? [{ id: MDSCreateState.selectedDataSourceId }]
                : undefined,
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



  return (
    <Formik
      initialValues={
        props.initialValues
          ? props.initialValues
          : forecasterDefinitionToFormik(forecaster)
      }
      enableReinitialize={true}
      onSubmit={() => {}}
      validateOnMount={true}
      validate={validateFeatures}
    >
      {(formikProps) => (
        <React.Fragment>
          {dataSourceEnabled && renderDataSourceComponent}
          <EuiPage>
            <EuiPageBody>
              <div style={{ background: 'white', padding: '24px', borderRadius: '6px' }}>
                <EuiText size="s" data-test-subj="defineOrEditForecasterTitle">
                  <h1>
                    Create forecaster{' '}
                  </h1>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiText size="s" color="subdued">
                  <h3>Define the details and the data source</h3>
                </EuiText>
                
                <EuiSpacer size="l" />
                
                <Fragment>
                  <NameAndDescription
                    onValidateForecasterName={handleValidateName}
                  />
                  <EuiSpacer />
                  <DataSource
                    formikProps={formikProps}
                    isEdit={false}
                    isEditable={true}
                    setModelConfigValues={props.setModelConfigValues}
                    setNewIndexSelected={setNewIndexSelected}
                  />
                  <EuiSpacer />
                  <Features formikProps={formikProps} />
                  <EuiSpacer />
                  <ForecastCategoryField
                    isEdit={false}
                    isHCForecaster={isHCForecaster}
                    categoryFieldOptions={getCategoryFields(indexDataTypes)}
                    setIsHCForecaster={setIsHCForecaster}
                    isLoading={isLoading}
                    formikProps={formikProps}
                  />
                  <EuiSpacer />
                </Fragment>
              </div>
            </EuiPageBody>
          </EuiPage>

          <EuiSpacer size="xs" />

          <EuiBottomBar paddingSize="m">
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              style={{ marginRight: '12px' }}
            >
              <EuiFlexItem grow={false}>
                <EuiSmallButtonEmpty
                  iconType="cross"
                  onClick={() => {
                      props.history.push(
                        constructHrefWithDataSourceId(
                          '/forecasters',
                          MDSCreateState.selectedDataSourceId,
                          false
                        )
                      );
                  }}
                >
                  Cancel
                </EuiSmallButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSmallButton
                  type="submit"
                  iconSide="right"
                  iconType="arrowRight"
                  fill={true}
                  data-test-subj="defineForecasterNextButton"
                  isLoading={formikProps.isSubmitting}
                  //@ts-ignore
                  onClick={() => {
                    handleFormValidation(formikProps);
                  }}
                >
                  Next
                </EuiSmallButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        </React.Fragment>
      )}
    </Formik>
  );
};
