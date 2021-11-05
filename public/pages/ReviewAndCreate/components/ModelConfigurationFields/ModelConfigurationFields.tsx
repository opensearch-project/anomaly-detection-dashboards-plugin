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

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiLink,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiText,
} from '@elastic/eui';
import {
  Detector,
  FEATURE_TYPE,
  FeatureAttributes,
  ValidationModelResponse,
} from '../../../../models/interfaces';
import { get, sortBy } from 'lodash';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { CodeModal } from '../../../../components/CodeModal/CodeModal';
import { AdditionalSettings } from '../AdditionalSettings/AdditionalSettings';
import { getTitleWithCount } from '../../../../utils/utils';
import { getShingleSizeFromObject } from '../../../ConfigureModel/utils/helpers';
import { SORT_DIRECTION } from '../../../../../server/utils/constants';

interface ModelConfigurationFieldsProps {
  detector: Detector;
  onEditModelConfiguration(): void;
  validationFeatureResponse: ValidationModelResponse;
  validModel: boolean;
  validationError: boolean;
  isLoading: boolean;
  isCreatingDetector: boolean;
}

interface ModelConfigurationFieldsState {
  showCodeModel: boolean[];
  sortField: string;
  sortDirection: SORT_DIRECTION;
}

export const ModelConfigurationFields = (
  props: ModelConfigurationFieldsProps
) => {
  const [featuresState, setFeaturesState] =
    useState<ModelConfigurationFieldsState>({
      showCodeModel: get(props.detector, 'featureAttributes', []).map(
        () => false
      ),
      sortField: 'name',
      sortDirection: SORT_DIRECTION.ASC,
    });

  const closeModal = (index: number) => {
    const cloneShowCodeModal = [...featuresState.showCodeModel];
    cloneShowCodeModal[index] = false;
    setFeaturesState({
      ...featuresState,
      showCodeModel: cloneShowCodeModal,
    });
  };

  const showModal = (index: number) => {
    const cloneShowCodeModal = [...featuresState.showCodeModel];
    cloneShowCodeModal[index] = true;
    setFeaturesState({
      ...featuresState,
      showCodeModel: cloneShowCodeModal,
    });
  };

  const getModalVisibilityChange = (index: number) => {
    return featuresState.showCodeModel[index];
  };

  const handleTableChange = (props: any) => {
    setFeaturesState({
      ...featuresState,
      sortField: props.sort.field,
      sortDirection: props.sort.direction,
    });
  };

  const getSortedItems = (items: Array<any>) => {
    let sorted = sortBy(items, featuresState.sortField);
    if (featuresState.sortDirection == SORT_DIRECTION.DESC) {
      sorted = sorted.reverse();
    }
    return sorted;
  };
  const featureAttributes = get(props.detector, 'featureAttributes', []);
  const shingleSize = getShingleSizeFromObject(props.detector);

  const sorting = {
    sort: {
      field: featuresState.sortField,
      direction: featuresState.sortDirection,
    },
  };

  const items = featureAttributes.map(
    (feature: FeatureAttributes, index: number) => ({
      name: feature.featureName,
      definition: index,
      state: feature.featureEnabled ? 'Enabled' : 'Disabled',
    })
  );

  const sortedItems = getSortedItems(items);

  const columns = [
    {
      field: 'name',
      name: 'Feature name',
      sortable: true,
    },
    {
      field: 'definition',
      name: 'Feature definition',
      render: (featureIndex: number) => {
        const feature = featureAttributes[featureIndex];

        const metaData = get(
          props.detector,
          `uiMetadata.features.${feature.featureName}`,
          {}
        );

        if (
          Object.keys(metaData).length === 0 ||
          metaData.featureType == FEATURE_TYPE.CUSTOM
        ) {
          return (
            <div>
              <p>
                Custom expression:{' '}
                <EuiLink
                  data-test-subj={`viewFeature-${featureIndex}`}
                  onClick={() => showModal(featureIndex)}
                >
                  View code
                </EuiLink>
              </p>

              {!getModalVisibilityChange(featureIndex) ? null : (
                <CodeModal
                  code={JSON.stringify(feature.aggregationQuery, null, 4)}
                  title={feature.featureName}
                  subtitle="Custom expression"
                  closeModal={() => closeModal(featureIndex)}
                  getModalVisibilityChange={() =>
                    getModalVisibilityChange(featureIndex)
                  }
                />
              )}
            </div>
          );
        } else {
          return (
            <div>
              <p>Field: {metaData.aggregationOf || ''}</p>
              <p>Aggregation method: {metaData.aggregationBy || ''}</p>
            </div>
          );
        }
      },
    },
    {
      field: 'state',
      name: 'Feature state',
    },
  ];

  const getCellProps = () => {
    return {
      textOnly: true,
    };
  };

  const getFeatureValidationCallout = (
    issueResponse: ValidationModelResponse
  ) => {
    if (issueResponse != undefined) {
      if (issueResponse.sub_issues != undefined) {
        const renderList = Object.keys(issueResponse.sub_issues).map((key) => {
          return (
            //@ts-ignore
            <li>{'The "' + key + '" ' + issueResponse.sub_issues[key]}</li>
          );
        });
        return <ul>{renderList}</ul>;
      } else {
        return (
          <ul>
            <li>{JSON.stringify(props.validationFeatureResponse.message)}</li>
          </ul>
        );
      }
    } else {
      return null;
    }
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
                  <p>Validating model configurations</p>
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
    if (props.validationError) {
      return null;
    }
    if (props.validModel) {
      return (
        <EuiCallOut
          title="Model configurations are validated"
          color="success"
          iconType="check"
          size="s"
          style={{ marginBottom: '10px' }}
        ></EuiCallOut>
      );
      // makes sure there is a response to display and model configs aren't valid per
      // validation API
    }
    if (
      !props.validModel &&
      props.validationFeatureResponse.hasOwnProperty('message')
    ) {
      return (
        <EuiCallOut
          title="issues found in the model configuration"
          color="danger"
          iconType="alert"
          size="s"
          style={{ marginBottom: '10px' }}
        >
          {/* Callout can either display feature subissue which related to a specific 
          feature issue or display a feature_attribute issue that is general like
          more then x anomaly feature or dulicate feature names */}
          {props.validationFeatureResponse.hasOwnProperty('sub_issues') ? (
            getFeatureValidationCallout(props.validationFeatureResponse)
          ) : (
            <ul>
              <li>{JSON.stringify(props.validationFeatureResponse.message)}</li>
            </ul>
          )}
        </EuiCallOut>
      );
    } else {
      return null;
    }
  };
  const featureNum = Object.keys(featureAttributes).length;
  return (
    <ContentPanel
      title="Model configuration"
      titleSize="s"
      actions={[
        <EuiButton onClick={props.onEditModelConfiguration}>Edit</EuiButton>,
      ]}
    >
      {getValidationCallout()}

      <div>
        <AdditionalSettings
          shingleSize={shingleSize}
          categoryField={get(props, 'detector.categoryField', [])}
        />
        <EuiSpacer />
        <ContentPanel
          title={getTitleWithCount('Features', featureNum)}
          titleSize="s"
        >
          <EuiBasicTable
            items={sortedItems}
            columns={columns}
            cellProps={getCellProps}
            sorting={sorting}
            onChange={handleTableChange}
          />
        </ContentPanel>
      </div>
    </ContentPanel>
  );
};
