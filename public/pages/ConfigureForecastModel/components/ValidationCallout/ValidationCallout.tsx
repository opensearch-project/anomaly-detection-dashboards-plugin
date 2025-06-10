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
import {
  EuiCallOut,
} from '@elastic/eui';

interface ValidationCalloutProps {
  isLoading?: boolean;
  validationResponse?: string;
}

export const ValidationCallout = ({
  isLoading,
  validationResponse,
}: ValidationCalloutProps) => {
  if (validationResponse && !isLoading) {
        return (
          <EuiCallOut
            title="Not enough data"
            color="warning"
            iconType="alert"
            size="s"
            style={{ marginBottom: '10px' }}
          >
            {validationResponse}
          </EuiCallOut>
        );
  }

  return null;
};