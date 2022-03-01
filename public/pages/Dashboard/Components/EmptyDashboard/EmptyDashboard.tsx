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

import { EuiEmptyPrompt, EuiLink, EuiIcon } from '@elastic/eui';
import React, { Component, Fragment } from 'react';
import { CreateDetectorButtons } from '../../../../components/CreateDetectorButtons/CreateDetectorButtons';
import { BASE_DOCS_LINK } from '../../../../utils/constants';

export class EmptyDashboard extends Component<{}, {}> {
  render() {
    return (
      <EuiEmptyPrompt
        data-test-subj="emptyDashboardHeader"
        title={<h2>You have no detectors</h2>}
        body={
          <Fragment>
            <p>Create detector first to detect anomalies in your data.</p>
            <p>
              Dashboard will generate insights on the anomalies across all of
              your detectors.
            </p>
            <p>
              Read about{' '}
              <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
                Get started with Anomaly detection &nbsp;
                <EuiIcon size="s" type="popout" />
              </EuiLink>{' '}
            </p>
          </Fragment>
        }
        actions={<CreateDetectorButtons />}
      />
    );
  }
}
