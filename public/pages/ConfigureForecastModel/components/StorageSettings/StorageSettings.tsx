/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import React from 'react';
import {
  EuiPanel,
  EuiRadio,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormikProps } from 'formik';
import { get } from 'lodash';
import { CustomResultIndex } from '../CustomResultIndex';
import { ModelConfigurationFormikValues } from '../../models/interfaces';
import { DetailsFormikValues } from '../../../ForecastDetail/models/interface';

interface StorageSettingsProps {
  formikProps: FormikProps<ModelConfigurationFormikValues> | FormikProps<DetailsFormikValues>;
  isEditable: boolean;
  omitTitle?: boolean;
}

export function StorageSettings(props: StorageSettingsProps) {
  const { formikProps, isEditable, omitTitle = false } = props;
  const { values, setFieldValue } = formikProps;

  // If resultIndex is empty, user is on "Default index"; otherwise "Custom index."
  const selected = values.resultIndex ? 'custom' : 'default';

  /**
   * Let the user toggle between default and custom by setting/clearing
   * resultIndex. If you leave resultIndex empty when user picks custom,
   * you'll never switch off "Default index."
   */
  const onChangeRadio = (option: 'default' | 'custom') => {
    if (option === 'default') {
      // Clear out resultIndex => "Default index" is selected
      // Setting resultIndex to empty string would cause backend validation error
      // as the index name must start with a predefined prefix. Use undefined to indicate
      // default index selection.
      setFieldValue('resultIndex', undefined);
    } else {
      // Set a placeholder if needed => "Custom index" is selected
      // The user can then override it in the <CustomResultIndex> field
      if (!values.resultIndex) {
        setFieldValue('resultIndex', 'my_custom_forecast_index');
      }
    }
  };

  return (
    <React.Fragment>
      {!omitTitle && (
        <>
          <EuiText size="s">
            <h3>Storage</h3>
            <p>
              Define how to store and manage forecasting results.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Two panels side by side for Default vs. Custom */}
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder={true} paddingSize="l">
            <EuiRadio
              id="defaultIndexRadio"
              label={<strong>Default index</strong>}
              checked={selected === 'default'}
              onChange={() => onChangeRadio('default')}
              // FIXME: EuiRadio doesn't support readOnly prop. readOnly would be preferred as disabled makes the radio look gray.
              // Consider creating a custom radio component that supports readOnly if this styling is important.
              disabled={!isEditable}
            />
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <p style={{ margin: 0 }}>
                The forecasting results are retained automatically
                for at least 30 days.
              </p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiPanel hasBorder={true} paddingSize="l">
            <EuiRadio
              id="customIndexRadio"
              label={<strong>Custom index</strong>}
              checked={selected === 'custom'}
              onChange={() => onChangeRadio('custom')}
              // FIXME: EuiRadio doesn't support readOnly prop. readOnly would be preferred as disabled makes the radio look gray.
              // Consider creating a custom radio component that supports readOnly if this styling is important.
              disabled={!isEditable}
            />
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <p style={{ margin: 0 }}>
                Route forecast results to your custom index. In a custom index,
                you set the retention period and resource allocation.
              </p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* If resultIndex is non-empty => user selected "Custom index," so show the custom index field */}
      {values.resultIndex && (
        <CustomResultIndex
          resultIndex={get(formikProps, 'values.resultIndex')}
          formikProps={formikProps}
          readOnly={!isEditable}
        />
      )}
    </React.Fragment>
  );
}
