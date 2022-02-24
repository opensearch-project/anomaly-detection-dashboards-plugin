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
  OPENSEARCH_DASHBOARDS_NAME,
  OPENSEARCH_DASHBOARDS_PATH,
} from '../../../../utils/constants';

interface SampleIndexDetailsCalloutProps {
  indexName: string;
}

export const SampleIndexDetailsCallout = (
  props: SampleIndexDetailsCalloutProps
) => {
  return (
    <EuiCallOut
      data-test-subj="sampleIndexDetailsCallout"
      title="Want more details on the sample data?"
      color="primary"
      iconType="help"
    >
      <p>
        Check out the{' '}
        <EuiLink
          href={`${OPENSEARCH_DASHBOARDS_NAME}#${OPENSEARCH_DASHBOARDS_PATH.DISCOVER}`}
          target="_blank"
        >
          OpenSearch Dashboards Discover app
        </EuiLink>
        {''} to view the raw data for sample index '{props.indexName}'.
      </p>
    </EuiCallOut>
  );
};
