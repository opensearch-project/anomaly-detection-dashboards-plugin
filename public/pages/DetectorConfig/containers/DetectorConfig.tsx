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

import React, { useEffect } from 'react';
import { DetectorDefinitionFields } from '../../ReviewAndCreate/components/DetectorDefinitionFields';
import { Features } from './Features';
import { DetectorJobs } from './DetectorJobs';
import { EuiSpacer, EuiPage, EuiPageBody } from '@elastic/eui';
import { RouteComponentProps, useLocation } from 'react-router';
import { AppState } from '../../../redux/reducers';
import { useSelector, useDispatch } from 'react-redux';
import { getDetector } from '../../../redux/reducers/ad';
import { getClustersInfo } from '../../../redux/reducers/opensearch'
import { EuiLoadingSpinner } from '@elastic/eui';
import { getDataSourceFromURL } from '../../../pages/utils/helpers';

interface DetectorConfigProps extends RouteComponentProps {
  detectorId: string;
  onEditFeatures(): void;
  onEditDetector(): void;
}

export function DetectorConfig(props: DetectorConfigProps) {
  const dispatch = useDispatch();
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;
  const detector = useSelector(
    (state: AppState) => state.ad.detectors[props.detectorId]
  );
  const clusters = useSelector(
    (state: AppState) => state.opensearch.clusters
  );

  useEffect(() => {
    dispatch(getDetector(props.detectorId, dataSourceId));
    dispatch(getClustersInfo());
  }, []);

  return (
    <EuiPage style={{ marginTop: '16px', paddingTop: '0px' }}>
      {detector ? (
        <EuiPageBody>
          <EuiSpacer size="l" />
          <DetectorDefinitionFields
            detector={detector}
            onEditDetectorDefinition={props.onEditDetector}
            isCreate={false}
            clusters={clusters}
            dataSourceId={dataSourceId}
          />
          <EuiSpacer />
          <Features
            detectorId={props.detectorId}
            detector={detector}
            onEditFeatures={props.onEditFeatures}
          />
          <EuiSpacer />
          <DetectorJobs detector={detector} />
        </EuiPageBody>
      ) : (
        <div>
          <EuiLoadingSpinner size="xl" />
        </div>
      )}
    </EuiPage>
  );
}
