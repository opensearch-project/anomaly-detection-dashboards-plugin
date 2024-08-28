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

import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiSmallButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { get, isEqual } from 'lodash';
import {
  Detector,
  ValidationSettingResponse,
} from '../../../../models/interfaces';
import { useDispatch, useSelector } from 'react-redux';
import { FilterDisplayList } from '../FilterDisplayList';
import { ConfigCell, FixedWidthRow } from '../../../../components/ConfigCell';
import { toStringConfigCell } from '../../utils/helpers';
import { DataConnectionFlyout } from '../DataConnectionFlyout/DataConnectionFlyout';
import { ClusterInfo } from '../../../../../server/models/types';
import { getLocalCluster } from '../../../../pages/utils/helpers';
import { getClustersInfo } from '../../../../redux/reducers/opensearch';
import { AppState } from '../../../../redux/reducers';
interface DetectorDefinitionFieldsProps {
  detector: Detector;
  onEditDetectorDefinition(): void;
  isCreate: boolean;
  validationError?: boolean;
  validDetectorSettings?: boolean;
  validationResponse?: ValidationSettingResponse;
  isLoading?: boolean;
  isCreatingDetector?: boolean;
  dataSourceId: string;
  clusters?: ClusterInfo[];
}

export const DetectorDefinitionFields = (
  props: DetectorDefinitionFieldsProps
) => {
  const dispatch = useDispatch();
  const opensearchState = useSelector((state: AppState) => state.opensearch);
  const [showDataConnectionFlyout, setShowDataConnectionFlyout] =
    useState<boolean>(false);

  const filterInputs = {
    uiMetadata: get(props, 'detector.uiMetadata', {}),
    filterQuery: JSON.stringify(
      get(props, 'detector.filterQuery', {}) || {},
      null,
      4
    ),
  };

  useEffect(() => {
    const getInitialClusters = async () => {
      await dispatch(getClustersInfo());
    };
    getInitialClusters();
  }, [props.dataSourceId]);

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
        if (
          isEqual(get(props, 'validationResponse.validationType', ''), 'model')
        ) {
          return (
            <EuiCallOut
              title="We identified some areas that might improve your model"
              color="warning"
              iconType="iInCircle"
              size="s"
              style={{ marginBottom: '10px' }}
            >
              {JSON.stringify(props.validationResponse.message).replace(
                /\"/g,
                ''
              )}
            </EuiCallOut>
          );
        } else {
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
        }
      } else {
        return null;
      }
    }
  };
  const minAgeValue = get(props, 'detector.resultIndexMinAge', undefined);
  const minAge = minAgeValue === undefined ? '-' : minAgeValue + ' Days';
  const minSizeValue = get(props, 'detector.resultIndexMinSize', undefined);
  const minSize = minSizeValue === undefined ? '-' : minSizeValue + ' MB';
  const ttlValue = get(props, 'detector.resultIndexTtl', undefined);
  const ttl = (ttlValue === undefined) ? '-' : ttlValue + " Days";
  const flattenCustomResultIndex = get(props, 'detector.flattenCustomResultIndex', undefined);
  const flatten = (flattenCustomResultIndex === undefined) ? '-' : flattenCustomResultIndex ? 'Yes' : 'No';
  
  const getDataConnectionsDisplay = (indices: string[]) => {
    if (indices.length === 0) return '-';
    if (indices.length === 1) return indices[0];
    return (
      <p data-test-subj="indexNameCellViewAllLink">
        {indices[0]}...&nbsp;
        <EuiLink 
          onClick={() => setShowDataConnectionFlyout(true)}
          style={{ fontSize: '12px' }}
        >
          View all {indices.length}
        </EuiLink>
      </p>
    );
  };

  return (
    <React.Fragment>
      <ContentPanel
        title="Detector settings"
        titleDataTestSubj="detectorSettingsHeader"
        titleSize="s"
        panelStyles={{ margin: '0px' }}
        actions={[
          <EuiSmallButton
            data-test-subj="editDetectorSettingsButton"
            onClick={props.onEditDetectorDefinition}
          >
            Edit
          </EuiSmallButton>,
        ]}
      >
        {props.isCreate ? getValidationCallout() : null}
        <EuiFlexGrid columns={0} gutterSize="l" style={{ border: 'none' }}>
          <EuiFlexItem data-test-subj="detectorNameCell">
            <ConfigCell
              title="Name"
              description={get(props, 'detector.name', '')}
            />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="indexNameCell">
            <ConfigCell
              title="Data source index"
              description={getDataConnectionsDisplay(
                get(props.detector, 'indices', [])
              )}
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
            <EuiFlexItem data-test-subj="detectorIdCell">
              <ConfigCell
                title="ID"
                description={get(props, 'detector.id', '')}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem data-test-subj="detectorDescriptionCell">
            <ConfigCell
              title="Description"
              description={get(props, 'detector.description', '')}
            />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="timestampNameCell">
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
          <EuiFlexItem>
            <ConfigCell
              title="Flatten custom result index"
              description={flatten}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ConfigCell
              title="Custom result index min age"
              description={minAge}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ConfigCell
              title="Custom result index min size"
              description={minSize}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <ConfigCell
              title="Custom result index TTL"
              description={ttl}
            />
          </EuiFlexItem>
        </EuiFlexGrid>
      </ContentPanel>
      {showDataConnectionFlyout ? (
        <DataConnectionFlyout
          indices={get(props.detector, 'indices', [])}
          onClose={() => setShowDataConnectionFlyout(false)}
          localClusterName={
            opensearchState.clusters?.length
              ? getLocalCluster(opensearchState.clusters as ClusterInfo[])[0]
                  ?.name
              : 'local-cluster'
          }
        />
      ) : null}
    </React.Fragment>
  );
};
