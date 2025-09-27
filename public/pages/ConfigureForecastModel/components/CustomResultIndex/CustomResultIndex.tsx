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
  EuiCompressedFieldText,
  EuiCallOut,
  EuiSpacer,
  EuiCompressedFormRow,
  EuiCompressedCheckbox,
  EuiIcon,
  EuiCompressedFieldNumber,
} from '@elastic/eui';
import { Field, FieldProps, FormikProps, useFormikContext } from 'formik';
import React, { useEffect, useState } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { CUSTOM_FORECASTER_RESULT_INDEX_PREFIX } from '../../../../../server/utils/constants';
import { FORECASTER_DOCS_LINK } from '../../../../utils/constants';
import {
  isInvalid,
  getError,
  validateCustomResultIndex,
  validateEmptyOrPositiveInteger,
} from '../../../../utils/utils';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { ModelConfigurationFormikValues } from '../../models/interfaces';
import { DetailsFormikValues } from '../../../ForecastDetail/models/interface';
import { get } from 'lodash';

interface CustomResultIndexProps {
  useDefaultResultIndex?: boolean;
  resultIndex?: string;
  formikProps: FormikProps<ModelConfigurationFormikValues> | FormikProps<DetailsFormikValues>;
  readOnly?: boolean;
}

function CustomResultIndex(props: CustomResultIndexProps) {
  const [enabled, setEnabled] = useState<boolean>(!!props.resultIndex);
  const [customResultIndexConditionsEnabled, setCustomResultIndexConditionsEnabled] = useState<boolean>(true);
  const customResultIndexMinAge = get(props.formikProps, 'values.resultIndexMinAge');
  const customResultIndexMinSize = get(props.formikProps, 'values.resultIndexMinSize');
  const customResultIndexTTL = get(props.formikProps, 'values.resultIndexTtl');
  const { setFieldValue } = useFormikContext();

  useEffect(() => {
    if (customResultIndexMinAge === undefined && customResultIndexMinSize === undefined && customResultIndexTTL === undefined) {
      setCustomResultIndexConditionsEnabled(false);
    }

    if (!customResultIndexConditionsEnabled) {
      setFieldValue('resultIndexMinAge', '');
      setFieldValue('resultIndexMinSize', '');
      setFieldValue('resultIndexTtl', '');
    }
  },[customResultIndexConditionsEnabled])

  const hintTextStyle = {
    color: '#69707d',
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 'normal',
    fontFamily: 'Helvetica, sans-serif',
    textAlign: 'left',
    // Ensures long text wraps within the container and doesn't overflow
    wordWrap: 'break-word',
    maxWidth: '400px',
};

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
          Store forecaster results to your own index.{' '}
          <EuiLink href={`${FORECASTER_DOCS_LINK}`} target="_blank">
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
              <EuiCompressedCheckbox
                id={'resultIndexCheckbox'}
                label="Enable custom result index"
                checked={enabled}
                disabled={props.readOnly}
                onChange={() => {
                  if (!props.readOnly) {
                    if (enabled) {
                      form.setFieldValue('resultIndex', undefined);
                    }
                    setEnabled(!enabled);
                  }
                }}
              />
            </EuiFlexItem>


            {/* Unlike anomaly detection, forecasting allows editing of all fields after creation */}

            {enabled ? (
              <EuiFlexItem>
                <EuiCompressedFormRow
                  label="Field"
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                  helpText={`Custom result index name must contain less than 255 characters including the prefix "opensearch-forecast-result-". Valid characters are a-z, 0-9, -(hyphen) and _(underscore).`}
                >
                  <EuiCompressedFieldText
                    id="resultIndex"
                    placeholder="Enter result index name"
                    prepend={CUSTOM_FORECASTER_RESULT_INDEX_PREFIX}
                    disabled={props.readOnly}
                    name={field.name}
                    onBlur={field.onBlur}
                    value={
                      field.value && field.value.startsWith(CUSTOM_FORECASTER_RESULT_INDEX_PREFIX)
                        ? field.value.substring(CUSTOM_FORECASTER_RESULT_INDEX_PREFIX.length)
                        : field.value || ''
                    }
                    onChange={(e) => {
                      const userInput = e.target.value;
                      const fullValue = CUSTOM_FORECASTER_RESULT_INDEX_PREFIX + userInput;
                      form.setFieldValue(field.name, fullValue);
                    }}
                  />
                </EuiCompressedFormRow>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        )}
      </Field>

      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          { enabled ? (
            <Field
              name="flattenCustomResultIndex">
            {({ field, form }: FieldProps) => (
              <EuiFlexGroup>
                <EuiFlexItem style={{ maxWidth: '100%' }}>
                  <EuiCompressedCheckbox
                    id={'flattenCustomResultIndex'}
                    label="Enable flattened custom result index"
                    checked={field.value ? field.value : get(props.formikProps, 'values.flattenCustomResultIndex')}
                    disabled={props.readOnly}
                    {...field}
                  />
                  <p style={hintTextStyle}>Flattening the custom result index will make it easier to query them on the dashboard. It also allows you to perform term aggregations on categorical fields.</p>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </Field>) : null}
        </EuiFlexItem>
        <EuiFlexItem>
          {enabled ? (
            <EuiFlexItem>
              <EuiCompressedCheckbox
                id={'resultIndexConditionCheckbox'}
                label="Enable custom result index lifecycle management"
                checked={customResultIndexConditionsEnabled}
                disabled={props.readOnly}
                onChange={() => {
                  if (!props.readOnly) {
                    setCustomResultIndexConditionsEnabled(!customResultIndexConditionsEnabled);
                  }
                }}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>

      { (enabled && customResultIndexConditionsEnabled) ? (<Field
        name="resultIndexMinAge"
        validate={(enabled && customResultIndexConditionsEnabled) ? validateEmptyOrPositiveInteger : null}
        >
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup>
            <EuiFlexItem style={{ maxWidth: '70%' }}>
              <FormattedFormRow
                fullWidth
                formattedTitle={
                  <p>
                    Min Index Age <span className="optional">- optional</span>
                  </p>
                }
                hint={[
                  `This setting would define a specific threshold for the age of an index. When this threshold is surpassed, a rollover will be triggered automatically.`,
                ]}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiCompressedFieldNumber
                      name="resultIndexMinAge"
                      id="resultIndexMinAge"
                      data-test-subj="resultIndexMinAge"
                      placeholder="Min index age"
                      min={1}
                      disabled={props.readOnly}
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

      {(enabled && customResultIndexConditionsEnabled) ? (<Field
        name="resultIndexMinSize"
        validate={(enabled && customResultIndexConditionsEnabled) ? validateEmptyOrPositiveInteger : null}
        >
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup>
            <EuiFlexItem style={{ maxWidth: '70%' }}>
              <FormattedFormRow
                fullWidth
                formattedTitle={
                  <p>
                    Min Index Size <span className="optional">- optional</span>
                  </p>
                }
                hint={[
                  `This setting would define a specific threshold for the size of an index. When this threshold is surpassed, a rollover will be triggered automatically.`,
                ]}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiCompressedFieldNumber
                      name="resultIndexMinSize"
                      id="resultIndexMinSize"
                      placeholder="Min index size"
                      data-test-subj="resultIndexMinSize"
                      min={1000}
                      disabled={props.readOnly}
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

      {(enabled && customResultIndexConditionsEnabled) ? (<Field
        name="resultIndexTtl"
        validate={(enabled && customResultIndexConditionsEnabled) ? validateEmptyOrPositiveInteger : null}
        >
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup>
            <EuiFlexItem style={{ maxWidth: '70%' }}>
              <FormattedFormRow
                fullWidth
                formattedTitle={
                  <p>
                    Index TTL <span className="optional">- optional</span>
                  </p>
                }
                hint={[
                  `This setting would define the duration after which an index is considered expired and eligible for deletion.`,
                ]}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiCompressedFieldNumber
                      name="resultIndexTtl"
                      id="resultIndexTtl"
                      data-test-subj="resultIndexTtl"
                      placeholder="Index TTL"
                      min={1}
                      disabled={props.readOnly}
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
