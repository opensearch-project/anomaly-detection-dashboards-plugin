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
import { EuiCompressedFormRow, EuiCodeEditor } from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import { isInvalid, getError } from '../../../../utils/utils';

interface CustomAggregationProps {
  index: number;
  isEditable?: boolean;
}

export const validateQuery = (value: string) => {
  try {
    JSON.parse(value);
  } catch (err) {
    console.log('Returning error', err);
    return 'Invalid JSON';
  }
};

export const CustomAggregation = (props: CustomAggregationProps) => {
  const { index, isEditable = true } = props;
  return (
    <Field
      id={`featureList.${props.index}.aggregationQuery`}
      name={`featureList.${props.index}.aggregationQuery`}
      validate={validateQuery}
    >
      {({ field, form }: FieldProps) => (
        <EuiCompressedFormRow
          fullWidth
          label="Expression"
          helpText="Custom expression uses the OpenSearch query DSL."
          isInvalid={isInvalid(field.name, form)}
          error={getError(field.name, form)}
          onClick={() => {
            form.setFieldTouched(
              `featureList.${props.index}.aggregationQuery`,
              true
            );
          }}
        >
          <EuiCodeEditor
            name={`featureList.${props.index}.aggregationQuery`}
            mode="object"
            height="300px"
            width="100%"
            readOnly={!isEditable}
            setOptions={{
              showLineNumbers: false,
              showGutter: false,
              className: 'custom-query-editor',
              showPrintMargin: false,
            }}
            onChange={(query: string) => {
              form.setFieldValue(
                `featureList.${props.index}.aggregationQuery`,
                query
              );
            }}
            onBlur={field.onBlur}
            value={field.value}
          />
        </EuiCompressedFormRow>
      )}
    </Field>
  );
};
