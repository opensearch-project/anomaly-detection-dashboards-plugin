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
  EuiSmallButton,
  EuiBadge,
  EuiSmallButtonEmpty,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiCompressedSwitch,
  EuiCompressedFieldText,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { FormikProps } from 'formik';
import { get, isEmpty } from 'lodash';
import { UIFilter } from '../../../../../models/interfaces';
import { SimpleFilter } from './SimpleFilter';
import { CustomFilter } from './CustomFilter';
import { FormattedFormRow } from '../../../../../components/FormattedFormRow/FormattedFormRow';
import { ForecasterDefinitionFormikValues } from '../../../models/interfaces';
import { FILTER_TYPES } from '../../../../../models/interfaces';
import { getFilterLabel } from '../utils/helpers';

interface DataFilterProps {
  formikProps: FormikProps<ForecasterDefinitionFormikValues>;
  filter: UIFilter;
  index: number;
  values: ForecasterDefinitionFormikValues;
  replace(index: number, value: any): void;
  onOpen(): void;
  onSave(): void;
  onCancel(): void;
  onDelete(): void;
  openPopoverIndex: number;
  setOpenPopoverIndex(index: number): void;
  isNewFilter: boolean;
}

export const DataFilter = (props: DataFilterProps) => {
  const isPopoverOpen = props.openPopoverIndex === props.index;

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [origFilter, setOrigFilter] = useState<UIFilter | undefined>(undefined);
  const [filterType, setFilterType] = useState<FILTER_TYPES>(
    get(props, 'filter.filterType', FILTER_TYPES.SIMPLE)
  );
  const [isCustomLabel, setIsCustomLabel] = useState<boolean>(false);
  const [customLabel, setCustomLabel] = useState<string>(
    get(props, 'filter.label', '')
  );
  const [labelToDisplay, setLabelToDisplay] = useState<string>(
    get(props, 'filter.label', '')
  );

  // When the popover is first opened: save the original filter values to replace in case
  // the user cancels or clicks away
  const openPopover = () => {
    props.setOpenPopoverIndex(props.index);
    setIsSaving(false);
    setIsClosing(false);
    setOrigFilter(props.filter);
    setFilterType(
      props.oldFilterType !== undefined
        ? props.oldFilterType
        : get(props, 'filter.filterType', FILTER_TYPES.SIMPLE)
    );
    setIsCustomLabel(get(props, 'filter.label', '').length > 0);
    setCustomLabel(get(props, 'filter.label', ''));
  };
  const closePopover = () => {
    props.setOpenPopoverIndex(-1);
  };

  // If the user cancels or clicks away without saving: replace any changed
  // values with the original filter values
  useEffect(() => {
    if (isClosing && !isSaving) {
      props.formikProps.setFieldValue(
        `filters.${props.index}.fieldInfo`,
        origFilter?.fieldInfo
      );
      props.formikProps.setFieldValue(
        `filters.${props.index}.operator`,
        origFilter?.operator
      );
      props.formikProps.setFieldValue(
        `filters.${props.index}.fieldValue`,
        origFilter?.fieldValue
      );
      props.formikProps.setFieldValue(
        `filters.${props.index}.fieldRangeStart`,
        origFilter?.fieldRangeStart
      );
      props.formikProps.setFieldValue(
        `filters.${props.index}.fieldRangeEnd`,
        origFilter?.fieldRangeEnd
      );
      props.formikProps.setFieldValue(
        `filters.${props.index}.filterType`,
        origFilter?.filterType
      );
      props.formikProps.setFieldValue(
        `filters.${props.index}.query`,
        origFilter?.query
      );
      props.formikProps.setFieldValue(
        `filters.${props.index}.label`,
        origFilter?.label
      );
    }
  }, [isClosing]);

  // Update the displayed label if the user is saving
  useEffect(() => {
    if (isClosing && isSaving) {
      if (isCustomLabel && customLabel.length > 0) {
        setLabelToDisplay(customLabel);
      } else {
        setLabelToDisplay(
          getFilterLabel(
            props.filter,
            props.oldFilterType,
            props.oldFilterQuery
          )
        );
      }
    }
  }, [isClosing]);

  // Update the displayed label if the filter itself changes (user deletes a filter and
  // a new one falls into this index)
  useEffect(() => {
    if (props.filter) {
      if (!isEmpty(props.filter.label)) {
        //@ts-ignore
        setLabelToDisplay(props.filter.label);
      } else {
        setLabelToDisplay(
          getFilterLabel(
            props.filter,
            props.oldFilterType,
            props.oldFilterQuery
          )
        );
      }
    }
  }, [props.filter]);

  const handleFormValidation = async (
    formikProps: FormikProps<ForecasterDefinitionFormikValues>
  ) => {
    try {
      formikProps.setSubmitting(true);
      if (get(props, 'filter.filterType') === FILTER_TYPES.SIMPLE) {
        formikProps.setFieldTouched(`filters.${props.index}.fieldInfo`);
        formikProps.setFieldTouched(`filters.${props.index}.operator`);
        formikProps.setFieldTouched(`filters.${props.index}.fieldValue`);
        formikProps.setFieldTouched(`filters.${props.index}.fieldRangeStart`);
        formikProps.setFieldTouched(`filters.${props.index}.fieldRangeEnd`);
      } else {
        formikProps.setFieldTouched(`filters.${props.index}.query`);
      }
      formikProps.validateForm().then((errors) => {
        if (isEmpty(get(errors, `filters.${props.index}`, []))) {
          setIsSaving(true);
          props.onSave();
          closePopover();
        } else {
          setIsSaving(false);
        }
      });
    } catch (e) {
    } finally {
      formikProps.setSubmitting(false);
    }
  };

  const badge = (
    <EuiBadge
      key={props.index}
      color="hollow"
      iconType="cross"
      iconSide="right"
      iconOnClick={() => {
        props.onDelete();
      }}
      iconOnClickAriaLabel="onClick event for icon within the button"
      onClick={() => {
        openPopover();
      }}
      onClickAriaLabel="onClick event for the button"
    >
      {labelToDisplay}
    </EuiBadge>
  );

  const newFilterButton = (
    <EuiSmallButtonEmpty
      style={{ marginTop: '-2px' }}
      size="xs"
      data-test-subj={'addDataFilterButton'}
      onClick={() => {
        props.onOpen();
        openPopover();
      }}
    >
      + Add data filter
    </EuiSmallButtonEmpty>
  );

  return (
    <EuiFlexItem grow={false} style={{ marginBottom: '2px' }}>
      <EuiPopover
        ownFocus={true}
        initialFocus="[id=cancelSaveFilterButton]"
        button={props.isNewFilter ? newFilterButton : badge}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downCenter"
        onTrapDeactivation={() => {
          setIsClosing(true);
        }}
        panelPaddingSize='s'
      >
        <EuiPopoverTitle>
          <EuiFlexGroup
            direction="row"
            alignItems="center"
            style={{ margin: '-18px' }}
          >
            <EuiFlexItem>
              <EuiText>
                {/* Added paddingLeft to align the "Data filter" text 
                    with the indented labels (e.g., "Field") used in EuiCompressedFormRow below */}
                <p style={{ textTransform: 'none', paddingLeft: '6px' }}>
                  <b>Data filter</b>
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSmallButtonEmpty
                data-test-subj="filterTypeButton"
                onClick={() => {
                  filterType === FILTER_TYPES.SIMPLE
                    ? setFilterType(FILTER_TYPES.CUSTOM)
                    : setFilterType(FILTER_TYPES.SIMPLE);
                }}
              >
                {filterType === FILTER_TYPES.SIMPLE
                  ? 'Use query DSL'
                  : 'Use visual editor'}
              </EuiSmallButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        {filterType === FILTER_TYPES.SIMPLE ? (
          <SimpleFilter
            filter={props.filter}
            index={props.index}
            values={props.values}
            replace={props.replace}
          />
        ) : (
          <CustomFilter
            filter={props.filter}
            index={props.index}
            values={props.values}
            replace={props.replace}
          />
        )}
        <EuiSpacer />
        <EuiFlexGroup direction="column" style={{ margin: '0px' }}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiCompressedSwitch
                data-test-subj={'switchForCustomLabel'}
                label={<EuiText>Create custom label?</EuiText>}
                checked={isCustomLabel}
                onChange={() => {
                  setIsCustomLabel(!isCustomLabel);
                  setCustomLabel('');
                }}
              />
            </EuiFlexItem>
            {isCustomLabel ? (
              <EuiFlexItem>
                <FormattedFormRow title="Custom label">
                  <EuiCompressedFieldText
                    name="customLabel"
                    id="customLabel"
                    placeholder="Enter a value"
                    value={customLabel}
                    onChange={(e) => {
                      setCustomLabel(e.target.value);
                    }}
                  />
                </FormattedFormRow>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiSmallButtonEmpty
                id="cancelSaveFilterButton"
                data-test-subj={`cancelFilter${props.index}Button`}
                onClick={() => {
                  props.onCancel();
                  closePopover();
                }}
              >
                Cancel
              </EuiSmallButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSmallButton
                id="saveFilterButton"
                fill={true}
                data-test-subj={`saveFilter${props.index}Button`}
                isLoading={props.formikProps.isSubmitting}
                onClick={() => {
                  props.formikProps.setFieldValue(
                    `filters.${props.index}.filterType`,
                    filterType
                  );
                  props.formikProps.setFieldValue(
                    `filters.${props.index}.label`,
                    customLabel
                  );
                  handleFormValidation(props.formikProps);
                }}
              >
                Save
              </EuiSmallButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiPopover>
    </EuiFlexItem>
  );
};
