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
import { APP_PATH } from '../../utils/constants';
import { DailyInsights } from '../DailyInsights';
import { IndicesManagement } from '../DailyInsights/components/IndicesManagement';
import { CoreServicesConsumer } from '../../components/CoreServices/CoreServices';
import { CoreStart, MountPoint } from '../../../../../src/core/public';
import { getURLQueryParams } from '../DetectorsList/utils/helpers';

interface DailyInsightsMainProps extends RouteComponentProps {
  setHeaderActionMenu: (menuMount: MountPoint | undefined) => void;
  landingPage: string | undefined;
}

export function DailyInsightsMain(props: DailyInsightsMainProps) {
  const { setHeaderActionMenu, landingPage } = props;
  const queryParams = getURLQueryParams(props.location);
  const dataSourceId = queryParams.dataSourceId === undefined ? undefined : queryParams.dataSourceId;

  console.log('DailyInsightsMain called with landingPage:', landingPage);

  return (
    <CoreServicesConsumer>
      {(core: CoreStart | null) =>
        core && (
          <Switch>
            <Route
              path={APP_PATH.DAILY_INSIGHTS_OVERVIEW}
              render={(props: RouteComponentProps) => (
                <DailyInsights
                  setActionMenu={setHeaderActionMenu}
                  landingDataSourceId={dataSourceId}
                  {...props}
                />
              )}
            />
            <Route
              path={APP_PATH.DAILY_INSIGHTS_INDICES}
              render={(props: RouteComponentProps) => (
                <IndicesManagement
                  setActionMenu={setHeaderActionMenu}
                  {...props} />
              )}
            />
            <Route
              path="/"
              render={(props: RouteComponentProps) =>
                landingPage ? (
                  <Redirect from="/" to={landingPage} />
                ) : (
                  <Redirect from="/" to={APP_PATH.DAILY_INSIGHTS_OVERVIEW} />
                )
              }
            />
          </Switch>
        )
      }
    </CoreServicesConsumer>
  );
}
