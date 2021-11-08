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

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import {
  APP_PATH,
  PLUGIN_NAME,
  BASE_DOCS_LINK,
} from '../../../../utils/constants';

export const SampleDataCallout = () => {
  return (
    <EuiCallOut
      title="Looking to get more familiar with anomaly detection?"
      color="primary"
      iconType="help"
    >
      <p>
        Read the{' '}
        <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
          documentation
        </EuiLink>{' '}
        or create a{' '}
        <EuiLink href={`${PLUGIN_NAME}#${APP_PATH.OVERVIEW}`}>
          sample detector
        </EuiLink>{' '}
        to get started.
      </p>
    </EuiCallOut>
  );
};
