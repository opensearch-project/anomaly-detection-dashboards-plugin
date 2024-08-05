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
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { FormikProps, Formik } from 'formik';
import { get, isEmpty } from 'lodash';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';
import { updateDetector, matchDetector } from '../../../redux/reducers/ad';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import { useFetchDetectorInfo } from '../../CreateDetectorSteps/hooks/useFetchDetectorInfo';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { APIAction } from '../../../redux/middleware/types';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { BREADCRUMBS, MDS_BREADCRUMBS } from '../../../utils/constants';
import { getErrorMessage, validateDetectorName } from '../../../utils/utils';
import { NameAndDescription } from '../components/NameAndDescription';
import { DataSource } from '../components/Datasource/DataSource';
import { CustomResultIndex } from '../components/CustomResultIndex';
import { Timestamp } from '../components/Timestamp';
import { Settings } from '../components/Settings';
import {
  detectorDefinitionToFormik,
  formikToDetectorDefinition,
  clearModelConfiguration,
} from '../utils/helpers';
import { DetectorDefinitionFormikValues } from '../models/interfaces';
import { Detector, FILTER_TYPES, MDSStates } from '../../../models/interfaces';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { ModelConfigurationFormikValues } from 'public/pages/ConfigureModel/models/interfaces';
import {
  getDataSourceManagementPlugin,
  getDataSourceEnabled,
  getNotifications,
  getSavedObjectsClient,
} from '../../../services';
import { DataSourceSelectableConfig, DataSourceViewConfig } from '../../../../../../src/plugins/data_source_management/public';
import {
  constructHrefWithDataSourceId,
  getDataSourceFromURL,
  isDataSourceCompatible,
} from '../../../pages/utils/helpers';
import queryString from 'querystring';

interface DefineDetectorRouterProps {
  detectorId?: string;
}

