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

import { Switch, Route, RouteComponentProps, Redirect } from 'react-router-dom';
import React from 'react';
import { ForecastersList } from '../ForecastersList';
import { ListRouterParams } from '../ForecastersList/containers/List/List';
import { CreateForecasterSteps } from '../CreateForecasterSteps';
import { EuiPage, EuiPageBody, } from '@elastic/eui';
import { APP_PATH } from '../../utils/constants';
import { CoreServicesConsumer } from '../../components/CoreServices/CoreServices';
import { CoreStart, MountPoint } from '../../../../../src/core/public';
import { ForecasterDetail } from '../ForecastDetail/containers/ForecasterDetail';

interface ForecastMainProps extends RouteComponentProps {
  setHeaderActionMenu: (menuMount: MountPoint | undefined) => void;
  landingPage: string | undefined;
  hideInAppSideNavBar: boolean;
}

export function ForecastMain(props: ForecastMainProps) {
  // AD has a side nav bar on the Get Started (landing page) poiniting to list of detectors and AD Dashboard
  // Depending on the hideInAppSideNavBar, the side nav bar will be hidden or shown on the Get Started page.
  // Forecasting's landing page is the list of forecasters and has no Get Started and Dashboard pages
  // So Forecasting needs no use of hideInAppSideNavBar.
  const { setHeaderActionMenu, landingPage, hideInAppSideNavBar } = props;

  return (
    <CoreServicesConsumer>
      {(core: CoreStart | null) =>
        core && (
          <EuiPage style={{ height: '100%' }}>
            <EuiPageBody style={{ height: '100%' }}>
              <Switch>
                <Route
                  exact
                  path={APP_PATH.LIST_FORECASTERS}
                  render={(props: RouteComponentProps<ListRouterParams>) => (
                    <ForecastersList
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
                  )}
                />
                <Route
                  exact
                  path={APP_PATH.CREATE_FORECASTER}
                  render={(props: RouteComponentProps) => (
                    <CreateForecasterSteps
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
                  )}
                />
                <Route
                  path={APP_PATH.FORECASTER_DETAIL}
                  render={(props: RouteComponentProps) => (
                    <ForecasterDetail
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
                  )}
                /> 
                <Route
                  path="/"
                  render={(props: RouteComponentProps<ListRouterParams>) =>
                    landingPage ? (
                      <Redirect from="/" to={landingPage} />
                    ) : <ForecastersList
                      setActionMenu={setHeaderActionMenu}
                      {...props}
                    />
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
