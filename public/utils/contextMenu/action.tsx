import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { toMountPoint } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { Action } from '../../../../../src/plugins/ui_actions/public';
import { createADAction } from '../../action/ad_dashboard_action';
import CreateAnomalyDetector from '../../components/FeatureAnywhereContextMenu/CreateAnomalyDetector';
import { AssociatedDetectors } from '../../components/FeatureAnywhereContextMenu/AssociatedDetectors';
import { CoreServicesContext } from '../../components/CoreServices/CoreServices';
import { Provider } from 'react-redux';
import configureStore from '../../redux/configureStore'

// This is used to create all actions in the same context menu
const grouping: Action['grouping'] = [
  {
    id: 'ad-dashboard-context-menu',
    getDisplayName: () => 'Anomaly Detector',
    getIconType: () => 'apmTrace',
    order: 200,
  },
];

export const getActions = ({ core }) =>
  [
    {
      grouping,
      id: 'createAnomalyDetector',
      title: i18n.translate(
        'dashboard.actions.adMenuItem.createAnomalyDetector.displayName',
        {
          defaultMessage: 'Create anomaly detector',
        }
      ),
      icon: 'plusInCircle' as EuiIconType,
      order: 100,
      onClick: async ({ embeddable }) => {
        const services = await core.getStartServices();
        const openFlyout = services[0].overlays.openFlyout;
        openFlyout(
          toMountPoint(<CreateAnomalyDetector {...{ embeddable }} />),
          { size: 'l' }
        );
      },
    },
    {
      grouping,
      id: 'manageAnomalyDetector',
      title: i18n.translate(
        'dashboard.actions.alertingMenuItem.manageAnomalyDetector.displayName',
        {
          defaultMessage: 'Manage anomaly detector',
        }
      ),
      icon: 'wrench' as EuiIconType,
      order: 99,
      onClick: async ({ embeddable }) => {
<<<<<<< HEAD
        console.log('manage ad');
=======
        const services = await core.getStartServices();
        const http = services[0].http;
        const store = configureStore(http);
        const openFlyout = services[0].overlays.openFlyout;
        const overlay = openFlyout(
          toMountPoint(
            <Provider store={store}>
              <CoreServicesContext.Provider value={services}>
                <AssociatedDetectors {...{ embeddable, closeFlyout: () => overlay.close(), core, services }} />
              </CoreServicesContext.Provider>
            </Provider>
          ),
          { size: 'l' }
        );
>>>>>>> 6e93ee7 (working js manage detectors)
      },
    },
    {
      id: 'documentation',
      title: i18n.translate(
        'dashboard.actions.adMenuItem.documentation.displayName',
        {
          defaultMessage: 'Documentation',
        }
      ),
      icon: 'documentation' as EuiIconType,
      order: 98,
      onClick: () => {
        window.open(
          'https://opensearch.org/docs/latest/monitoring-plugins/alerting/index/',
          '_blank'
        );
      },
    },
  ].map((options) => createADAction({ ...options, grouping }));
