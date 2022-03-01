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
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { PLUGIN_NAME } from '../../../../utils/constants';

interface SampleDataBoxProps {
  title: string;
  icon: any;
  description: string;
  loadDataButtonDescription: string;
  onOpenFlyout(): void;
  onLoadData(): void;
  isLoadingData: boolean;
  isDataLoaded: boolean;
  detectorId: string;
  buttonDataTestSubj?: string;
}

export const SampleDataBox = (props: SampleDataBoxProps) => {
  return (
    <div style={{ height: 'auto' }}>
      <ContentPanel
        title={
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignContent: 'flexStart',
            }}
          >
            {props.icon}
            <EuiTitle size="s">
              <h2 style={{ marginLeft: '12px', marginTop: '-3px' }}>
                {props.title}
              </h2>
            </EuiTitle>
            <EuiLink
              data-test-subj="flyoutInfoButton"
              style={{ marginLeft: '12px' }}
              onClick={props.onOpenFlyout}
            >
              Info
            </EuiLink>
          </div>
        }
        titleSize="s"
        badgeLabel={props.isDataLoaded ? 'INSTALLED' : undefined}
      >
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false} style={{ height: '70px' }}>
            <p
              style={{
                textAlign: 'left',
                lineHeight: 1.4,
                maxHeight: 4.2,
              }}
            >
              {props.description}
            </p>
          </EuiFlexItem>
          <EuiFlexGroup
            style={{
              height: '100px',
              marginTop: '0px',
              marginBottom: '0px',
            }}
            direction="column"
            alignItems="center"
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                style={{ width: '300px' }}
                data-test-subj={get(
                  props,
                  'buttonDataTestSubj',
                  'loadDataButton'
                )}
                disabled={props.isLoadingData || props.isDataLoaded}
                isLoading={props.isLoadingData}
                onClick={() => {
                  props.onLoadData();
                }}
              >
                {props.isLoadingData
                  ? 'Creating detector'
                  : props.isDataLoaded
                  ? 'Detector created'
                  : props.loadDataButtonDescription}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {props.isDataLoaded ? (
                <EuiLink
                  data-test-subj="viewSampleDetectorLink"
                  href={`${PLUGIN_NAME}#/detectors/${props.detectorId}`}
                >
                  View detector and sample data
                </EuiLink>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </ContentPanel>
    </div>
  );
};
