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
  EuiCompressedFieldNumber,
  EuiSpacer,
  EuiCompressedSelect,
  EuiButtonIcon,
  EuiToolTip,
  EuiSelect,
  EuiButtonEmpty,
} from '@elastic/eui';
import { Field, FieldProps, FieldArray } from 'formik';
import React, { useEffect, useState } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { BASE_DOCS_LINK } from '../../../../utils/constants';
import {
  isInvalid,
  validatePositiveDecimal,
} from '../../../../utils/utils';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';

interface SuppressionRulesProps {
  feature: any;
  featureIndex: any;
}

export function SuppressionRules(props: SuppressionRulesProps) {
  function extractArrayError(fieldName: string, form: any): string {
    const suppressionRulesErrors = form.errors?.suppressionRules;
    if (!Array.isArray(suppressionRulesErrors)) {
      return '';
    }
    if (
      Array.isArray(suppressionRulesErrors) &&
      suppressionRulesErrors.length > 0
    ) {
      for (const arr of suppressionRulesErrors) {
        if (Array.isArray(arr) && arr.length > 0) {
          for (const err of arr) {
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
                    : fieldKey;
                return typeof fieldError === 'string'
                  ? `${friendlyFieldName} ${fieldError.toLowerCase()}`
                  : String(fieldError || '');
              }
            }
          }
        }
      }
    }
    return typeof suppressionRulesErrors === 'string'
      ? suppressionRulesErrors
      : String(suppressionRulesErrors || '');
  }

  return (
    <FieldArray name={`suppressionRules.${props.featureIndex}`}>
      {(arrayHelpers) => (
        <>
          <Field name={`suppressionRules.${props.featureIndex}`}>
            {({ field, form }: FieldProps) => {
              const featureSuppressionRules =
                form.values.suppressionRules?.[props.featureIndex] || [];
              return (
                <>
                  <EuiFlexGroup>
                    <EuiFlexItem
                      grow={false}
                      style={{
                        maxWidth: '1200px',
                        marginTop: '0px',
                        marginBottom: '2px',
                      }}
                    >
                      <FormattedFormRow
                        hint={[
                          `Set rules to ignore anomalies by comparing actual values against expected values.`,
                        ]}
                        hintLink={`${BASE_DOCS_LINK}/ad`}
                        isInvalid={isInvalid(field.name, form)}
                        error={extractArrayError(field.name, form)}
                        fullWidth
                        linkToolTip={true}
                      >
                        <>
                          <EuiSpacer size="s" />

                          <EuiText>
                            <p style={{ fontSize: '15px' }}>
                              Ignore anomalies when the actual value is no more
                              than:
                            </p>
                          </EuiText>
                          {featureSuppressionRules?.map((rule, index) => {
                            if (rule.directionRule) {
                              return null;
                            }
                            const isPercentage =
                              rule.isPercentage !== undefined
                                ? rule.isPercentage
                                : true;
                            return (
                              <EuiFlexGroup
                                key={index}
                                gutterSize="s"
                                alignItems="center"
                                wrap
                              >
                                <EuiFlexItem grow={1}>
                                  <Field
                                    name={`suppressionRules.${props.featureIndex}[${index}].featureName`}
                                  >
                                    {({ field, form }: FieldProps) => {
                                      const currentFeatureName =
                                        props.feature.featureName || '';
                                      React.useEffect(() => {
                                        if (
                                          field.value !== currentFeatureName
                                        ) {
                                          form.setFieldValue(
                                            field.name,
                                            currentFeatureName
                                          );
                                        }
                                      }, [
                                        field.name,
                                        field.value,
                                        currentFeatureName,
                                        form,
                                      ]);

                                      return (
                                        <input
                                          type="hidden"
                                          {...field}
                                          value={props.feature.featureName}
                                        />
                                      );
                                    }}
                                  </Field>
                                  <EuiFlexItem
                                    style={{ flexGrow: 1, minWidth: '200px' }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        minWidth: '110px',
                                      }}
                                    >
                                      <Field
                                        name={`suppressionRules.${
                                          props.featureIndex
                                        }[${index}].${
                                          isPercentage === false
                                            ? 'absoluteThreshold'
                                            : 'relativeThreshold'
                                        }`}
                                        validate={validatePositiveDecimal}
                                      >
                                        {({ field }: FieldProps) => {
                                          return (
                                            <EuiCompressedFieldNumber
                                              style={{ minWidth: '110px' }}
                                              placeholder="Threshold"
                                              fullWidth
                                              onBlur={(e) => {
                                                field.onBlur(e);
                                                form.setFieldTouched(
                                                  field.name,
                                                  true,
                                                  true
                                                );
                                              }}
                                              value={
                                                isPercentage
                                                  ? form.values
                                                      .suppressionRules[
                                                      props.featureIndex
                                                    ][index]
                                                      .relativeThreshold ?? ''
                                                  : form.values
                                                      .suppressionRules[
                                                      props.featureIndex
                                                    ][index]
                                                      .absoluteThreshold ?? ''
                                              }
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                form.setFieldValue(
                                                  `suppressionRules.${
                                                    props.featureIndex
                                                  }[${index}].${
                                                    isPercentage
                                                      ? 'relativeThreshold'
                                                      : 'absoluteThreshold'
                                                  }`,
                                                  value
                                                    ? parseFloat(value)
                                                    : null
                                                );
                                              }}
                                              append={
                                                <EuiCompressedSelect
                                                  id={`thresholdType_${props.featureIndex}_${index}`}
                                                  data-test-subj={`thresholdType-dropdown-${props.featureIndex}-${index}`}
                                                  options={[
                                                    {
                                                      value: 'percentage',
                                                      text: '%',
                                                    },
                                                    {
                                                      value: 'units',
                                                      text: 'Units',
                                                    },
                                                  ]}
                                                  value={
                                                    isPercentage
                                                      ? 'percentage'
                                                      : 'units'
                                                  }
                                                  onChange={(e) => {
                                                    const newValue =
                                                      e.target.value;
                                                    const currentValue =
                                                      form.values
                                                        .suppressionRules[
                                                        props.featureIndex
                                                      ][index][
                                                        newValue ===
                                                        'percentage'
                                                          ? 'absoluteThreshold'
                                                          : 'relativeThreshold'
                                                      ];

                                                    // Update isPercentage
                                                    form.setFieldValue(
                                                      `suppressionRules.${props.featureIndex}[${index}].isPercentage`,
                                                      newValue === 'percentage'
                                                    );

                                                    // Transfer the current value to the correct field
                                                    form.setFieldValue(
                                                      `suppressionRules.${
                                                        props.featureIndex
                                                      }[${index}].${
                                                        newValue ===
                                                        'percentage'
                                                          ? 'relativeThreshold'
                                                          : 'absoluteThreshold'
                                                      }`,
                                                      currentValue !==
                                                        undefined &&
                                                        currentValue !== null
                                                        ? parseFloat(
                                                            currentValue
                                                          )
                                                        : null
                                                    );

                                                    // Clear the old field
                                                    form.setFieldValue(
                                                      `suppressionRules.${
                                                        props.featureIndex
                                                      }[${index}].${
                                                        newValue ===
                                                        'percentage'
                                                          ? 'absoluteThreshold'
                                                          : 'relativeThreshold'
                                                      }`,
                                                      null
                                                    );
                                                  }}
                                                />
                                              }
                                            />
                                          );
                                        }}
                                      </Field>
                                    </div>
                                  </EuiFlexItem>
                                </EuiFlexItem>
                                <EuiFlexItem grow={2}>
                                  <Field
                                    name={`suppressionRules.${props.featureIndex}[${index}].aboveBelow`}
                                  >
                                    {({ field }: FieldProps) => {
                                      const currentRules =
                                        form.values.suppressionRules?.[
                                          props.featureIndex
                                        ] || [];

                                      // Check if there's a directionRule = true and get its "aboveBelow" value
                                      const directionRule = currentRules.find(
                                        (rule) => rule.directionRule === true
                                      );

                                      let options = [
                                        {
                                          value: 'above',
                                          text: 'above the expected value',
                                          disabled: false,
                                        },
                                        {
                                          value: 'below',
                                          text: 'below the expected value',
                                          disabled: false,
                                        },
                                      ];

                                      let tooltipContent =
                                        'Select above or below expected value'; 

                                      // Modify options based on the directionRule logic
                                      if (directionRule) {
                                        options = options.map((option) => ({
                                          ...option,
                                          disabled:
                                            directionRule.aboveBelow !==
                                            option.value, 
                                        }));

                                        if (
                                          field.value !==
                                          directionRule.aboveBelow
                                        ) {
                                          form.setFieldValue(
                                            `suppressionRules.${props.featureIndex}[${index}].aboveBelow`,
                                            directionRule.aboveBelow
                                          );
                                        }
                                        if (directionRule?.aboveBelow) {
                                          const directionText =
                                            directionRule.aboveBelow === 'above'
                                              ? 'exceeds'
                                              : 'drops below';
                                          tooltipContent = `Base criteria includes anomalies where the actual value ${directionText} the expected value. Rules can only be made in this direction.`;
                                        }
                                      }

                                      return (
                                        <EuiToolTip content={tooltipContent}>
                                          <EuiSelect
                                            options={options}
                                            {...field}
                                          />
                                        </EuiToolTip>
                                      );
                                    }}
                                  </Field>
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>
                                  <EuiButtonIcon
                                    iconType="trash"
                                    color="danger"
                                    aria-label="Delete rule"
                                    onClick={() => {
                                      if (
                                        form.values.suppressionRules[
                                          props.featureIndex
                                        ].length === 1
                                      ) {
                                        arrayHelpers.remove(index);
                                        const cleanedSuppressionRules =
                                          form.values.suppressionRules.filter(
                                            (_, i) => i === props.featureIndex
                                          );
                                        form.setFieldValue(
                                          `suppressionRules.`,
                                          cleanedSuppressionRules
                                        );
                                      } else {
                                        arrayHelpers.remove(index);
                                      }
                                    }}
                                  />
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            );
                          })}
                        </>
                      </FormattedFormRow>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              );
            }}
          </Field>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            iconType="plusInCircle"
            onClick={() => {
              arrayHelpers.push({
                featureName: props.feature.featureName,
                absoluteThreshold: null, // Set to null to allow empty inputs
                relativeThreshold: null, // Set to null to allow empty inputs
                aboveBelow: 'above',
                directionRule: false,
              });
            }}
            aria-label="Add rule"
            style={{ marginTop: '5px' }}
          >
            Add suppression rule
          </EuiButtonEmpty>
        </>
      )}
    </FieldArray>
  );
}