interface DefineDetectorProps
  extends RouteComponentProps<DefineDetectorRouterProps> {
  isEdit: boolean;
  setStep?(stepNumber: number): void;
  initialValues?: DetectorDefinitionFormikValues;
  setInitialValues?(initialValues: DetectorDefinitionFormikValues): void;
  setModelConfigValues?(initialValues: ModelConfigurationFormikValues): void;
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

export const DefineDetector = (props: DefineDetectorProps) => {
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;
  const dataSourceEnabled = getDataSourceEnabled().enabled;

  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch<Dispatch<APIAction>>();
  useHideSideNavBar(true, false);
  const detectorId: string = get(props, 'match.params.detectorId', '');
  const { detector, hasError } = useFetchDetectorInfo(detectorId, dataSourceId);
  const [newIndexSelected, setNewIndexSelected] = useState<boolean>(false);

  const [MDSCreateState, setMDSCreateState] = useState<MDSStates>({
    queryParams: MDSQueryParams,
    selectedDataSourceId: dataSourceId === undefined? undefined : dataSourceId,
  });

  // To handle backward compatibility, we need to pass some fields via
  // props to the subcomponents so they can render correctly
  //
  // oldFilterType: there used to only be one filter type per detector.
  // Now, the filter type is on a per-filter granularity, and each type
  // is stored within each filter in the filters array.
  //
  // oldFilterQuery: the custom filter query used to be stored here.
  // Now, the same field is repurposed in the new changes, but has a different meaning,
  // since it is a dynamically built query based on each individually-created filter.
  // See formikToFilterQuery() in public/pages/ReviewAndCreate/utils/helpers.ts for details.
  const oldFilterType = get(
    detector,
    'uiMetadata.filterType',
    undefined
  ) as FILTER_TYPES;
  const oldFilterQuery = get(detector, 'filterQuery', undefined);

  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);
  }, []);

  // Set breadcrumbs based on create / update
  useEffect(() => {
    if (dataSourceEnabled) {
      const createOrEditBreadcrumb = props.isEdit
        ? MDS_BREADCRUMBS.EDIT_DETECTOR
        : MDS_BREADCRUMBS.CREATE_DETECTOR;
      let breadCrumbs = [
        MDS_BREADCRUMBS.ANOMALY_DETECTOR(dataSourceId),
        MDS_BREADCRUMBS.DETECTORS(dataSourceId),
        createOrEditBreadcrumb,
      ];
      if (detector && detector.name) {
        breadCrumbs.splice(2, 0, {
          text: detector.name,
          //@ts-ignore
          href: `#/detectors/${detectorId}/?dataSourceId=${dataSourceId}`,
        });
      }
      core.chrome.setBreadcrumbs(breadCrumbs);
    } else {
      const createOrEditBreadcrumb = props.isEdit
        ? BREADCRUMBS.EDIT_DETECTOR
        : BREADCRUMBS.CREATE_DETECTOR;
      let breadCrumbs = [
        BREADCRUMBS.ANOMALY_DETECTOR,
        BREADCRUMBS.DETECTORS,
        createOrEditBreadcrumb,
      ];
      if (detector && detector.name) {
        breadCrumbs.splice(2, 0, {
          text: detector.name,
          //@ts-ignore
          href: `#/detectors/${detectorId}`,
        });
      }
      core.chrome.setBreadcrumbs(breadCrumbs);
    }
  });

  // If no detector found with ID, redirect it to list
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
    if (props.isEdit && hasError) {
      core.notifications.toasts.addDanger(
        'Unable to find the detector for editing'
      );
      props.history.push(constructHrefWithDataSourceId(`/detectors`, dataSourceId, false));
    }
  }, [props.isEdit, MDSCreateState]);

  const handleValidateName = async (detectorName: string) => {
    if (isEmpty(detectorName)) {
      return 'Detector name cannot be empty';
    } else {
      const error = validateDetectorName(detectorName);
      if (error) {
        return error;
      }
      //TODO::Avoid making call if value is same
      const resp = await dispatch(matchDetector(detectorName, dataSourceId));
      const match = get(resp, 'response.match', false);
      if (!match) {
        return undefined;
      }
      //If more than one detectors found, duplicate exists.
      if (!props.isEdit && match) {
        return 'Duplicate detector name';
      }
      // if it is in edit mode
      if (props.isEdit && detectorName !== detector?.name) {
        return 'Duplicate detector name';
      }
    }
  };

  const handleFormValidation = async (
    formikProps: FormikProps<DetectorDefinitionFormikValues>
  ) => {
    if (props.isEdit && detector.curState === DETECTOR_STATE.RUNNING) {
      core.notifications.toasts.addDanger(
        'Detector cannot be updated while it is running'
      );
    } else {
      formikProps.setSubmitting(true);
      formikProps.setFieldTouched('name');
      formikProps.setFieldTouched('description');
      formikProps.setFieldTouched('index');
      formikProps.setFieldTouched('resultIndex');
      formikProps.setFieldTouched('filters');
      formikProps.setFieldTouched('timeField');
      formikProps.setFieldTouched('interval');
      formikProps.setFieldTouched('windowDelay');
      formikProps.setFieldTouched('resultIndexMinAge');
      formikProps.setFieldTouched('resultIndexMinSize');
      formikProps.setFieldTouched('resultIndexTtl');
      formikProps.setFieldTouched('flattenCustomResultIndex');
      formikProps.validateForm().then((errors) => {
        if (isEmpty(errors)) {
          if (props.isEdit) {
            const detectorToUpdate = formikToDetectorDefinition(
              formikProps.values,
              detector
            );
            handleUpdateDetector(detectorToUpdate);
          } else {
            optionallySaveValues(formikProps.values);
            //@ts-ignore
            props.setStep(2);
          }
        } else {
          // TODO: can add focus to all components or possibly customize error message too
          core.notifications.toasts.addDanger(
            'One or more input fields is invalid'
          );
        }
      });
    }
    formikProps.setSubmitting(false);
  };

  const handleUpdateDetector = async (detectorToUpdate: Detector) => {
    // If a new index was selected: clear any existing features and category fields
    const preparedDetector = newIndexSelected
      ? clearModelConfiguration(detectorToUpdate)
      : detectorToUpdate;
    dispatch(updateDetector(detectorId, preparedDetector, dataSourceId))
      .then((response: any) => {
        core.notifications.toasts.addSuccess(
          `Detector updated: ${response.response.name}`
        );
        props.history.push(constructHrefWithDataSourceId(
          `/detectors/${detectorId}/configurations/`, dataSourceId, false));
      })
      .catch((err: any) => {
        core.notifications.toasts.addDanger(
          prettifyErrorMessage(
            getErrorMessage(err, 'There was a problem updating the detector')
          )
        );
      });
  };

  const optionallySaveValues = (values: DetectorDefinitionFormikValues) => {
    if (props.setInitialValues) {
      props.setInitialValues(values);
    }
  };

  const handleDataSourceChange = ([event]) => {
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
    if (props.isEdit) {
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
          dataSourceFilter: isDataSourceCompatible,
        }}
      />
    );
    } else {
      const DataSourceMenu =
        getDataSourceManagementPlugin().ui.getDataSourceMenu<DataSourceSelectableConfig>();
      renderDataSourceComponent = useMemo(() => {
        return (
          <DataSourceMenu
            setMenuMountPoint={props.setActionMenu}
            componentType={'DataSourceSelectable'}
            componentConfig={{
              fullWidth: false,
              activeOption: MDSCreateState.selectedDataSourceId !== undefined 
                ? [{ id: MDSCreateState.selectedDataSourceId }]
                : undefined,
              savedObjects: getSavedObjectsClient(),
              notifications: getNotifications(),
              onSelectedDataSources: (dataSources) =>
                handleDataSourceChange(dataSources),
              dataSourceFilter: isDataSourceCompatible,
            }}
          />
        );
      }, [getSavedObjectsClient(), getNotifications(), props.setActionMenu]);
    }
  }



  return (
    <Formik
      initialValues={
        props.initialValues
          ? props.initialValues
          : detectorDefinitionToFormik(detector)
      }
      enableReinitialize={true}
      onSubmit={() => {}}
      validateOnMount={props.isEdit ? false : true}
    >
      {(formikProps) => (
        <React.Fragment>
          {dataSourceEnabled && renderDataSourceComponent}
          <EuiPage
            style={{
              marginTop: '-24px',
            }}
          >
            <EuiPageBody>
              <EuiPageHeader>
                <EuiPageHeaderSection>
                  <EuiTitle size="l" data-test-subj="defineOrEditDetectorTitle">
                    <h1>
                      {props.isEdit
                        ? 'Edit detector settings'
                        : 'Define detector'}{' '}
                    </h1>
                  </EuiTitle>
                </EuiPageHeaderSection>
              </EuiPageHeader>
              <Fragment>
                <NameAndDescription
                  onValidateDetectorName={handleValidateName}
                />
                <EuiSpacer />
                <DataSource
                  formikProps={formikProps}
                  origIndex={
                    props.isEdit ? get(detector, 'indices.0', '') : null
                  }
                  isEdit={props.isEdit}
                  setModelConfigValues={props.setModelConfigValues}
                  setNewIndexSelected={setNewIndexSelected}
                  oldFilterType={oldFilterType}
                  oldFilterQuery={oldFilterQuery}
                />
                <EuiSpacer />
                <Timestamp formikProps={formikProps} />
                <EuiSpacer />
                <Settings />
                <EuiSpacer />
                <CustomResultIndex
                  isEdit={props.isEdit}
                  resultIndex={get(formikProps, 'values.resultIndex')}
                  formikProps={formikProps}
                />
              </Fragment>
            </EuiPageBody>
          </EuiPage>

          <EuiSpacer size="xs" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            style={{ marginRight: '12px' }}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => {
                  if (props.isEdit) {
                    props.history.push(
                      constructHrefWithDataSourceId(
                        `/detectors/${detectorId}/configurations/`,
                        MDSCreateState.selectedDataSourceId,
                        false
                      )
                    );
                  } else {
                    props.history.push(
                      constructHrefWithDataSourceId(
                        '/detectors',
                        MDSCreateState.selectedDataSourceId,
                        false
                      )
                    );
                  }
                }}
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {props.isEdit ? (
                <EuiButton
                  type="submit"
                  fill={true}
                  data-test-subj="updateDetectorButton"
                  //@ts-ignore
                  onClick={() => {
                    handleFormValidation(formikProps);
                  }}
                >
                  Save changes
                </EuiButton>
              ) : (
                <EuiButton
                  type="submit"
                  iconSide="right"
                  iconType="arrowRight"
                  fill={true}
                  data-test-subj="defineDetectorNextButton"
                  isLoading={formikProps.isSubmitting}
                  //@ts-ignore
                  onClick={() => {
                    handleFormValidation(formikProps);
                  }}
                >
                  Next
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </React.Fragment>
      )}
    </Formik>
  );
};
