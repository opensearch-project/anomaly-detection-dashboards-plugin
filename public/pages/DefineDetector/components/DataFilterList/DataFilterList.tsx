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
  EuiButtonEmpty,
} from '@elastic/eui';
import { FieldArray, FieldArrayRenderProps, FormikProps } from 'formik';
import React, { useState, Fragment } from 'react';
import { DetectorDefinitionFormikValues } from '../../models/interfaces';
import { UIFilter, FILTER_TYPES } from '../../../../models/interfaces';
import { DataFilter } from './components/DataFilter';

import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { EMPTY_UI_FILTER } from '../../utils/constants';

interface DataFilterListProps {
  formikProps: FormikProps<DetectorDefinitionFormikValues>;
  oldFilterType: FILTER_TYPES;
  oldFilterQuery: any;
}

export const DataFilterList = (props: DataFilterListProps) => {
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number>(-1);
  const [isCreatingNewFilter, setIsCreatingNewFilter] =
    useState<boolean>(false);

  return (
    <FieldArray name="filters" validateOnChange={true}>
      {({ push, remove, replace, form: { values } }: FieldArrayRenderProps) => {
        const lastFilterIndex = values.filters.length - 1;
        if (isCreatingNewFilter && openPopoverIndex !== lastFilterIndex) {
          setIsCreatingNewFilter(false);
          remove(lastFilterIndex);
        }

        return (
          <Fragment>
            <FormattedFormRow
              fullWidth
              formattedTitle={
                <p>
                  Data filter
                  <span className="optional">- optional</span>
                </p>
              }
              hint={[
                'Choose a subset of your data source to focus your data stream and reduce noisy data.',
              ]}
            >
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFlexGroup
                  direction="row"
                  gutterSize="xs"
                  style={{
                    flexWrap: 'wrap',
                  }}
                >
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
                  {values.filters.map((filter: UIFilter, index: number) => {
                    return (
                      <DataFilter
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
                        oldFilterType={props.oldFilterType}
                        oldFilterQuery={props.oldFilterQuery}
                      />
                    );
                  })}
                  {isCreatingNewFilter && values.filters.length > 0 ? null : (
                    <EuiFlexItem grow={false} style={{ marginTop: '0px' }}>
                      <EuiButtonEmpty
                        size="xs"
                        onClick={() => {
                          setIsCreatingNewFilter(true);
                          push(EMPTY_UI_FILTER);
                          setOpenPopoverIndex(lastFilterIndex + 1);
                        }}
                      >
                        + Add data filter
                      </EuiButtonEmpty>
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
