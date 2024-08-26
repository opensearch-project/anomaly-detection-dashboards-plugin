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
  EuiText,
  EuiLink,
  EuiIcon,
  EuiSmallButton,
  EuiEmptyPrompt,
  EuiSpacer,
} from '@elastic/eui';
import {
  Detector,
  FEATURE_TYPE,
  FeatureAttributes,
} from '../../../models/interfaces';
import { get, isEmpty, sortBy } from 'lodash';
import { PLUGIN_NAME, BASE_DOCS_LINK } from '../../../utils/constants';
import ContentPanel from '../../../components/ContentPanel/ContentPanel';
import { CodeModal } from '../components/CodeModal/CodeModal';
import { getTitleWithCount } from '../../../utils/utils';
import { AdditionalSettings } from '../components/AdditionalSettings/AdditionalSettings';
import {
  getShingleSizeFromObject,
  imputationMethodToFormik,
  getCustomValueStrArray,
} from '../../ConfigureModel/utils/helpers';

interface FeaturesProps {
  detectorId: string;
  detector: Detector;
  onEditFeatures(): void;
}

interface FeaturesState {
  showCodeModel: boolean[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

export const Features = (props: FeaturesProps) => {
  const [featuresState, setFeaturesState] = useState<FeaturesState>({
    showCodeModel: get(props.detector, 'featureAttributes', []).map(
      () => false
    ),
    sortField: 'name',
    sortDirection: 'asc',
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
    if (featuresState.sortDirection == 'desc') {
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

  const featureNum = Object.keys(featureAttributes).length;

  const setParamsText = `Set the index fields that you want to find anomalies for by defining
                           the model features. You can also set other model parameters such as
                           shingle size.`;

  const previewText = `After you set the model features and other optional parameters, you can
                         preview your anomalies from a sample feature output.`;
  const imputationMethodStr = imputationMethodToFormik(props.detector);

  return (
    <ContentPanel
      title="Model configuration"
      titleDataTestSubj="modelConfigurationHeader"
      titleSize="s"
      actions={[
        <EuiSmallButton
          data-test-subj="editModelConfigurationButton"
          onClick={props.onEditFeatures}
        >
          Edit
        </EuiSmallButton>,
      ]}
    >
      {featureNum == 0 ? (
        <EuiEmptyPrompt
          title={
            <span className="emptyFeatureTitle">
              Model parameters are required to run a detector
            </span>
          }
          body={
            <EuiText className="emptyFeatureBody">
              {setParamsText}
              <br />
              <br />
              {previewText}
            </EuiText>
          }
          actions={[
            <EuiSmallButton
              data-test-subj="createButton"
              href={`${PLUGIN_NAME}#/detectors/${props.detectorId}/features`}
              fill
            >
              Configure model
            </EuiSmallButton>,
          ]}
        />
      ) : (
        <div>
          <ContentPanel
            title={getTitleWithCount('Features', featureNum)}
            titleSize="s"
          >
            <EuiBasicTable
              data-test-subj="featureTable"
              items={sortedItems}
              columns={columns}
              cellProps={getCellProps}
              sorting={sorting}
              onChange={handleTableChange}
            />
          </ContentPanel>
          <EuiSpacer size="m" />
          <AdditionalSettings
            shingleSize={shingleSize}
            categoryField={get(props.detector, 'categoryField', [])}
            imputationMethod={imputationMethodStr}
            customValues={getCustomValueStrArray(
              imputationMethodStr,
              props.detector
            )}
          />
        </div>
      )}
    </ContentPanel>
  );
};
