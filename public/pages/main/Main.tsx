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
import { DashboardOverview } from '../Dashboard/Container/DashboardOverview';
import { CoreServicesConsumer } from '../../components/CoreServices/CoreServices';
import { CoreStart, MountPoint } from '../../../../../src/core/public';
import { AnomalyDetectionOverview } from '../Overview';
import { getURLQueryParams } from '../DetectorsList/utils/helpers';

enum Navigation {
  AnomalyDetection = 'Anomaly detection',
  Dashboard = 'Dashboard',
  Detectors = 'Detectors',
}

interface MainProps extends RouteComponentProps {
  setHeaderActionMenu: (menuMount: MountPoint | undefined) => void;
}

export function Main(props: MainProps) {
  const { setHeaderActionMenu } = props;

  const hideSideNavBar = useSelector(
    (state: AppState) => state.adApp.hideSideNavBar
  );

  const adState = useSelector((state: AppState) => state.ad);
  const totalDetectors = adState.totalDetectors;
  const queryParams = getURLQueryParams(props.location);
  const dataSourceId = queryParams.dataSourceId ? queryParams.dataSourceId : '';
  const existingParams =
    'from=0&size=20&search=&indices=&sortField=name&sortDirection=asc';

  const constructHrefWithDataSourceId = (
    basePath: string,
    existingParams: string,
    dataSourceId: string
  ) => {
    const searchParams = new URLSearchParams(existingParams);

    if (dataSourceId) {
      searchParams.set('dataSourceId', dataSourceId);
    }

    return `#${basePath}?${searchParams.toString()}`;
  };

  const sideNav = [
    {
      name: Navigation.AnomalyDetection,
      id: 0,
      href:  constructHrefWithDataSourceId(
        APP_PATH.OVERVIEW,
        '',
        dataSourceId
      ),
      items: [
        {
          name: Navigation.Dashboard,
          id: 1,
          href: constructHrefWithDataSourceId(
            APP_PATH.DASHBOARD,
            '',
            dataSourceId
          ),
          isSelected: props.location.pathname === APP_PATH.DASHBOARD,
        },
        {
          name: Navigation.Detectors,
          id: 2,
          href: constructHrefWithDataSourceId(
            APP_PATH.LIST_DETECTORS,
            existingParams,
            dataSourceId
          ),
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
                  render={(props: RouteComponentProps) => (
                    <DashboardOverview
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
                  )}
                />
                <Route
                  exact
                  path={APP_PATH.LIST_DETECTORS}
                  render={(props: RouteComponentProps<ListRouterParams>) => (
                    <DetectorList
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
                  render={(props: RouteComponentProps) => (
                    <DetectorDetail
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
                  )}
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
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
                  )}
                />
                <Route
                  path="/"
                  render={(props: RouteComponentProps) =>
                    totalDetectors > 0 ? (
                      <DashboardOverview
                        setActionMenu={setHeaderActionMenu}
                        {...props}
                      />
                    ) : (
                      <AnomalyDetectionOverview
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
