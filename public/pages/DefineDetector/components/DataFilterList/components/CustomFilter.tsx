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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiCodeEditor,
} from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React from 'react';
import { getError, isInvalid } from '../../../../../utils/utils';
import { UIFilter } from '../../../../../models/interfaces';
import { DetectorDefinitionFormikValues } from '../../../models/interfaces';
import { validateFilterQuery } from '../utils/helpers';

interface CustomFilterProps {
  filter: UIFilter;
  index: number;
  values: DetectorDefinitionFormikValues;
  replace(index: number, value: any): void;
}

export const CustomFilter = (props: CustomFilterProps) => {
  return (
    <EuiFlexGroup
      style={{ padding: '0px', width: '400px' }}
      alignItems="stretch"
      direction="column"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <Field
              name={`filters.${props.index}.query`}
              validate={validateFilterQuery}
            >
              {({ field, form }: FieldProps) => (
                <EuiFormRow
                  fullWidth
                  label="OpenSearch query DSL"
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                >
                  <EuiCodeEditor
                    name="query"
                    mode="json"
                    width="100%"
                    height="250px"
                    theme="github"
                    isInvalid={isInvalid(field.name, form)}
                    error={getError(field.name, form)}
                    onChange={(query: string) => {
                      form.setFieldValue(`filters.${props.index}.query`, query);
                    }}
                    onBlur={() => {
                      form.setFieldTouched(`filters.${props.index}.query`);
                    }}
                    value={field.value}
                  />
                </EuiFormRow>
              )}
            </Field>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
