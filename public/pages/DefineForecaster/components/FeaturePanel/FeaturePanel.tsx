/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors.
 * See GitHub history for details.
 */

import React, { Fragment, useEffect } from 'react';
import {
  EuiCompressedFormRow,
  EuiCompressedSelect,
  EuiCompressedFieldText,
} from '@elastic/eui';
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

interface FeatureProps {
  index: number;
  feature: any;
  handleChange(event: React.ChangeEvent<HTMLSelectElement>): void;
  formikProps: any; // Access to Formik bag if needed
  isEditable?: boolean;
}

export const FeaturePanel = (props: FeatureProps) => {
  const { index, feature, handleChange, formikProps, isEditable = true } = props;

  // On mount or whenever, force featureEnabled to always be true
  useEffect(() => {
    // Null check required because formikProps might not be immediately available
    // when the component first mounts, as Formik context initialization could be delayed
    // 
    // We force featureEnabled to true because disabling features is not supported.
    // Since there is only one feature, if users don't want the feature,
    // they should stop the forecaster entirely instead of disabling individual features.
    if (formikProps?.setFieldValue) {
      formikProps.setFieldValue(`featureList.${index}.featureEnabled`, true);
    }
    // Note: Adding index and formikProps as dependencies causes infinite loop
    // because we update formikProps inside useEffect (setFieldValue), which then
    // triggers the effect again, creating a cycle:
    // update formikProps -> effect runs -> update formikProps -> effect runs...
  }, []);

  return (
    // Using div instead of Fragment because we need a real DOM node with an ID for programmatic focus
    <div id={`feature-panel-${index}`}>
      <Field
        id={`featureList.${index}.featureName`}
        name={`featureList.${index}.featureName`}
        validate={validateFeatureName}
      >
        {({ field, form }: FieldProps) => (
          <EuiCompressedFormRow
            label="Indicator name"
            // FIXME: This descriptive name will be used as the y-axis label 
            // in the result page's visualization, so it should be meaningful 
            // to help users understand what is being forecasted
            helpText="Enter a descriptive name (1-64 characters)."
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            <EuiCompressedFieldText
              data-test-subj={`featureNameTextInput-${index}`}
              placeholder="Enter feature name"
              {...field}
              disabled={!isEditable}
              // Ensure value is always a defined string to prevent React warning about
              // switching between controlled/uncontrolled input. Empty string fallback
              // is required because undefined/null values can cause this switch.
              value={field.value || feature.featureName || ''}
            />
          </EuiCompressedFormRow>
        )}
      </Field>

      {/* 
        Removed all references to featureEnabled in the UI
        (it's internally forced to true via useEffect).
      */}

      {/* The top-level choice: "Forecast based on" */}
      <Field
        id={`featureList.${index}.featureType`}
        name={`featureList.${index}.featureType`}
        validate={required}
      >
        {({ field, form }: FieldProps) => (
          <Fragment>
            <EuiCompressedFormRow
              label="Forecast based on"
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
            >
              <EuiCompressedSelect
                {...field}
                options={FEATURE_TYPE_OPTIONS}
                disabled={!isEditable}
                value={
                  feature.featureType === FEATURE_TYPE.SIMPLE
                    ? FEATURE_TYPE.SIMPLE
                    : FEATURE_TYPE.CUSTOM
                }
                onChange={(e) => {
                  handleChange(e);
                  if (
                    e.currentTarget.value === FEATURE_TYPE.CUSTOM &&
                    !get(form.errors, `featureList.${index}`)
                  ) {
                    const aggregationQuery = formikToSimpleAggregation(feature);
                    form.setFieldValue(
                      `featureList.${index}.aggregationQuery`,
                      JSON.stringify(aggregationQuery, null, 4)
                    );
                  }
                }}
              />
            </EuiCompressedFormRow>

            {/* 
              If "Field value" is selected, render AggregationSelector.
              If "Custom expression" is selected, render CustomAggregation.
            */}
            {field.value === FEATURE_TYPE.SIMPLE ? (
              <AggregationSelector index={index} isEditable={isEditable} />
            ) : (
              <CustomAggregation index={index} isEditable={isEditable} />
            )}
          </Fragment>
        )}
      </Field>
    </div>
  );
};
