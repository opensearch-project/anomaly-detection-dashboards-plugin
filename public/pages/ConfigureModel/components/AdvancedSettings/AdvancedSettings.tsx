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
  EuiCompressedFieldNumber,
  EuiSpacer,
  EuiCompressedSelect,
  EuiButtonIcon,
  EuiCompressedFieldText,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import { Field, FieldProps, FieldArray } from 'formik';
import React, { useEffect, useState } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { AD_DOCS_LINK } from '../../../../utils/constants';
import {
  isInvalid,
  getError,
  validatePositiveInteger,
  validatePositiveDecimal,
} from '../../../../utils/utils';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { SparseDataOptionValue } from '../../utils/constants';

interface AdvancedSettingsProps {}

export function AdvancedSettings(props: AdvancedSettingsProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] =
    useState<boolean>(false);

  // Options for the sparse data handling dropdown
  const sparseDataOptions = [
    { value: SparseDataOptionValue.IGNORE, text: 'Ignore missing value' },
    { value: SparseDataOptionValue.PREVIOUS_VALUE, text: 'Previous value' },
    { value: SparseDataOptionValue.SET_TO_ZERO, text: 'Set to zero' },
    { value: SparseDataOptionValue.CUSTOM_VALUE, text: 'Custom value' },
  ];
  
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
        <>
          <Field name="shingleSize" validate={validatePositiveInteger}>
            {({ field, form }: FieldProps) => (
              <FormattedFormRow
                title="Shingle size"
                hint={[
                  `Set the number of intervals to consider in a detection
                window for your model. The anomaly detector expects the
                shingle size to be in the range of 1 and 128. The default
                shingle size is 8. We recommend that you don’t choose 1
                unless you have two or more features. Smaller values might
                increase recall but also false positives. Larger values
                might be useful for ignoring noise in a signal.`,
                ]}
                hintLink={`${AD_DOCS_LINK}`}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiCompressedFieldNumber
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

          <Field
            name="imputationOption.imputationMethod"
            id="imputationOption.imputationMethod"
          >
            {({ field, form }: FieldProps) => {
              // Add an empty row if CUSTOM_VALUE is selected and no rows exist
              useEffect(() => {
                if (
                  field.value === SparseDataOptionValue.CUSTOM_VALUE &&
                  (!form.values.imputationOption?.custom_value ||
                    form.values.imputationOption.custom_value.length === 0)
                ) {
                  form.setFieldValue('imputationOption.custom_value', [
                    { featureName: '', value: undefined },
                  ]);
                }
              }, [field.value, form]);

              return (
                <>
                  <FormattedFormRow
                    title="Sparse data handling"
                    hint={[`Choose how to handle missing data points.`]}
                    hintLink={`${AD_DOCS_LINK}`}
                    isInvalid={isInvalid(field.name, form)}
                    error={getError(field.name, form)}
                  >
                    <EuiCompressedSelect
                      {...field}
                      options={sparseDataOptions}
                    />
                  </FormattedFormRow>

                  {/* Conditionally render the "Custom value" title and the input fields when 'Custom value' is selected */}
                  {field.value === SparseDataOptionValue.CUSTOM_VALUE && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiText size="xs">
                        <h5>Custom value</h5>
                      </EuiText>
                      <EuiSpacer size="s" />
                      <FieldArray name="imputationOption.custom_value">
                        {(arrayHelpers) => (
                          <>
                            {form.values.imputationOption.custom_value?.map(
                              (_, index) => (
                                <EuiFlexGroup
                                  key={index}
                                  gutterSize="s"
                                  alignItems="center"
                                >
                                  <EuiFlexItem grow={false}>
                                    <Field
                                      name={`imputationOption.custom_value.${index}.featureName`}
                                      id={`imputationOption.custom_value.${index}.featureName`}
                                    >
                                      {({ field }: FieldProps) => (
                                        <EuiCompressedFieldText
                                          placeholder="Feature name"
                                          {...field}
                                        />
                                      )}
                                    </Field>
                                  </EuiFlexItem>
                                  <EuiFlexItem grow={false}>
                                    <Field
                                      name={`imputationOption.custom_value.${index}.data`}
                                      id={`imputationOption.custom_value.${index}.data`}
                                    >
                                      {/* the value is set to field.value || '' to avoid displaying 0 as a default value. */}
                                      {({ field, form }: FieldProps) => (
                                        <EuiCompressedFieldNumber
                                          placeholder="Custom value"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      )}
                                    </Field>
                                  </EuiFlexItem>
                                  <EuiFlexItem grow={false}>
                                    <EuiButtonIcon
                                      iconType="trash"
                                      color="danger"
                                      aria-label="Delete row"
                                      onClick={() => arrayHelpers.remove(index)}
                                    />
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                              )
                            )}
                            <EuiSpacer size="s" />
                            {/* add new rows with empty values when the add button is clicked. */}
                            <EuiButtonIcon
                              iconType="plusInCircle"
                              onClick={() =>
                                arrayHelpers.push({ featureName: '', value: 0 })
                              }
                              aria-label="Add row"
                            />
                          </>
                        )}
                      </FieldArray>
                    </>
                  )}
                </>
              );
            }}
          </Field>
        </>
      ) : null}
    </ContentPanel>
  );
}
