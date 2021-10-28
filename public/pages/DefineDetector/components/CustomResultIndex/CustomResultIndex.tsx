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
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiLink,
  EuiTitle,
  EuiFieldText,
  EuiCallOut,
  EuiSpacer
} from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React, { useState, useEffect } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { CUSTOM_AD_RESULT_INDEX_PREFIX } from '../../../../../server/utils/constants';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';

interface CustomResultIndexProps {
  isEdit: boolean;
  useDefaultResultIndex?: boolean;
  resultIndex?: string;
}

function CustomResultIndex(props: CustomResultIndexProps) {
  const [showResultIndex, setShowResultIndex] = useState<boolean>(
    false
  );

  useEffect(() => {
    // show result index when update detector or go back to creation page after setting result index.
    setShowResultIndex(props.isEdit || !!props.resultIndex);
  }, []);

  return (
    <ContentPanel
      title={
        <EuiFlexGroup direction="row" style={{ margin: '0px' }}>
          <EuiTitle size="s">
            <h2>Result index</h2>
          </EuiTitle>
          <EuiText
            size="m"
            style={{ marginLeft: '18px', marginTop: '5px' }}
            onClick={() => {
              setShowResultIndex(!showResultIndex);
            }}
          >
            <EuiLink>{showResultIndex ? 'Hide' : 'Show'}</EuiLink>

          </EuiText>
        </EuiFlexGroup>
      }
      titleSize="s"
      hideBody={!showResultIndex}>
      {props.isEdit ? (
        <EuiFlexItem>
          <EuiCallOut
            data-test-subj="resultIndexReadOnlyCallout"
            title="You can't change the result index after you create the detector."
            color="primary"
            iconType="iInCircle"
            size="s"
          ></EuiCallOut>
        </EuiFlexItem>
      ) : (
        <EuiFlexItem>
          <EuiCallOut
            data-test-subj="cannotEditResultIndexCallout"
            title="You can't change the result index after you create the detector. You can manage the result index with ISM plugin."
            color="warning"
            iconType="alert"
            size="s"
          ></EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiSpacer size="m" />
      <Field name="resultIndex" >
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            title="Result index field"
            hint='Specify a unique and descriptive name that is easy to
          recognize. Prefix "opensearch-ad-plugin-result-" will be added to the index name you input. For example, 
          if you input "abc" as result index name, the final index name will be "opensearch-ad-plugin-result-abc". 
          You can use dash "-" to separete namespace to manage permission easily, for example "opensearch-ad-plugin-result-financial-us-group1",
          so you can create permisison role based on prefix for "financial" department or granular level for "us" area. 
          Create too many result indices may impact performance, suggest to reuse result index for multiple detectors.'
          >
            <EuiFieldText
              id="resultIndex"
              placeholder="Enter result index name"
              prepend={props.isEdit ? "" : CUSTOM_AD_RESULT_INDEX_PREFIX}
              disabled={props.isEdit}
              {...field}
            />
          </FormattedFormRow>
        )}
      </Field>
    </ContentPanel>
  );
}

export default CustomResultIndex;
