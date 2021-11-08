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
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React from 'react';
import { get } from 'lodash';
import { UIFilter } from '../../../../../models/interfaces';
import { DATA_TYPES } from '../../../../../utils/constants';
import { getError, isInvalid, required } from '../../../../../utils/utils';
import { OPERATORS_MAP, WHERE_BOOLEAN_FILTERS } from '../utils/constant';
import { isRangeOperator, validateStart, validateEnd } from '../utils/helpers';

interface FilterValueProps {
  dataType: string;
  operator: OPERATORS_MAP;
  index: number;
  filterValues: UIFilter;
}

function FilterValue(props: FilterValueProps) {
  if (props.dataType === DATA_TYPES.NUMBER) {
    if (isRangeOperator(props.operator)) {
      return (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <Field
              name={`filters.${props.index}.fieldRangeStart`}
              validate={(val: number | string) =>
                validateStart(
                  val,
                  get(props, 'filterValues.fieldRangeEnd', undefined)
                )
              }
            >
              {({ field, form }: FieldProps) => (
                <EuiFormRow
                  label="From"
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                >
                  <EuiFieldNumber
                    {...field}
                    isInvalid={isInvalid(field.name, form)}
                  />
                </EuiFormRow>
              )}
            </Field>
          </EuiFlexItem>
          <EuiFlexItem>
            <Field
              name={`filters.${props.index}.fieldRangeEnd`}
              validate={(val: number | string) =>
                validateEnd(
                  val,
                  get(props, 'filterValues.fieldRangeStart', undefined)
                )
              }
            >
              {({ field, form }: FieldProps) => (
                <EuiFormRow
                  label="To"
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                >
                  <EuiFieldNumber
                    {...field}
                    isInvalid={isInvalid(field.name, form)}
                    onBlur={() => {
                      form.setFieldTouched(`filters.${props.index}.fieldValue`);
                    }}
                  />
                </EuiFormRow>
              )}
            </Field>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    } else {
      return (
        <Field name={`filters.${props.index}.fieldValue`} validate={required}>
          {({ field, form }: FieldProps) => (
            <EuiFormRow
              label="Value"
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
            >
              <EuiFieldNumber
                {...field}
                isInvalid={isInvalid(field.name, form)}
              />
            </EuiFormRow>
          )}
        </Field>
      );
    }
  } else if (props.dataType == DATA_TYPES.BOOLEAN) {
    return (
      <Field name={`filters.${props.index}.fieldValue`} validate={required}>
        {({ field, form }: FieldProps) => (
          <EuiFormRow
            label="Value"
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            <EuiSelect
              {...field}
              options={WHERE_BOOLEAN_FILTERS}
              isInvalid={isInvalid(field.name, form)}
            />
          </EuiFormRow>
        )}
      </Field>
    );
  } else {
    return (
      <Field name={`filters.${props.index}.fieldValue`} validate={required}>
        {({ field, form }: FieldProps) => (
          <EuiFormRow label="Value">
            <EuiFieldText {...field} isInvalid={isInvalid(field.name, form)} />
          </EuiFormRow>
        )}
      </Field>
    );
  }
}

export default FilterValue;
