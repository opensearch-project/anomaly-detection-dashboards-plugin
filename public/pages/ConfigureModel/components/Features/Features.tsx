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
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';
import { FieldArray, FieldArrayRenderProps, FormikProps } from 'formik';

import { get } from 'lodash';
import React, { Fragment, useEffect } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { Detector } from '../../../../models/interfaces';
import { initialFeatureValue } from '../../utils/helpers';
import { MAX_FEATURE_NUM, BASE_DOCS_LINK } from '../../../../utils/constants';
import { FeatureAccordion } from '../FeatureAccordion';

interface FeaturesProps {
  detector: Detector | undefined;
  formikProps: FormikProps<any>;
}

export function Features(props: FeaturesProps) {
  // If the features list is empty: push a default initial one
  useEffect(() => {
    if (get(props, 'formikProps.values.featureList', []).length === 0) {
      props.formikProps.setFieldValue('featureList', [initialFeatureValue()]);
      props.formikProps.setFieldTouched('featureList', false);
    }
  }, [props.formikProps.values.featureList]);

  return (
    <ContentPanel
      title="Features"
      titleSize="s"
      subTitle={
        <EuiText
          className="content-panel-subTitle"
          style={{ lineHeight: 'normal' }}
        >
          A feature is the field in your index that you use to check for
          anomalies. You can add up to 5 features.{' '}
          <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
            Learn more <EuiIcon size="s" type="popout" />
          </EuiLink>
        </EuiText>
      }
    >
      <EuiFlexGroup direction="column" style={{ margin: '0px' }}>
        <FieldArray name="featureList" validateOnChange={true}>
          {({ push, remove, form: { values } }: FieldArrayRenderProps) => {
            return (
              <Fragment>
                {get(props.detector, 'indices.0', '').includes(':') ? (
                  <div>
                    <EuiCallOut
                      title="This detector is using a remote cluster index, so you need to manually input the field."
                      color="warning"
                      iconType="alert"
                    />
                    <EuiSpacer size="m" />
                  </div>
                ) : null}
                {values.featureList.map((feature: any, index: number) => (
                  <FeatureAccordion
                    onDelete={() => {
                      remove(index);
                    }}
                    index={index}
                    feature={feature}
                    handleChange={props.formikProps.handleChange}
                  />
                ))}
                <EuiFlexGroup
                  alignItems="center"
                  style={{ padding: '12px 0px' }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="addFeature"
                      isDisabled={values.featureList.length >= MAX_FEATURE_NUM}
                      onClick={() => {
                        push(initialFeatureValue());
                      }}
                    >
                      Add another feature
                    </EuiButton>
                    <EuiText className="content-panel-subTitle">
                      <p>
                        You can add up to{' '}
                        {Math.max(
                          MAX_FEATURE_NUM - values.featureList.length,
                          0
                        )}{' '}
                        more features.
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Fragment>
            );
          }}
        </FieldArray>
      </EuiFlexGroup>
    </ContentPanel>
  );
}
