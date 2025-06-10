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
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
} from '@elastic/eui';
import { FieldArray, FieldArrayRenderProps, FormikProps } from 'formik';

import { get } from 'lodash';
import React, { Fragment, useEffect } from 'react';
import { initialFeatureValue } from '../../utils/helpers';
import { FeaturePanel } from '../FeaturePanel';

interface FeaturesProps {
  formikProps: FormikProps<any>;
  isEditable?: boolean;
}

export function Features(props: FeaturesProps) {
  const { formikProps, isEditable = true } = props;

  // If the features list is empty: push a default initial one
  useEffect(() => {
    if (get(formikProps, 'values.featureList', []).length === 0) {
      formikProps.setFieldValue('featureList', [initialFeatureValue()]);
      formikProps.setFieldTouched('featureList', false);
    }
  }, [formikProps.values.featureList]);

  return (
    <Fragment>
      <EuiText>
        <h4>Indicator</h4>
      </EuiText>
      
      <EuiText size="s" color="subdued">
        <p>
          Define the variable to use in your prediction.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" style={{ margin: '0px' }}>
        <FieldArray name="featureList" validateOnChange={true}>
          {({ push, remove, form: { values } }: FieldArrayRenderProps) => {
            return (
              <Fragment>
                {/* 
                    React requires a unique 'key' prop for each element in an array to:
                    1. Track which items have changed, been added, or been removed
                    2. Maintain component state correctly between re-renders
                    3. Optimize rendering performance by avoiding unnecessary re-renders
                  */}
                {(values?.featureList || []).map((feature: any, index: number) => (
                  /* 
                   * Note: Even though we set key="feature-${index}" here, the key prop won't be 
                   * available inside FeaturePanel. React reserves the key prop for its own internal 
                   * reconciliation tracking and does not pass it through to components as a prop.
                   */
                  <FeaturePanel
                    key={`feature-${index}`}
                    index={index}
                    feature={feature}
                    handleChange={formikProps.handleChange}
                    formikProps={formikProps}
                    isEditable={isEditable}
                  />
                ))}
              </Fragment>
            );
          }}
        </FieldArray>
      </EuiFlexGroup>
    </Fragment>
  );
}
