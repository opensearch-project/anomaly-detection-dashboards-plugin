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
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiLink,
  EuiTitle,
  EuiFieldNumber,
  EuiSpacer,
} from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React, { useState } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { BASE_DOCS_LINK } from '../../../../utils/constants';
import {
  isInvalid,
  getError,
  validatePositiveInteger,
} from '../../../../utils/utils';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';

interface AdvancedSettingsProps {}

export function AdvancedSettings(props: AdvancedSettingsProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(
    false
  );

  return (
    <ContentPanel
      title={
        <EuiFlexGroup direction="row" style={{ margin: '0px' }}>
          <EuiTitle size="s">
            <h2>Advanced settings </h2>
          </EuiTitle>
          <EuiText
            size="m"
            style={{ marginLeft: '18px', marginTop: '5px' }}
            onClick={() => {
              setShowAdvancedSettings(!showAdvancedSettings);
            }}
          >
            <EuiLink>{showAdvancedSettings ? 'Hide' : 'Show'}</EuiLink>
          </EuiText>
        </EuiFlexGroup>
      }
      hideBody={!showAdvancedSettings}
      bodyStyles={{ marginTop: '-16px' }}
    >
      {showAdvancedSettings ? <EuiSpacer size="m" /> : null}
      {showAdvancedSettings ? (
        <Field name="shingleSize" validate={validatePositiveInteger}>
          {({ field, form }: FieldProps) => (
            <FormattedFormRow
              title="Shingle size"
              hint={[
                `Set the number of intervals to consider in a detection
                window for your model. The anomaly detector expects the
                shingle size to be in the range of 1 and 60. The default
                shingle size is 8. We recommend that you don’t choose 1
                unless you have two or more features. Smaller values might
                increase recall but also false positives. Larger values
                might be useful for ignoring noise in a signal.`,
              ]}
              hintLink={`${BASE_DOCS_LINK}/ad`}
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiFieldNumber
                    id="shingleSize"
                    placeholder="Shingle size"
                    data-test-subj="shingleSize"
                    {...field}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <p className="minutes">intervals</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </FormattedFormRow>
          )}
        </Field>
      ) : null}
    </ContentPanel>
  );
}
