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
  EuiCompressedComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCompressedFormRow,
  EuiCompressedSelect,
} from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { getAllFields } from '../../../../../redux/selectors/opensearch';
import { cloneDeep, get, debounce, includes } from 'lodash';
import {
  getError,
  isInvalid,
  requiredNonEmptyArray,
} from '../../../../../utils/utils';
import { UIFilter, OPERATORS_MAP } from '../../../../../models/interfaces';
import { DATA_TYPES } from '../../../../../utils/constants';
import { getIndexFields, getOperators, isNullOperator } from '../utils/helpers';
import FilterValue from './FilterValue';
import { ForecasterDefinitionFormikValues } from '../../../models/interfaces';
import { EMPTY_UI_FILTER } from '../../../utils/constants';
import _ from 'lodash';

interface SimpleFilterProps {
  filter: UIFilter;
  index: number;
  values: ForecasterDefinitionFormikValues;
  replace(index: number, value: any): void;
}

// This sorting is needed because we utilize two different ways to get index fields,
// through get mapping call and through field_caps API for remote indices
const sortByLabel = (indexFields) => {
  //sort the `options` array inside each object by the `label` field
  indexFields.forEach(item => {
      item.options = _.sortBy(item.options, 'label');
  });
  //sort the outer array by the `label` field
  return _.sortBy(indexFields, 'label');
};

export const SimpleFilter = (props: SimpleFilterProps) => {
  let indexFields = getIndexFields(useSelector(getAllFields));
  indexFields = sortByLabel(indexFields)
  const [searchedIndexFields, setSearchedIndexFields] = useState<
    ({
      label: DATA_TYPES;
      options: {
        label: string;
        type: DATA_TYPES;
      }[];
    } | null)[]
  >();

  //If user search field name, filter filed names which include user's input word
  //So user can only need to select from the filtered fileds.
  const handleSearchFieldChange = debounce(async (searchValue: string) => {
    let selectedFields: any = [];
    if (searchValue) {
      for (let i = 0; i < indexFields.length; i++) {
        let selectedOptions: any = [];

        let options = indexFields[i]?.options;
        if (options) {
          for (let j = 0; j < options.length; j++) {
            if (includes(options[j].label, searchValue)) {
              selectedOptions.push(options[j]);
            }
          }
          if (selectedOptions.length > 0) {
            selectedFields.push({
              label: indexFields[i]?.label,
              options: selectedOptions,
            });
          }
        }
      }
      setSearchedIndexFields(selectedFields);
    } else {
      setSearchedIndexFields(undefined);
    }
  }, 300);

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
              name={`filters.${props.index}.fieldInfo`}
              validate={requiredNonEmptyArray}
              validateOnChange={true}
            >
              {({ field, form }: FieldProps) => (
                <EuiCompressedFormRow
                  label="Field"
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                >
                  <EuiCompressedComboBox
                    id={`filters.${props.index}.fieldInfo`}
                    singleSelection={{ asPlainText: true }}
                    placeholder="Choose a field"
                    async
                    isClearable
                    //@ts-ignore
                    options={
                      searchedIndexFields ? searchedIndexFields : indexFields
                    }
                    onCreateOption={(createdOption: string) => {
                      const normalizedOptions = createdOption.trim();
                      if (!normalizedOptions) return;
                      const customOption = [{ label: normalizedOptions }];
                      form.setFieldValue(
                        `filters.${props.index}.fieldInfo`,
                        customOption
                      );
                      form.setFieldValue(
                        `filter.${props.index}.fieldValue`,
                        EMPTY_UI_FILTER.fieldValue
                      );
                    }}
                    selectedOptions={field.value}
                    {...field}
                    onChange={(options) => {
                      //Reset operator and values
                      props.replace(props.index, cloneDeep(EMPTY_UI_FILTER));
                      form.setFieldValue(
                        `filters.${props.index}.fieldInfo`,
                        options
                      );
                      form.setFieldTouched(
                        `filters.${props.index}.fieldValue`,
                        false
                      );
                    }}
                    onBlur={() => {
                      form.setFieldTouched(`filters.${props.index}.fieldInfo`);
                    }}
                    onSearchChange={handleSearchFieldChange}
                    isInvalid={isInvalid(field.name, form)}
                  />
                </EuiCompressedFormRow>
              )}
            </Field>
          </EuiFlexItem>
          <EuiFlexItem>
            <Field name={`filters.${props.index}.operator`}>
              {({ field, form }: FieldProps) => (
                <EuiCompressedFormRow
                  label="Operator"
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                >
                  <EuiCompressedSelect
                    id={`filters.${props.index}.operator`}
                    placeholder="Choose an operator"
                    {...field}
                    options={getOperators(
                      get(
                        props.values,
                        `filters.${props.index}.fieldInfo.0.type`,
                        DATA_TYPES.NUMBER
                      )
                    )}
                    onChange={(e) => {
                      const selectedOperator = e.target.value as OPERATORS_MAP;

                      form.setFieldValue(
                        `filters.${props.index}.operator`,
                        selectedOperator
                      );
                      form.setFieldValue(
                        `filters.${props.index}.fieldValue`,
                        EMPTY_UI_FILTER.fieldValue
                      );
                      form.setFieldTouched(
                        `filters.${props.index}.fieldValue`,
                        false
                      );
                      form.setFieldValue(
                        `filters.${props.index}.fieldRangeStart`,
                        EMPTY_UI_FILTER.fieldRangeStart
                      );
                      form.setFieldValue(
                        `filters.${props.index}.fieldRangeEnd`,
                        EMPTY_UI_FILTER.fieldRangeEnd
                      );
                    }}
                  />
                </EuiCompressedFormRow>
              )}
            </Field>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={null}>
        {isNullOperator(
          get(props, 'filter.operator', OPERATORS_MAP.IS)
        ) ? null : (
          <FilterValue
            dataType={get(
              props.values,
              `filters.${props.index}.fieldInfo.0.type`,
              'text'
            )}
            index={props.index}
            operator={props.filter.operator}
            filterValues={props.filter}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
