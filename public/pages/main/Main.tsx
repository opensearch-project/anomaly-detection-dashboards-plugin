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

import { Switch, Route, RouteComponentProps } from 'react-router-dom';
import React from 'react';
import { AppState } from '../../redux/reducers';
import { DetectorList } from '../DetectorsList';
import { ListRouterParams } from '../DetectorsList/containers/List/List';
import { CreateDetectorSteps } from '../CreateDetectorSteps';
import { EuiSideNav, EuiPage, EuiPageBody, EuiPageSideBar } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { APP_PATH } from '../../utils/constants';
import { DetectorDetail } from '../DetectorDetail';
import { DefineDetector } from '../DefineDetector/containers/DefineDetector';
import { ConfigureModel } from '../ConfigureModel/containers/ConfigureModel';
import { DashboardOverview, DashboardOverviewRouterParams } from '../Dashboard/Container/DashboardOverview';
import { CoreServicesConsumer } from '../../components/CoreServices/CoreServices';
import { CoreStart, MountPoint } from '../../../../../src/core/public';
import { AnomalyDetectionOverview } from '../Overview';
import { DataSourceManagementPluginSetup } from '../../../../../src/plugins/data_source_management/public';
import { getURLQueryParams } from '../DetectorsList/utils/helpers';

enum Navigation {
  AnomalyDetection = 'Anomaly detection',
  Dashboard = 'Dashboard',
  Detectors = 'Detectors',
}

interface MainProps extends RouteComponentProps {
  dataSourceEnabled: boolean;
  dataSourceManagement: DataSourceManagementPluginSetup;
  setHeaderActionMenu: (menuMount: MountPoint | undefined) => void;
}

export function Main(props: MainProps) {
  const { dataSourceEnabled, dataSourceManagement, setHeaderActionMenu } =
    props;

  const hideSideNavBar = useSelector(
    (state: AppState) => state.adApp.hideSideNavBar
  );

  const adState = useSelector((state: AppState) => state.ad);
  const totalDetectors = adState.totalDetectors;
  const errorGettingDetectors = adState.errorMessage;
  const isLoadingDetectors = adState.requesting;
  const queryParams = getURLQueryParams(props.location);
  const dataSourceId = queryParams.dataSourceId ? queryParams.dataSourceId : '';

  const constructHrefWithDataSourceId = (basePath, existingParams, dataSourceId) => {
    // Construct the full URL
    const fullUrl = `${window.location.origin}${basePath}?${existingParams}`;
    //console.log("fullUrl: ", fullUrl);
    const url = new URL(fullUrl);
    //console.log(url);
    url.searchParams.set('dataSourceId', dataSourceId);  // Append or update dataSourceId
    
    // Return the constructed URL, excluding the origin part to match your structure
    return `#${url.pathname}${url.search}`;
  };

  const existingParams = "from=0&size=20&search=&indices=&sortField=name&sortDirection=asc&dataSourceId=4585f560-d1ef-11ee-aa63-2181676cc573";  

  const sideNav = [
    {
      name: Navigation.AnomalyDetection,
      id: 0,
      href: `#${APP_PATH.OVERVIEW}`,
      items: [
        {
          name: Navigation.Dashboard,
          id: 1,
          href: `#${APP_PATH.DASHBOARD}?dataSourceId=${dataSourceId}`,
          isSelected: props.location.pathname === APP_PATH.DASHBOARD,
        },
        {
          name: Navigation.Detectors,
          id: 2,
          href: constructHrefWithDataSourceId(APP_PATH.LIST_DETECTORS, existingParams, dataSourceId),
          isSelected: props.location.pathname === APP_PATH.LIST_DETECTORS,
        },
      ],
    },
  ];

  return (
    <CoreServicesConsumer>
      {(core: CoreStart | null) =>
        core && (
          <EuiPage style={{ height: '100%' }}>
            <EuiPageSideBar style={{ minWidth: 150 }} hidden={hideSideNavBar}>
              <EuiSideNav style={{ width: 150 }} items={sideNav} />
            </EuiPageSideBar>
            <EuiPageBody>
              <Switch>
                <Route
                  path={APP_PATH.DASHBOARD}
                  render={(props: RouteComponentProps<DashboardOverviewRouterParams>) => 
                    <DashboardOverview 
                      dataSourceManagement={dataSourceManagement}
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />}
                />
                <Route
                  exact
                  path={APP_PATH.LIST_DETECTORS}
                  render={(props: RouteComponentProps<ListRouterParams>) => (
                    <DetectorList
                      dataSourceEnabled={dataSourceEnabled}
                      dataSourceManagement={dataSourceManagement}
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
                  )}
                />
                <Route
                  exact
                  path={APP_PATH.CREATE_DETECTOR}
                  render={(props: RouteComponentProps) => (
                    <CreateDetectorSteps {...props} />
                  )}
                />
                <Route
                  exact
                  path={APP_PATH.EDIT_DETECTOR}
                  render={(props: RouteComponentProps) => (
                    <DefineDetector {...props} isEdit={true} />
                  )}
                />
                <Route
                  exact
                  path={APP_PATH.EDIT_FEATURES}
                  render={(props: RouteComponentProps) => (
                    <ConfigureModel {...props} isEdit={true} />
                  )}
                />
                <Route
                  path={APP_PATH.DETECTOR_DETAIL}
                  render={(props: RouteComponentProps) => {
                    return (
                      <DetectorDetail 
                        dataSourceEnabled={dataSourceEnabled}
                        dataSourceManagement={dataSourceManagement}
                        setActionMenu={setHeaderActionMenu}
                        {...props} />
                    );
                  }}
                />
                <Route
                  exact
                  path={APP_PATH.CREATE_DETECTOR_STEPS}
                  render={(props: RouteComponentProps) => (
                    <CreateDetectorSteps {...props} />
                  )}
                />
                <Route
                  path={APP_PATH.OVERVIEW}
                  render={(props: RouteComponentProps) => (
                    <AnomalyDetectionOverview
                      isLoadingDetectors={isLoadingDetectors}
                      dataSourceManagement={dataSourceManagement}
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
                  )}
                />
                <Route 
                  path="/"
                  render={(props: RouteComponentProps<DashboardOverviewRouterParams>) => 
                    totalDetectors > 0 ? (
                      <DashboardOverview 
                        dataSourceManagement={dataSourceManagement}
                        setActionMenu={setHeaderActionMenu}
                        {...props}
                      />
                    ) : (
                      <AnomalyDetectionOverview
                        isLoadingDetectors={isLoadingDetectors}
                        dataSourceManagement={dataSourceManagement}
                        setActionMenu={setHeaderActionMenu}
                        {...props}
                      />
                    )
                  }
                />        


                  
              </Switch>
            </EuiPageBody>
          </EuiPage>
        )
      }
    </CoreServicesConsumer>
  );
}
