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

import React, { Fragment, useState } from 'react';
import {
  EuiCompressedFormRow,
  EuiCompressedSelect,
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiCompressedFieldText,
  EuiCheckbox,
  EuiButtonIcon,
} from '@elastic/eui';
import './styles.scss';
import { Field, FieldProps } from 'formik';
import {
  required,
  isInvalid,
  getError,
  validateFeatureName,
} from '../../../../utils/utils';
import { get } from 'lodash';
import { FEATURE_TYPE_OPTIONS } from '../../utils/constants';
import { FEATURE_TYPE } from '../../../../models/interfaces';
import { formikToSimpleAggregation } from '../../utils/helpers';
import { AggregationSelector } from '../AggregationSelector';
import { CustomAggregation } from '../CustomAggregation';

interface FeatureAccordionProps {
  onDelete(): void;
  index: number;
  feature: any;
  handleChange(event: React.ChangeEvent<HTMLSelectElement>): void;
  displayMode?: string;
}

export const FeatureAccordion = (props: FeatureAccordionProps) => {
  const initialIsOpen = get(props.feature, 'newFeature', false);
  const [showSubtitle, setShowSubtitle] = useState<boolean>(!initialIsOpen);

  const simpleAggDescription = (feature: any) => (
    <Fragment>
      <span className="content-panel-subTitle" style={{ paddingRight: '20px' }}>
        Field: {get(feature, 'aggregationOf.0.label')}
      </span>
      <span className="content-panel-subTitle" style={{ paddingRight: '20px' }}>
        Aggregation method: {feature.aggregationBy}
      </span>
      <span className="content-panel-subTitle">
        State: {feature.featureEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </Fragment>
  );

  const customAggDescription = (feature: any) => (
    <Fragment>
      <span className="content-panel-subTitle" style={{ paddingRight: '20px' }}>
        Custom expression
      </span>
      <span className="content-panel-subTitle">
        State: {feature.featureEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </Fragment>
  );

  const showFeatureDescription = (feature: any) => {
    return feature && feature.featureType === FEATURE_TYPE.SIMPLE
      ? simpleAggDescription(feature)
      : customAggDescription(feature);
  };

  const featureButtonContent = (feature: any, index: number) => {
    if (props.displayMode === 'flyout') {
      return (
        <div id={`featureAccordionHeaders.${index}`}>
          <EuiTitle size="xxs">
            <h5 style={{ marginTop: '-5px', fontWeight: 400 }}>
              {feature.featureName ? feature.featureName : 'Add feature'}
            </h5>
          </EuiTitle>
          {showSubtitle ? showFeatureDescription(feature) : null}
        </div>
      );
    }
    return (
      <div id={`featureAccordionHeaders.${index}`}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xs" className="euiAccordionForm__title">
              <h5>
                {feature.featureName ? feature.featureName : 'Add feature'}
              </h5>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        {showSubtitle ? showFeatureDescription(feature) : null}
      </div>
    );
  };

  const deleteAction = (onClick: any) => {
    if (props.displayMode === 'flyout') {
      return (
        <EuiButtonIcon
          size="s"
          onClick={onClick}
          disabled={false}
          iconType="trash"
          color="text"
        ></EuiButtonIcon>
      );
    } else {
      return (
        <EuiButton size="s" color="danger" onClick={onClick} disabled={false}>
          Delete
        </EuiButton>
      );
    }
  };

  return (
    <EuiAccordion
      id={`featureList.${props.index}`}
      key={props.index}
      buttonContent={featureButtonContent(props.feature, props.index)}
      //@ts-ignore
      buttonClassName={
        props.index === 0
          ? 'euiAccordionForm__noTopPaddingButton'
          : 'euiFormAccordion_button'
      }
      className="euiAccordion__noTopBorder"
      paddingSize="l"
      initialIsOpen={initialIsOpen}
      extraAction={deleteAction(props.onDelete)}
      onToggle={(isOpen: boolean) => {
        isOpen ? setShowSubtitle(false) : setShowSubtitle(true);
      }}
    >
      <Field
        id={`featureList.${props.index}.featureName`}
        name={`featureList.${props.index}.featureName`}
        validate={validateFeatureName}
      >
        {({ field, form }: FieldProps) => (
          <EuiCompressedFormRow
            label="Feature name"
            helpText="Enter a descriptive name. The name must be unique within this detector. Feature name must contain 1-64 characters. Valid characters are a-z, A-Z, 0-9, -(hyphen) and _(underscore)."
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            <EuiCompressedFieldText
              data-test-subj={`featureNameTextInput-${props.index}`}
              name={`featureList.${props.index}.featureName`}
              placeholder="Enter feature name"
              value={field.value ? field.value : props.feature.featureName}
              {...field}
            />
          </EuiCompressedFormRow>
        )}
      </Field>

      <Field
        id={`featureList.${props.index}.featureEnabled`}
        name={`featureList.${props.index}.featureEnabled`}
      >
        {({ field, form }: FieldProps) => (
          <EuiCompressedFormRow
            label="Feature state"
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            <EuiCheckbox
              id={`featureList.${props.index}.featureEnabled`}
              label="Enable feature"
              checked={field.value ? field.value : props.feature.featureEnabled}
              {...field}
            />
          </EuiCompressedFormRow>
        )}
      </Field>

      <Field
        id={`featureList.${props.index}.featureType`}
        name={`featureList.${props.index}.featureType`}
        validate={required}
      >
        {({ field, form }: FieldProps) => (
          <Fragment>
            <EuiCompressedFormRow
              label="Find anomalies based on"
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
            >
              <EuiCompressedSelect
                {...field}
                options={FEATURE_TYPE_OPTIONS}
                value={
                  props.feature.featureType === FEATURE_TYPE.SIMPLE
                    ? FEATURE_TYPE.SIMPLE
                    : FEATURE_TYPE.CUSTOM
                }
                onChange={(e) => {
                  props.handleChange(e);
                  if (
                    e.currentTarget.value === FEATURE_TYPE.CUSTOM &&
                    !get(form.errors, `featureList.${props.index}`)
                  ) {
                    const aggregationQuery = formikToSimpleAggregation(
                      props.feature
                    );
                    form.setFieldValue(
                      `featureList.${props.index}.aggregationQuery`,
                      JSON.stringify(aggregationQuery, null, 4)
                    );
                  }
                }}
              />
            </EuiCompressedFormRow>
            {field.value === FEATURE_TYPE.SIMPLE ? (
              <AggregationSelector index={props.index} />
            ) : (
              <CustomAggregation index={props.index} />
            )}
          </Fragment>
        )}
      </Field>
    </EuiAccordion>
  );
};
