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
  EuiSpacer,
} from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React, { useState, useEffect } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { CUSTOM_AD_RESULT_INDEX_PREFIX } from '../../../../../server/utils/constants';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { ISM_PLUGIN_DOC_LINE } from '../../../../utils/constants';

interface CustomResultIndexProps {
  isEdit: boolean;
  useDefaultResultIndex?: boolean;
  resultIndex?: string;
}

function CustomResultIndex(props: CustomResultIndexProps) {
  const [showResultIndex, setShowResultIndex] = useState<boolean>(false);

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
      hideBody={!showResultIndex}
    >
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
            title="You can't change the result index after you create the detector. You can manage the result index with Index Management plugin."
            color="warning"
            iconType="alert"
            size="s"
          ></EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiSpacer size="m" />
      <Field name="resultIndex">
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            title="Result index field"
            hint='Specify a unique and descriptive name that’s easy to recognize. The prefix “opensearch-ad-plugin-result-” will be 
            added to the index name that you input. For example, if you input “abc” as the result index name, the final index name
            will be “opensearch-ad-plugin-result-abc.”.
            You can use dash “-” to separate the namespace to manage permissions easily. For example, if you use 
            “opensearch-ad-plugin-result-financial-us-group1” as result index, you can create a permission role based on pattern 
            "opensearch-ad-plugin-result-financial-us-*" for “financial” department at a granular level for the “us” area. 
            Creating too many result indices might impact the performance. We recommend reusing the result index for multiple detectors. 
            You can use Index Management plugin to manage result indices.'
            hintLink={ISM_PLUGIN_DOC_LINE}
          >
            <EuiFieldText
              id="resultIndex"
              placeholder="Enter result index name"
              prepend={props.isEdit ? '' : CUSTOM_AD_RESULT_INDEX_PREFIX}
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
