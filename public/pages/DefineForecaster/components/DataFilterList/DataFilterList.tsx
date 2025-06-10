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
  EuiSpacer,
  EuiIcon,
  EuiSmallButtonEmpty,
} from '@elastic/eui';
import { FieldArray, FieldArrayRenderProps, FormikProps } from 'formik';
import React, { useState, Fragment } from 'react';
import { ForecasterDefinitionFormikValues } from '../../models/interfaces';
import { UIFilter, FILTER_TYPES } from '../../../../models/interfaces';
import { DataFilter } from './components/DataFilter';

import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { EMPTY_UI_FILTER } from '../../utils/constants';
import { ConfigureFormikValues } from '../../../ForecastDetail/models/interface';

interface DataFilterListProps {
  formikProps: FormikProps<ForecasterDefinitionFormikValues> | FormikProps<ConfigureFormikValues>;
  isEditable?: boolean;
}

export const DataFilterList = (props: DataFilterListProps) => {
  const { isEditable = true } = props;
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number>(-1);
  const [isCreatingNewFilter, setIsCreatingNewFilter] =
    useState<boolean>(false);

  return (
    <FieldArray name="filters" validateOnChange={true}>
      {({ push, remove, replace, form: { values } }: FieldArrayRenderProps) => {
        // Using nullish coalescing (??) to handle undefined filters array
        // If filters is undefined, we want lastFilterIndex to be 0 (1 - 1)
        // Otherwise, get the last index of the existing filters array
        const lastFilterIndex = (values.filters?.length ?? 1) - 1;
        if (isCreatingNewFilter && openPopoverIndex !== lastFilterIndex) {
          setIsCreatingNewFilter(false);
          remove(lastFilterIndex);
        }

        return (
          <Fragment>
            <FormattedFormRow
              fullWidth
            >
              <Fragment>
                <EuiFlexGroup direction="row" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    {values.filters?.length === 0 ||
                    (values.filters?.length === 1 && isCreatingNewFilter) ? (
                      <EuiIcon
                        type="filter"
                        style={{ marginRight: '-4px', marginTop: '2px' }}
                      />
                    ) : (
                      <EuiIcon
                        type="filter"
                        style={{ marginRight: '8px', marginTop: '2px' }}
                      />
                    )}
                  </EuiFlexItem>
                  {values.filters?.map((filter: UIFilter, index: number) => {
                    return (
                      <DataFilter
                        key={index}
                        formikProps={props.formikProps}
                        filter={filter}
                        index={index}
                        values={values}
                        replace={() => replace}
                        onOpen={() => {}}
                        onSave={() => {
                          if (isCreatingNewFilter) {
                            setIsCreatingNewFilter(false);
                          }
                        }}
                        onCancel={() => {
                          if (isCreatingNewFilter) {
                            setIsCreatingNewFilter(false);
                            remove(lastFilterIndex);
                          }
                        }}
                        onDelete={() => {
                          remove(index);
                          setOpenPopoverIndex(-1);
                        }}
                        openPopoverIndex={openPopoverIndex}
                        setOpenPopoverIndex={setOpenPopoverIndex}
                        isNewFilter={
                          isCreatingNewFilter && index === lastFilterIndex
                            ? true
                            : false
                        }
                      />
                    );
                  })}
                  {/* When filters is undefined, length check evaluates to undefined > 0, which is false.
                      Using ?? to explicitly default to 0 for better clarity */}
                  {isCreatingNewFilter && (values.filters?.length ?? 0) > 0 ? null : (
                    <EuiFlexItem grow={false} style={{ marginTop: '0px' }}>
                      <EuiSmallButtonEmpty
                        size="xs"
                        onClick={() => {
                          setIsCreatingNewFilter(true);
                          push(EMPTY_UI_FILTER);
                          setOpenPopoverIndex(lastFilterIndex + 1);
                        }}
                        isDisabled={!isEditable}
                      >
                        + Add data filter
                      </EuiSmallButtonEmpty>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </Fragment>
            </FormattedFormRow>
          </Fragment>
        );
      }}
    </FieldArray>
  );
};
