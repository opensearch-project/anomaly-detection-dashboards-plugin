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
  EuiTitle,
  EuiSmallButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { FormikProps, Formik } from 'formik';
import { isEmpty } from 'lodash';
import React, { Fragment, useState, useEffect, ReactElement } from 'react';
import { BREADCRUMBS } from '../../../utils/constants';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import { CoreStart, MountPoint } from '../../../../../../src/core/public';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';
import { DetectorJobsFormikValues } from '../models/interfaces';
import { RealTimeJob } from '../components/RealTimeJob';
import { HistoricalJob } from '../components/HistoricalJob';
import { convertTimestampToNumber } from '../../../utils/utils';
import { RouteComponentProps, useLocation } from 'react-router-dom';
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

interface DetectorJobsProps extends RouteComponentProps {
  setStep?(stepNumber: number): void;
  initialValues: DetectorJobsFormikValues;
  setInitialValues(initialValues: DetectorJobsFormikValues): void;
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

export function DetectorJobs(props: DetectorJobsProps) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceEnabled = getDataSourceEnabled().enabled;
  const dataSourceId = MDSQueryParams.dataSourceId;
  useHideSideNavBar(true, false);

  const [realTime, setRealTime] = useState<boolean>(
    props.initialValues ? props.initialValues.realTime : true
  );
  const [historical, setHistorical] = useState<boolean>(
    props.initialValues ? props.initialValues.historical : false
  );

  // Jump to top of page on first load
  useEffect(() => {
    scroll(0, 0);
  }, []);

  useEffect(() => {
    if (dataSourceEnabled) {
      core.chrome.setBreadcrumbs([
        BREADCRUMBS.ANOMALY_DETECTOR,
        BREADCRUMBS.DETECTORS,
        BREADCRUMBS.CREATE_DETECTOR,
      ]);
    } else {
      core.chrome.setBreadcrumbs([
        BREADCRUMBS.ANOMALY_DETECTOR,
        BREADCRUMBS.DETECTORS,
        BREADCRUMBS.CREATE_DETECTOR,
      ]);
    }
  }, []);

  const handleFormValidation = async (
    formikProps: FormikProps<DetectorJobsFormikValues>
  ) => {
    formikProps.setSubmitting(true);
    formikProps.validateForm().then((errors) => {
      // We need some custom logic to check the validity here. The EUI date range validity
      // is limited and can only be checked on selection changes. Since a user may go back
      // and forth without changing the selection, we still need to prevent moving to the
      // next step without checking time range validity.
      const isValid =
        isEmpty(errors) &&
        (historical
          ? //@ts-ignore
            convertTimestampToNumber(formikProps.values.startTime) <
            //@ts-ignore
            convertTimestampToNumber(formikProps.values.endTime)
          : true);
      if (isValid) {
        optionallySaveValues({
          ...formikProps.values,
          realTime: realTime,
          historical: historical,
        });
        //@ts-ignore
        props.setStep(4);
      } else {
        // TODO: can add focus to all components or possibly customize error message too
        core.notifications.toasts.addDanger(
          'One or more input fields is invalid'
        );
      }
      formikProps.setSubmitting(false);
    });
  };

  const optionallySaveValues = (values: DetectorJobsFormikValues) => {
    props.setInitialValues(values);
  };

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
      initialValues={props.initialValues}
      onSubmit={() => {}}
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
              <EuiPageHeader>
                <EuiPageHeaderSection>
                  <EuiTitle size="l" data-test-subj="detectorJobsTitle">
                    <h1>Set up detector jobs </h1>
                  </EuiTitle>
                </EuiPageHeaderSection>
              </EuiPageHeader>
              <RealTimeJob
                formikProps={formikProps}
                setRealTime={setRealTime}
              />
              <EuiSpacer />
              <HistoricalJob
                formikProps={formikProps}
                setHistorical={setHistorical}
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
              <EuiSmallButtonEmpty
                onClick={() => {
                  props.history.push(
                    constructHrefWithDataSourceId(
                      '/detectors',
                      dataSourceId,
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
                iconSide="left"
                iconType="arrowLeft"
                fill={false}
                data-test-subj="detectorJobsPreviousButton"
                //isLoading={formikProps.isSubmitting}
                //@ts-ignore
                onClick={() => {
                  optionallySaveValues({
                    ...formikProps.values,
                    realTime: realTime,
                    historical: historical,
                  });
                  //@ts-ignore
                  props.setStep(2);
                }}
              >
                Previous
              </EuiSmallButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSmallButton
                type="submit"
                iconSide="right"
                iconType="arrowRight"
                fill={true}
                data-test-subj="detectorJobsNextButton"
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
        </Fragment>
      )}
    </Formik>
  );
}
