/*
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  MemoryRouter as Router,
  Route,
  RouteComponentProps,
} from 'react-router-dom';
import { DailyInsightsMain } from '../DailyInsightsMain';
import { APP_PATH } from '../../../utils/constants';

jest.mock('../../DailyInsights', () => ({
  DailyInsights: ({
    landingDataSourceId,
  }: {
    landingDataSourceId?: string;
  }) => <div>Overview route {landingDataSourceId || 'no-ds'}</div>,
}));

jest.mock('../../DailyInsights/components/IndicesManagement', () => ({
  IndicesManagement: () => <div>Indices route</div>,
}));

jest.mock('../../../components/CoreServices/CoreServices', () => ({
  CoreServicesConsumer: ({
    children,
  }: {
    children: (core: any) => React.ReactNode;
  }) => children({}),
}));

const renderMain = (initialEntry: string, landingPage?: string) =>
  render(
    <Router initialEntries={[initialEntry]}>
      <Route
        path="/"
        render={(props: RouteComponentProps) => (
          <DailyInsightsMain
            {...props}
            setHeaderActionMenu={jest.fn()}
            landingPage={landingPage}
          />
        )}
      />
    </Router>
  );

describe('DailyInsightsMain', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('routes to overview with the current data source id', () => {
    renderMain(`${APP_PATH.DAILY_INSIGHTS_OVERVIEW}?dataSourceId=ds-1`);

    expect(screen.getByText('Overview route ds-1')).toBeInTheDocument();
  });

  test('routes to indices management', () => {
    renderMain(APP_PATH.DAILY_INSIGHTS_INDICES);

    expect(screen.getByText('Indices route')).toBeInTheDocument();
  });

  test('redirects the root path to the provided landing page', () => {
    renderMain('/', APP_PATH.DAILY_INSIGHTS_INDICES);

    expect(screen.getByText('Indices route')).toBeInTheDocument();
  });

  test('redirects the root path to overview by default', () => {
    renderMain('/');

    expect(screen.getByText('Overview route no-ds')).toBeInTheDocument();
  });
});
