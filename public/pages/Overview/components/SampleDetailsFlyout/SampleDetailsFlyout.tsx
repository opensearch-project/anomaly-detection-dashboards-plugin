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

import React from 'react';
import { get } from 'lodash';
import {
  EuiAccordion,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import {
  getFieldsAndTypesGrid,
  getFeaturesAndAggsAndFieldsGrid,
} from '../../utils/helpers';
import { Detector } from '../../../../models/interfaces';
import { SAMPLE_DATA } from '../../utils/constants';
import { EuiHorizontalRule } from '@elastic/eui';

interface SampleDetailsFlyoutProps {
  title: string;
  sampleData: SAMPLE_DATA;
  detector: Detector | undefined;
  interval: number;
  onClose(): void;
}

export const SampleDetailsFlyout = (props: SampleDetailsFlyoutProps) => {
  const fieldValues = Object.keys(props.sampleData.fieldMappings);
  const fieldTypes = fieldValues.map((field) =>
    get(props.sampleData.fieldMappings, `${field}.type`)
  );
  const featureNames = Object.keys(
    get(props.sampleData.detectorConfig, 'uiMetadata.features')
  );
  const featureAggs = featureNames.map((feature) =>
    get(
      props.sampleData.detectorConfig,
      `uiMetadata.features.${feature}.aggregationBy`
    )
  );
  const featureFields = featureNames.map((feature) =>
    get(
      props.sampleData.detectorConfig,
      `uiMetadata.features.${feature}.aggregationOf`
    )
  );
  const detectorInterval = get(
    props.sampleData.detectorConfig,
    'detection_interval.period.interval'
  );

  return (
    <EuiFlyout
      ownFocus={false}
      onClose={props.onClose}
      aria-labelledby="flyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">{props.title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiAccordion
          id="detectorDetailsAccordion"
          buttonContent={
            <EuiTitle size="s">
              <h3>Detector details</h3>
            </EuiTitle>
          }
          initialIsOpen={true}
          paddingSize="m"
        >
          <EuiText style={{ lineHeight: 2.0 }}>
            <b>Name: </b>
            <i>
              {props.detector
                ? props.detector.name
                : props.sampleData.detectorName}
            </i>
            <br></br>
            <b>Detection interval: </b>
            Every {detectorInterval} minutes
            <br></br>
            <b>Feature details: </b>
          </EuiText>
          <EuiSpacer size="s" />
          {getFeaturesAndAggsAndFieldsGrid(
            featureNames,
            featureAggs,
            featureFields
          )}
        </EuiAccordion>
        <EuiHorizontalRule margin="m" />
        <EuiAccordion
          id="indexDetailsAccordion"
          buttonContent={
            <EuiTitle size="s">
              <h3>Index details</h3>
            </EuiTitle>
          }
          initialIsOpen={false}
          paddingSize="m"
        >
          <EuiText style={{ lineHeight: 2.0 }}>
            <b>Name: </b>
            <i>
              {props.detector
                ? props.detector.indices[0]
                : props.sampleData.indexName}
            </i>
            <br></br>
            <b>Log frequency: </b>Every {props.interval} minute(s)
            <br></br>
            <b>Log duration: </b>3 weeks
            <br></br>
            <b>Field details: </b>
          </EuiText>
          <EuiSpacer size="s" />
          {getFieldsAndTypesGrid(fieldValues, fieldTypes)}
        </EuiAccordion>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
