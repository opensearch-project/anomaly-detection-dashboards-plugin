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

/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { get } from 'lodash';
import {
  Detector,
  ValidationSettingResponse,
} from '../../../../models/interfaces';
import { FilterDisplayList } from '../FilterDisplayList';
import { ConfigCell, FixedWidthRow } from '../../../../components/ConfigCell';
import { toStringConfigCell } from '../../utils/helpers';

interface DetectorDefinitionFieldsProps {
  detector: Detector;
  onEditDetectorDefinition(): void;
  isCreate: boolean;
  validationError?: boolean;
  validDetectorSettings?: boolean;
  validationResponse?: ValidationSettingResponse;
  isLoading?: boolean;
  isCreatingDetector?: boolean;
}

export const DetectorDefinitionFields = (
  props: DetectorDefinitionFieldsProps
) => {
  const filterInputs = {
    uiMetadata: get(props, 'detector.uiMetadata', {}),
    filterQuery: JSON.stringify(
      get(props, 'detector.filterQuery', {}) || {},
      null,
      4
    ),
  };

  const getValidationCallout = () => {
    //When validation response is loading then displaying loading spinner, don't display
    // after clicking on "create detector" button as isLoading will be true from that request
    if (props.isLoading && !props.isCreatingDetector) {
      return (
        <EuiCallOut
          title={
            <div>
              <EuiFlexGroup direction="row" gutterSize="xs">
                <EuiLoadingSpinner size="l" style={{ marginRight: '12px' }} />
                <EuiText>
                  <p>Validating detector configurations</p>
                </EuiText>
              </EuiFlexGroup>
            </div>
          }
          style={{ marginBottom: '10px' }}
          size="s"
          color="primary"
        />
      );
    }
    // Callouts only displayed based on if validDetectorSettings is true or not, referring to
    // to response content from validation API (empty body or response issue body).
    // validationError refers to if there was an exception from validation API
    // such as a security exception or error establishing network connection on request.
    // This means no callout will be displayed since validation wasn't able to say if settings are valid or not.
    if (props.validationResponse != undefined && !props.validationError) {
      if (props.validDetectorSettings) {
        return (
          <EuiCallOut
            title="Detector settings are validated"
            color="success"
            iconType="check"
            size="s"
            style={{ marginBottom: '10px' }}
          ></EuiCallOut>
        );
      } else if (
        !props.validDetectorSettings &&
        props.validationResponse.hasOwnProperty('message')
      ) {
        return (
          <EuiCallOut
            title="Issues found in the detector settings"
            color="danger"
            iconType="alert"
            size="s"
            style={{ marginBottom: '10px' }}
          >
            <ul>
              <li>{props.validationResponse.message}</li>
            </ul>
          </EuiCallOut>
        );
      } else {
        return null;
      }
    }
  };

  return (
    <ContentPanel
      title="Detector settings"
      titleSize="s"
      panelStyles={{ margin: '0px' }}
      actions={[
        <EuiButton
          data-test-subj="editDetectorButton"
          onClick={props.onEditDetectorDefinition}
        >
          Edit
        </EuiButton>,
      ]}
    >
      {props.isCreate ? getValidationCallout() : null}
      <EuiFlexGrid columns={0} gutterSize="l" style={{ border: 'none' }}>
        <EuiFlexItem>
          <ConfigCell
            title="Name"
            description={get(props, 'detector.name', '')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ConfigCell
            title="Data source index"
            description={get(props, 'detector.indices.0', '')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <FixedWidthRow label="Data filter">
            <FilterDisplayList {...filterInputs} />
          </FixedWidthRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <ConfigCell
            title="Detector interval"
            description={toStringConfigCell(
              get(props, 'detector.detectionInterval', 0)
            )}
          />
        </EuiFlexItem>
        {props.isCreate ? null : (
          <EuiFlexItem>
            <ConfigCell
              title="ID"
              description={get(props, 'detector.id', '')}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <ConfigCell
            title="Description"
            description={get(props, 'detector.description', '')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ConfigCell
            title="Timestamp"
            description={get(props, 'detector.timeField', '')}
          />
        </EuiFlexItem>
        {props.isCreate ? null : (
          <EuiFlexItem>
            <ConfigCell
              title="Last Updated"
              description={toStringConfigCell(
                get(props, 'detector.lastUpdateTime', '')
              )}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <ConfigCell
            title="Window delay"
            description={toStringConfigCell(
              get(props, 'detector.windowDelay', 0)
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <ConfigCell
            title="Custom result index"
            description={get(props, 'detector.resultIndex', '-')}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </ContentPanel>
  );
};
