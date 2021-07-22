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
        <EuiLink href={`${PLUGIN_NAME}#${APP_PATH.SAMPLE_DETECTORS}`}>
          sample detector
        </EuiLink>{' '}
        to get started.
      </p>
    </EuiCallOut>
  );
};
