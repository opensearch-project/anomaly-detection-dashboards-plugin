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
import React, { useEffect, useState, useMemo } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { BASE_DOCS_LINK } from '../../../../utils/constants';
import {
  getError,
  isInvalid,
  validatePositiveDecimal,
} from '../../../../utils/utils';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { EuiFormRow } from '@opensearch-project/oui';
import { FeatureAttributes } from '../../../../models/interfaces';

interface SuppressionRulesProps {
  feature: FeatureAttributes;
  featureIndex: number;
}

export function SuppressionRules(props: SuppressionRulesProps) {
  //This method makes sure we extract errrors for each suppression rule, and the corret error
  // is later displayed below each individual field such as the threshold number field or the above/below select box
  function extractError(fieldName: string, form: any): string | undefined {
    const errors = form.errors?.suppressionRules;

    // check errors are in array
    if (!Array.isArray(errors)) return undefined;

    // extract featureIndex and ruleIndex
    const match = fieldName.match(/suppressionRules\.(\d+)\[(\d+)\]\.(.*)/);
    if (!match) return undefined;

    const [, featureIndex, ruleIndex, key] = match;

    const ruleErrors = errors[featureIndex]?.[ruleIndex];

    // return the specific error for the given key
    return ruleErrors?.[key] || undefined;
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

                            const thresholdFieldName = `suppressionRules.${
                              props.featureIndex
                            }[${index}].${
                              isPercentage === false
                                ? 'absoluteThreshold'
                                : 'relativeThreshold'
                            }`;

                            const thresholdError = extractError(
                              thresholdFieldName,
                              form
                            );

                            return (
                              <EuiFlexGroup
                                key={index}
                                style={{
                                  paddingLeft: '0.1px',
                                  marginTop: '-20px',
                                }}
                              >
                                <EuiFlexItem
                                  style={{ marginBottom: '0px' }}
                                  grow={1}
                                >
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
                                    style={{ flexGrow: 1, minWidth: '165px' }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        minWidth: '110px',
                                      }}
                                    >
                                      <FormattedFormRow
                                        isInvalid={!!thresholdError}
                                        error={thresholdError}
                                        fullWidth
                                      >
                                        <EuiFlexGroup
                                          gutterSize="none"
                                          alignItems="center"
                                        >
                                          <EuiFlexItem grow={false}>
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
                                                    style={{
                                                      minWidth: '100px',
                                                      maxWidth: '160px',
                                                    }}
                                                    placeholder="Threshold"
                                                    fullWidth
                                                    name={field.name}
                                                    isInvalid={!!thresholdError}
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
                                                            .relativeThreshold ??
                                                          ''
                                                        : form.values
                                                            .suppressionRules[
                                                            props.featureIndex
                                                          ][index]
                                                            .absoluteThreshold ??
                                                          ''
                                                    }
                                                    onChange={(e) => {
                                                      const value =
                                                        e.target.value;
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
                                                  />
                                                );
                                              }}
                                            </Field>
                                          </EuiFlexItem>

                                          <EuiFlexItem grow={false}>
                                            <EuiCompressedSelect
                                              style={{ minWidth: '80px' }}
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
                                                const newValue = e.target.value;
                                                const currentValue =
                                                  form.values.suppressionRules[
                                                    props.featureIndex
                                                  ][index][
                                                    newValue === 'percentage'
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
                                                    newValue === 'percentage'
                                                      ? 'relativeThreshold'
                                                      : 'absoluteThreshold'
                                                  }`,
                                                  currentValue !== undefined &&
                                                    currentValue !== null
                                                    ? parseFloat(currentValue)
                                                    : null
                                                );

                                                // Clear the old field
                                                form.setFieldValue(
                                                  `suppressionRules.${
                                                    props.featureIndex
                                                  }[${index}].${
                                                    newValue === 'percentage'
                                                      ? 'absoluteThreshold'
                                                      : 'relativeThreshold'
                                                  }`,
                                                  null
                                                );
                                              }}
                                            />
                                          </EuiFlexItem>
                                        </EuiFlexGroup>
                                      </FormattedFormRow>
                                    </div>
                                  </EuiFlexItem>
                                </EuiFlexItem>
                                <EuiFlexItem
                                  style={{
                                    flexGrow: 1,
                                    minWidth: '165px',
                                    marginLeft: '2px',
                                    marginRight: '2px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      minWidth: '110px',
                                      maxWidth: '230px',
                                    }}
                                  >
                                    <FormattedFormRow
                                      isInvalid={
                                        !!extractError(
                                          `suppressionRules.${props.featureIndex}[${index}].aboveBelow`,
                                          form
                                        )
                                      }
                                      error={extractError(
                                        `suppressionRules.${props.featureIndex}[${index}].aboveBelow`,
                                        form
                                      )}
                                      fullWidth
                                    >
                                      <Field
                                        name={`suppressionRules.${props.featureIndex}[${index}].aboveBelow`}
                                        validate={(value) => {
                                          // Get the directionRule for the current featureIndex
                                          const directionRule =
                                            featureSuppressionRules.find(
                                              (r) => r.directionRule === true
                                            );
                                          if (
                                            directionRule &&
                                            value !== directionRule.aboveBelow
                                          ) {
                                            return `Rules can only be made in the ${directionRule.aboveBelow} direction. Same as the base criteria`;
                                          } else {
                                            return undefined;
                                          }
                                        }}
                                      >
                                        {({ field }: FieldProps) => (
                                          <EuiToolTip content="Select above or below expected value">
                                            <EuiCompressedSelect
                                              isInvalid={
                                                !!extractError(
                                                  `suppressionRules.${props.featureIndex}[${index}].aboveBelow`,
                                                  form
                                                )
                                              }
                                              options={[
                                                {
                                                  value: 'above',
                                                  text: 'above the expected value',
                                                },
                                                {
                                                  value: 'below',
                                                  text: 'below the expected value',
                                                },
                                              ]}
                                              {...field}
                                            />
                                          </EuiToolTip>
                                        )}
                                      </Field>
                                    </FormattedFormRow>
                                  </div>
                                </EuiFlexItem>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginTop: '12px',
                                    maxHeight: '70px',
                                  }}
                                >
                                  <EuiFlexItem>
                                    <EuiButtonIcon
                                      iconType="trash"
                                      color="danger"
                                      aria-label="Delete rule"
                                      onClick={() => {
                                        arrayHelpers.remove(index);
                                      }}
                                    />
                                  </EuiFlexItem>
                                </div>
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
              // Access form values from arrayHelpers context
              const featureSuppressionRules =
                arrayHelpers.form.values.suppressionRules?.[
                  props.featureIndex
                ] || [];
              const directionRule = featureSuppressionRules.find(
                (rule) => rule.directionRule === true
              );

              // Set aboveBelow based on the directionRule
              const aboveBelow = directionRule
                ? directionRule.aboveBelow
                : 'above';

              arrayHelpers.push({
                featureName: props.feature.featureName,
                absoluteThreshold: null,
                relativeThreshold: null,
                aboveBelow: aboveBelow,
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
