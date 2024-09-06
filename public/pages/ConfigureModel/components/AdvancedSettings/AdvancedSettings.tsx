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
} from '@elastic/eui';
import { Field, FieldProps, FieldArray } from 'formik';
import React, { useEffect, useState } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { BASE_DOCS_LINK } from '../../../../utils/constants';
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

  const aboveBelowOptions = [
    { value: 'above', text: 'above' },
    { value: 'below', text: 'below' },
  ];

  function extractArrayError(fieldName: string, form: any): string {
    const error = form.errors[fieldName];
    console.log('Error for field:', fieldName, error); // Log the error for debugging

    // Check if the error is an array with objects inside
    if (Array.isArray(error) && error.length > 0) {
      // Iterate through the array to find the first non-empty error message
      for (const err of error) {
        if (typeof err === 'object' && err !== null) {
          const entry = Object.entries(err).find(
            ([_, fieldError]) => fieldError
          ); // Find the first entry with a non-empty error message
          if (entry) {
            const [fieldKey, fieldError] = entry;

            // Replace fieldKey with a more user-friendly name if it matches specific fields
            const friendlyFieldName =
              fieldKey === 'absoluteThreshold'
                ? 'absolute threshold'
                : fieldKey === 'relativeThreshold'
                ? 'relative threshold'
                : fieldKey; // Use the original fieldKey if no match

            return typeof fieldError === 'string'
              ? `${friendlyFieldName} ${fieldError.toLowerCase()}` // Format the error message with the friendly field name
              : String(fieldError || '');
          }
        }
      }
    }

    // Default case to handle other types of errors
    return typeof error === 'string' ? error : String(error || '');
  }

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
                hintLink={`${BASE_DOCS_LINK}/ad`}
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
                    hintLink={`${BASE_DOCS_LINK}/ad`}
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

          <EuiSpacer size="m" />
          <FieldArray name="suppressionRules">
            {(arrayHelpers) => (
              <>
                <Field name="suppressionRules">
                  {({ field, form }: FieldProps) => (
                    <>
                      <EuiFlexGroup>
                        {/* Controls the width of the whole row as FormattedFormRow does not allow that. Otherwise, our row is too packed. */}
                        <EuiFlexItem
                          grow={false}
                          style={{ maxWidth: '1200px' }}
                        >
                          <FormattedFormRow
                            title="Suppression Rules"
                            hint={[
                              `Set rules to ignore anomalies by comparing actual values against expected values.
                          Anomalies can be ignored if the difference is within a specified absolute value or a relative percentage of the expected value.`,
                            ]}
                            hintLink={`${BASE_DOCS_LINK}/ad`}
                            isInvalid={isInvalid(field.name, form)}
                            error={extractArrayError(field.name, form)}
                            fullWidth
                          >
                            <>
                              {form.values.suppressionRules?.map(
                                (rule, index) => (
                                  <EuiFlexGroup
                                    key={index}
                                    gutterSize="s"
                                    alignItems="center"
                                  >
                                    <EuiFlexItem grow={false}>
                                      <EuiText size="s">
                                        Ignore anomalies for the feature
                                      </EuiText>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={2}>
                                      <Field
                                        name={`suppressionRules.${index}.featureName`}
                                      >
                                        {({ field }: FieldProps) => (
                                          <EuiCompressedFieldText
                                            placeholder="Feature name"
                                            {...field}
                                            fullWidth
                                          />
                                        )}
                                      </Field>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={false}>
                                      <EuiText size="s">
                                        when the actual value is no more than
                                      </EuiText>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={1}>
                                      <EuiToolTip content="Absolute threshold value">
                                        <Field
                                          name={`suppressionRules.${index}.absoluteThreshold`}
                                          validate={validatePositiveDecimal}
                                        >
                                          {({ field }: FieldProps) => (
                                            <EuiCompressedFieldNumber
                                              placeholder="Absolute"
                                              {...field}
                                              value={field.value || ''}
                                            />
                                          )}
                                        </Field>
                                      </EuiToolTip>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={false}>
                                      <EuiText size="s">or</EuiText>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={1}>
                                      <EuiToolTip content="Relative threshold value as a percentage">
                                        <Field
                                          name={`suppressionRules.${index}.relativeThreshold`}
                                          validate={validatePositiveDecimal}
                                        >
                                          {({ field }: FieldProps) => (
                                            <div
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                              }}
                                            >
                                              <EuiCompressedFieldNumber
                                                placeholder="Relative"
                                                {...field}
                                                value={field.value || ''}
                                              />
                                              <EuiText size="s">%</EuiText>
                                            </div>
                                          )}
                                        </Field>
                                      </EuiToolTip>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={1}>
                                      <EuiToolTip content="Select above or below expected value">
                                        <Field
                                          name={`suppressionRules.${index}.aboveBelow`}
                                        >
                                          {({ field }: FieldProps) => (
                                            <EuiCompressedSelect
                                              options={aboveBelowOptions}
                                              {...field}
                                            />
                                          )}
                                        </Field>
                                      </EuiToolTip>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={false}>
                                      <EuiText size="s">
                                        the expected value.
                                      </EuiText>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={false}>
                                      <EuiButtonIcon
                                        iconType="trash"
                                        color="danger"
                                        aria-label="Delete rule"
                                        onClick={() =>
                                          arrayHelpers.remove(index)
                                        }
                                      />
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                )
                              )}
                            </>
                          </FormattedFormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </>
                  )}
                </Field>
                <EuiSpacer size="s" />
                <EuiButtonIcon
                  iconType="plusInCircle"
                  onClick={() =>
                    arrayHelpers.push({
                      fieldName: '',
                      absoluteThreshold: null, // Set to null to allow empty inputs
                      relativeThreshold: null, // Set to null to allow empty inputs
                      aboveBelow: 'above',
                    })
                  }
                  aria-label="Add rule"
                />
              </>
            )}
          </FieldArray>
        </>
      ) : null}
    </ContentPanel>
  );
}
