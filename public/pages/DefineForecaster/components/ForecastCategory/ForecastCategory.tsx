/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiCallOut,
  EuiSpacer,
  EuiCompressedFormRow,
  EuiCompressedComboBox,
  EuiCompressedCheckbox,
  EuiTitle,
} from '@elastic/eui';
import { Field, FieldProps, FormikProps } from 'formik';
import { get, isEmpty } from 'lodash';
import {
  isInvalid,
  getError,
  validateCategoryField,
} from '../../../../utils/utils';
import { ForecasterDefinitionFormikValues } from '../../../DefineForecaster/models/interfaces';
import { ConfigureFormikValues } from '../../../ForecastDetail/models/interface';

interface ForecastCategoryFieldProps {
  isEdit: boolean;
  isEditable?: boolean;
  isHCForecaster: boolean;
  categoryFieldOptions: string[];
  setIsHCForecaster(isHCForecaster: boolean): void;
  isLoading: boolean;
  formikProps: FormikProps<ForecasterDefinitionFormikValues> | FormikProps<ConfigureFormikValues>;
}

export function ForecastCategoryField(props: ForecastCategoryFieldProps) {
  const { isEdit, isEditable = true } = props;
  // Checkbox is enabled (checked) by default now.
  const [enabled, setEnabled] = useState<boolean>(props.isHCForecaster);

  useEffect(() => {
    setEnabled(props.isHCForecaster);
  }, [props.isHCForecaster]);

  console.log("enabled", enabled, props.isHCForecaster);

  const noCategoryFields = isEmpty(props.categoryFieldOptions);
  const convertedOptions = props.categoryFieldOptions.map((option: string) => ({
    label: option,
  }));

  useEffect(() => {
    // Keep the enabled state in sync if editing
    if (props.isEdit) {
      setEnabled(props.isHCForecaster);
    }
  }, [props.isHCForecaster, props.isEdit]);

  return (
    <>
      <Field
        name="categoryField"
        validate={enabled ? validateCategoryField : null}
      >
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiCompressedCheckbox
                id="categoryFieldCheckbox"
                data-test-subj="categoryFieldCheckbox"
                label="Split time series using categorical fields"
                checked={enabled}
                disabled={noCategoryFields || !isEditable}
                onChange={() => {
                  if (!enabled) {
                    props.setIsHCForecaster(true);
                  } else {
                    props.setIsHCForecaster(false);
                    form.setFieldValue('categoryField', []);
                  }
                  setEnabled(!enabled);
                }}
              />
            </EuiFlexItem>

            {/* The dropdown is shown immediately after if enabled. */}
            {enabled && !noCategoryFields && (
              <EuiFlexItem>
                <EuiCompressedFormRow
                  label="Categorical fields"
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                  helpText="Select up to two categorical fields. You can only apply the categorical fields to the 'ip' and 'keyword' OpenSearch data types."
                >
                  <EuiCompressedComboBox
                    data-test-subj="categoryFieldComboBox"
                    id="categoryField"
                    placeholder="Select your categorical fields"
                    options={convertedOptions}
                    onBlur={() => form.setFieldTouched('categoryField', true)}
                    onChange={(options) => {
                      const selection = options.map((o) => o.label);
                      // Only allow up to 2
                      if (selection.length <= 2) {
                        form.setFieldValue('categoryField', selection);
                      }
                    }}
                    selectedOptions={
                      field.value
                        ? field.value.map((val: string) => ({ label: val }))
                        : []
                    }
                    singleSelection={false}
                    isClearable
                    isDisabled={!isEditable}
                  />
                </EuiCompressedFormRow>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </Field>
    </>
  );
}
