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
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { CoreStart } from '../../../../../src/core/public';
import { AnomalyDetectionOverview } from '../Overview';

enum Navigation {
  AnomalyDetection = 'Anomaly detection',
  Dashboard = 'Dashboard',
  Detectors = 'Detectors',
}

interface MainProps extends RouteComponentProps {}

export function Main(props: MainProps) {
  const hideSideNavBar = useSelector(
    (state: AppState) => state.adApp.hideSideNavBar
  );

  const adState = useSelector((state: AppState) => state.ad);
  const totalDetectors = adState.totalDetectors;
  const errorGettingDetectors = adState.errorMessage;
  const isLoadingDetectors = adState.requesting;
  const sideNav = [
    {
      name: Navigation.AnomalyDetection,
      id: 0,
      href: `#${APP_PATH.OVERVIEW}`,
      items: [
        {
          name: Navigation.Dashboard,
          id: 1,
          href: `#${APP_PATH.DASHBOARD}`,
          isSelected: props.location.pathname === APP_PATH.DASHBOARD,
        },
        {
          name: Navigation.Detectors,
          id: 2,
          href: `#${APP_PATH.LIST_DETECTORS}`,
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
                  render={(props: RouteComponentProps) => <DashboardOverview />}
                />
                <Route
                  exact
                  path={APP_PATH.LIST_DETECTORS}
                  render={(props: RouteComponentProps<ListRouterParams>) => (
                    <DetectorList {...props} />
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
                    <DetectorDetail {...props} />
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
                  render={() => (
                    <AnomalyDetectionOverview
                      isLoadingDetectors={isLoadingDetectors}
                    />
                  )}
                />
                <Route path="/">
                  {totalDetectors > 0 ? (
                    // </div>
                    <DashboardOverview />
                  ) : (
                    <AnomalyDetectionOverview
                      isLoadingDetectors={isLoadingDetectors}
                    />
                  )}
                </Route>
              </Switch>
            </EuiPageBody>
          </EuiPage>
        )
      }
    </CoreServicesConsumer>
  );
}
