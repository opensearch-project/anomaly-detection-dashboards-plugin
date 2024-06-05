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
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiLink,
  EuiTitle,
  EuiFieldText,
  EuiCallOut,
  EuiSpacer,
  EuiFormRow,
  EuiCheckbox,
  EuiIcon,
  EuiFieldNumber,
} from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React, { useState } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { CUSTOM_AD_RESULT_INDEX_PREFIX } from '../../../../../server/utils/constants';
import { BASE_DOCS_LINK } from '../../../../utils/constants';
import {
  isInvalid,
  getError,
  validateCustomResultIndex,
  validatePositiveInteger,
} from '../../../../utils/utils';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';

interface CustomResultIndexProps {
  isEdit: boolean;
  useDefaultResultIndex?: boolean;
  resultIndex?: string;
}

function CustomResultIndex(props: CustomResultIndexProps) {
  const [enabled, setEnabled] = useState<boolean>(!!props.resultIndex);

  return (
    <ContentPanel
      title={
        <EuiTitle size="s" id={'resultIndexField'}>
          <h2>Custom result index</h2>
        </EuiTitle>
      }
      subTitle={
        <EuiText
          className="content-panel-subTitle"
          style={{ lineHeight: 'normal' }}
        >
          Store detector results to your own index.{' '}
          <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
            Learn more
          </EuiLink>
        </EuiText>
      }
    >
      <Field
        name="resultIndex"
        validate={enabled ? validateCustomResultIndex : null}
      >
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiCheckbox
                id={'resultIndexCheckbox'}
                label="Enable custom result index"
                checked={enabled}
                disabled={props.isEdit}
                onChange={() => {
                  if (enabled) {
                    form.setFieldValue('resultIndex', '');
                  }
                  setEnabled(!enabled);
                }}
              />
            </EuiFlexItem>

            {enabled ? (
              <EuiFlexItem>
                <EuiCallOut
                  data-test-subj="cannotEditResultIndexCallout"
                  title="You can't change the custom result index after creating the detector. You can manage the result index using the following three settings inside Anomaly Detection plugin or with the Index Management plugin."
                  color="warning"
                  iconType="alert"
                  size="s"
                ></EuiCallOut>
              </EuiFlexItem>
            ) : null}

            {enabled ? (
              <EuiFlexItem>
                <EuiFormRow
                  label="Field"
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                  helpText={`Custom result index name must contain less than 255 characters including the prefix "opensearch-ad-plugin-result-". Valid characters are a-z, 0-9, -(hyphen) and _(underscore).`}
                >
                  <EuiFieldText
                    id="resultIndex"
                    placeholder="Enter result index name"
                    prepend={props.isEdit ? '' : CUSTOM_AD_RESULT_INDEX_PREFIX}
                    disabled={props.isEdit}
                    {...field}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ) : null}
            </EuiFlexGroup>
        )}
      </Field>

      {enabled ? (<Field 
        name="resultIndexMinAge" 
        validate={enabled ? validatePositiveInteger : null}
        >
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup>
            <EuiFlexItem style={{ maxWidth: '70%' }}>
              <FormattedFormRow
                fullWidth
                title="Max Index Age"
                hint={[
                  `This setting would define a specific threshold for the age of an index. When this threshold is surpassed, a rollover will be triggered automatically.`,
                ]}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiFieldNumber
                      name="resultIndexMinAge"
                      id="resultIndexMinAge"
                      data-test-subj="resultIndexMinAge"
                      min={1}
                      {...field}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText>
                      <p className="minutes">days</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormattedFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </Field>) : null}  

      {enabled ? (<Field
        name="resultIndexMinSize"
        validate={enabled ? validatePositiveInteger : null}
        >
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup>
            <EuiFlexItem style={{ maxWidth: '70%' }}>
              <FormattedFormRow
                fullWidth
                title="Max Index Size"
                hint={[
                  `This setting would define a specific threshold for the size of an index. When this threshold is surpassed, a rollover will be triggered automatically.`,
                ]}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiFieldNumber
                      name="resultIndexMinSize"
                      id="resultIndexMinSize"
                      placeholder="Max index size"
                      data-test-subj="resultIndexMinSize"
                      min={1}
                      {...field}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText>
                      <p className="minutes">MB</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormattedFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </Field>) : null}

      {enabled ? (<Field
        name="resultIndexTtl"
        validate={enabled ? validatePositiveInteger : null}
        >
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup>
            <EuiFlexItem style={{ maxWidth: '70%' }}>
              <FormattedFormRow
                fullWidth
                title="Index TTL"
                hint={[
                  `This setting would define the duration after which an index is considered expired and eligible for deletion.`,
                ]}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiFieldNumber
                      name="resultIndexTtl"
                      id="resultIndexTtl"
                      data-test-subj="resultIndexTtl"
                      min={1}
                      {...field}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText>
                      <p className="minutes">days</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormattedFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </Field>) : null}
    </ContentPanel>
  );
}

export default CustomResultIndex;
