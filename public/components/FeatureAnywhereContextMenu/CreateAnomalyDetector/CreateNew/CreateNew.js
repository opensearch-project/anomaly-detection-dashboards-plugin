/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EuiTitle, EuiSpacer, EuiIcon, EuiText, EuiSwitch, EuiLoadingSpinner } from '@elastic/eui';
import { EmbeddablePanel } from '../../../../../../../src/plugins/embeddable/public';
import './styles.scss';

function CreateNew({ embeddable, closeFlyout, core, services, index }) {
  const [isShowVis, setIsShowVis] = useState(false);
  const title = embeddable.getTitle();
  const history = {
    location: { pathname: '/create-detector', search: '', hash: '', state: undefined },
    push: (value) => console.log('pushed', value),
    goBack: closeFlyout,
  };
  const createMonitorProps = {
    ...history,
    history,
    httpClient: core.http,
    // This is not expected to be used
    setFlyout: () => null,
    notifications: core.notifications,
    isDarkMode: core.isDarkMode,
    notificationService: services.notificationService,
    edit: false,
    monitorToEdit: false,
    updateMonitor: () => null,
    staticContext: undefined,
    isMinimal: true,
    defaultName: `${title} monitor 1`,
    defaultIndex: index,
    defaultTimeField: embeddable.vis.params.time_field,
    isDefaultTriggerEnabled: true,
  };

  return (
    <div className="create-new">
      <EuiText size="xs">
        <p>
          Create and configure an anomaly detector to automatically detect anomalies in your data and 
          to view real-time results on the visualization. {' '}
          <a
            href="https://opensearch.org/docs/latest/observing-your-data/ad/index/"
            target="_blank"
          >
            Learn more <EuiIcon type="popout" />
          </a>
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <div className="create-new__title-and-toggle">
        <EuiTitle size="xxs">
          <h4>
            <EuiIcon type="visLine" className="create-new__title-icon" />
            {title}
          </h4>
        </EuiTitle>
        <EuiSwitch
          label="Show visualization"
          checked={isShowVis}
          onChange={() => setIsShowVis(!isShowVis)}
        />
      </div>
      <div className={`create-new__vis ${!isShowVis && 'create-new__vis--hidden'}`}>
        <EuiSpacer size="s" />
        <EmbeddablePanel
          embeddable={embeddable}
          getActions={() => Promise.resolve([])}
          inspector={{ isAvailable: () => false }}
          hideHeader
          isRetained
          isBorderless
        />
      </div>
      <EuiSpacer size="l" />
      <EuiTitle size="s">
        <h3>Detector details</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {!index && <EuiLoadingSpinner size="l" />}
      {/* Do not initialize until index is available */}
      {/* {index && <CreateDetector {...createDetectorProps} />} */}
    </div>
  );
}

export default CreateNew;
