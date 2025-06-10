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

import React, { Fragment } from 'react';
import { useSelector } from 'react-redux';
import { get } from 'lodash';
import { EuiCompressedFormRow, EuiCompressedSelect, EuiCompressedComboBox } from '@elastic/eui';
import { getAllFields } from '../../../../redux/selectors/opensearch';
import {
  getNumberFieldOptions,
  getCountableFieldOptions,
} from '../../utils/helpers';
import { Field, FieldProps } from 'formik';
import { AGGREGATION_TYPES } from '../../utils/constants';
import {
  requiredSelectField,
  requiredNonEmptyFieldSelected,
  isInvalid,
  getError,
} from '../../../../utils/utils';

interface AggregationSelectorProps {
  index?: number;
  isEditable?: boolean;
}

export const AggregationSelector = (props: AggregationSelectorProps) => {
  const { index, isEditable = true } = props;
  const numberFields = getNumberFieldOptions(useSelector(getAllFields));
  const countableFields = getCountableFieldOptions(useSelector(getAllFields));
  return (
    <Fragment>
      <Field
        id={`featureList.${index}.aggregationBy`}
        name={`featureList.${index}.aggregationBy`}
        validate={requiredSelectField}
      >
        {({ field, form }: FieldProps) => (
          <EuiCompressedFormRow
            label="Aggregation method"
            helpText="The aggregation method determines what constitutes an anomaly. For example, if you choose min(), the detector focuses on finding anomalies based on the minimum values of your feature."
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            <EuiCompressedSelect
              id={`featureList.${index}.aggregationBy`}
              {...field}
              name={`featureList.${index}.aggregationBy`}
              options={AGGREGATION_TYPES}
              disabled={!isEditable}
              onChange={(e) => {
                const currentValue = field.value;
                const aggregationOf = get(
                  form,
                  `values.featureList.${index}.aggregationOf.0.type`
                );
                if (
                  currentValue === 'value_count' &&
                  aggregationOf !== 'number'
                ) {
                  form.setFieldValue(
                    `featureList.${index}.aggregationOf`,
                    undefined
                  );
                }
                field.onChange(e);
              }}
              data-test-subj="aggregationType"
            />
          </EuiCompressedFormRow>
        )}
      </Field>

      <Field
        id={`featureList.${index}.aggregationOf`}
        name={`featureList.${index}.aggregationOf`}
        validate={requiredNonEmptyFieldSelected}
      >
        {({ field, form }: FieldProps) => (
          <EuiCompressedFormRow
            label="Field"
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            <EuiCompressedComboBox
              data-test-subj={`featureFieldTextInput-${index}`}
              placeholder="Select field"
              singleSelection={{ asPlainText: true }}
              selectedOptions={field.value}
              isDisabled={!isEditable}
              onCreateOption={(createdOption: string) => {
                const normalizedOptions = createdOption.trim();
                if (!normalizedOptions) return;
                const customOption = [{ label: normalizedOptions }];
                form.setFieldValue(
                  `featureList.${index}.aggregationOf`,
                  customOption
                );
              }}
              //@ts-ignore
              options={
                get(form, `values.featureList.${index}.aggregationBy`) ===
                'value_count'
                  ? countableFields
                  : numberFields
              }
              {...field}
              onClick={() => {
                form.setFieldTouched(
                  `featureList.${index}.aggregationOf`,
                  true
                );
              }}
              onChange={(options: any) => {
                form.setFieldValue(
                  `featureList.${index}.aggregationOf`,
                  options
                );
              }}
            />
          </EuiCompressedFormRow>
        )}
      </Field>
    </Fragment>
  );
};
