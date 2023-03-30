/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiFormFieldset,
  EuiCheckableCard,
} from '@elastic/eui';
import './styles.scss';
import CreateNew from './CreateNew';

function AddAnomalyDetector({
  embeddable,
  closeFlyout,
  core,
  services,
  mode,
  setMode,
  index,
}) {
  const onCreate = () => {
    console.log(`Current mode: ${mode}`);
    const event = new Event('createDetector');
    document.dispatchEvent(event);
    closeFlyout();
  };

  return (
    <div className="add-anomaly-detector">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id="add-anomaly-detector__title">Add anomaly detector</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div className="add-anomaly-detector__scroll">
          <EuiFormFieldset
            legend={{
              display: 'hidden',
              children: (
                <EuiTitle>
                  <span>Options to create a new detector or associate an existing detector</span>
                </EuiTitle>
              ),
            }}
            className="add-anomaly-detector__modes"
          >
            {[
              {
                id: 'add-anomaly-detector__create',
                label: 'Create new detector',
                value: 'create',
              },
              {
                id: 'add-anomaly-detector__existing',
                label: 'Associate existing detector',
                value: 'existing',
              },
            ].map((option) => (
              <EuiCheckableCard
                {...{
                  ...option,
                  key: option.id,
                  name: option.id,
                  checked: option.value === mode,
                  onChange: () => setMode(option.value),
                }}
              />
            ))}
          </EuiFormFieldset>
          <EuiSpacer size="m" />
          {mode === 'create' && (
            <CreateNew {...{ embeddable, closeFlyout, core, services, index }} />
          )}
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onCreate} fill>
              {mode === 'existing' ? 'Associate' : 'Create'} detector
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </div>
  );
}

export default AddAnomalyDetector;
