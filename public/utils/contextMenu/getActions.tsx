/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiIconType } from '@elastic/eui';
import { toMountPoint } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { DEFAULT_DATA } from '../../../../../src/plugins/data/common';
import {
  Action,
  createAction,
} from '../../../../../src/plugins/ui_actions/public';
import { createADAction } from '../../action/ad_dashboard_action';
import AnywhereParentFlyout from '../../components/FeatureAnywhereContextMenu/AnywhereParentFlyout';
import { Provider } from 'react-redux';
import configureStore from '../../redux/configureStore';
import DocumentationTitle from '../../components/FeatureAnywhereContextMenu/DocumentationTitle/containers/DocumentationTitle';
import { AD_FEATURE_ANYWHERE_LINK, ANOMALY_DETECTION_ICON } from '../constants';
import {
  getAssistantClient,
  getClient,
  getOverlays,
} from '../../../public/services';
import { FLYOUT_MODES } from '../../../public/components/FeatureAnywhereContextMenu/AnywhereParentFlyout/constants';
import SuggestAnomalyDetector from '../../../public/components/DiscoverAction/SuggestAnomalyDetector';
import { SUGGEST_ANOMALY_DETECTOR_CONFIG_ID } from '../../../server/utils/constants';

export const ACTION_SUGGEST_AD = 'suggestAnomalyDetector';

// This is used to create all actions in the same context menu
const grouping: Action['grouping'] = [
  {
    id: 'ad-dashboard-context-menu',
    getDisplayName: () => 'Anomaly Detection',
    getIconType: () => ANOMALY_DETECTION_ICON,
    category: 'vis_augmenter',
    order: 20,
  },
];

export const getActions = () => {
  const getOnClick =
    (startingFlyout) =>
    async ({ embeddable }) => {
      const overlayService = getOverlays();
      const openFlyout = overlayService.openFlyout;
      const store = configureStore(getClient());
      const overlay = openFlyout(
        toMountPoint(
          <Provider store={store}>
            <AnywhereParentFlyout
              startingFlyout={startingFlyout}
              embeddable={embeddable}
              closeFlyout={() => overlay.close()}
            />
          </Provider>
        ),
        { size: 'm', className: 'context-menu__flyout' }
      );
    };

  return [
    {
      grouping,
      id: 'createAnomalyDetector',
      title: i18n.translate(
        'dashboard.actions.adMenuItem.createAnomalyDetector.displayName',
        {
          defaultMessage: 'Add anomaly detector',
        }
      ),
      icon: 'plusInCircle' as EuiIconType,
      order: 100,
      onClick: getOnClick(FLYOUT_MODES.create),
    },
    {
      grouping,
      id: 'associatedAnomalyDetector',
      title: i18n.translate(
        'dashboard.actions.adMenuItem.associatedAnomalyDetector.displayName',
        {
          defaultMessage: 'Associated detectors',
        }
      ),
      icon: 'kqlSelector' as EuiIconType,
      order: 99,
      onClick: getOnClick(FLYOUT_MODES.associated),
    },
    {
      id: 'documentationAnomalyDetector',
      title: <DocumentationTitle />,
      icon: 'documentation' as EuiIconType,
      order: 98,
      onClick: () => {
        window.open(AD_FEATURE_ANYWHERE_LINK, '_blank');
      },
    },
  ].map((options) => createADAction({ ...options, grouping }));
};

export const getSuggestAnomalyDetectorAction = () => {
  const onClick = async function () {
    const overlayService = getOverlays();
    const openFlyout = overlayService.openFlyout;
    const store = configureStore(getClient());
    const overlay = openFlyout(
      toMountPoint(
        <Provider store={store}>
          <SuggestAnomalyDetector closeFlyout={() => overlay.close()} />
        </Provider>
      )
    );
  };

  return createAction({
    id: 'suggestAnomalyDetector',
    order: 100,
    type: ACTION_SUGGEST_AD,
    getDisplayName: () => 'Suggest anomaly detector',
    getIconType: () => ANOMALY_DETECTION_ICON,
    // suggestAD is only compatible with data sources that have certain agents configured
    isCompatible: async (context) => {
      if (
        context.datasetId &&
        (context.datasetType === DEFAULT_DATA.SET_TYPES.INDEX_PATTERN ||
          context.datasetType === DEFAULT_DATA.SET_TYPES.INDEX)
      ) {
        const assistantClient = getAssistantClient();
        const res = await assistantClient.agentConfigExists(
          SUGGEST_ANOMALY_DETECTOR_CONFIG_ID,
          { dataSourceId: context.dataSourceId }
        );
        return res.exists;
      }
      return false;
    },
    execute: async () => {
      onClick();
    },
  });
};