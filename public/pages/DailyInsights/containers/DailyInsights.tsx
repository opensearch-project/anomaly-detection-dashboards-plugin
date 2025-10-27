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
  EuiSpacer,
  EuiPageHeader,
  EuiText
} from '@elastic/eui';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';

interface DailyInsightsProps extends RouteComponentProps {
  setActionMenu?: (menuMount: any) => void;
}

export function DailyInsights(props: DailyInsightsProps) {

  return (
    <React.Fragment>
      <EuiPageHeader
        pageTitle={
            <EuiText size="s">
              <h1>Daily Insights</h1>
            </EuiText>
        }
        description="View daily anomaly detection insights and summaries"
      />
      <EuiSpacer size="l" />

      <ContentPanel
        title="Welcome to Daily Insights"
        subTitle="This page provides a summary of your anomaly detection insights"
      >
        <EuiText>
          <p>
            Daily Insights helps you understand patterns and anomalies detected in your data.
            This is a new feature that will provide daily summaries of anomaly detection results.
          </p>
          <EuiSpacer size="m" />
        </EuiText>
      </ContentPanel>

      <EuiSpacer size="l" />
    </React.Fragment>
  );
}

