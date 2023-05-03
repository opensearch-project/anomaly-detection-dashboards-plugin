import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { toMountPoint } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { Action } from '../../../../../src/plugins/ui_actions/public';
import { createADAction } from '../../action/ad_dashboard_action';
import Container from '../../components/FeatureAnywhereContextMenu/Container';
import DocumentationTitle from '../../components/FeatureAnywhereContextMenu/DocumentationTitle';
import { Provider } from 'react-redux';
import { CoreServicesContext } from '../../../public/components/CoreServices/CoreServices';
import configureStore from '../../redux/configureStore';

// This is used to create all actions in the same context menu
const grouping: Action['grouping'] = [
  {
    id: 'ad-dashboard-context-menu',
    getDisplayName: () => 'Anomaly Detector',
    getIconType: () => 'apmTrace',
  },
];

export const getActions = ({ core, plugins }) => {
  const getOnClick =
    (startingFlyout) =>
    async ({ embeddable }) => {
      const services = await core.getStartServices();
      const openFlyout = services[0].overlays.openFlyout;
      const http = services[0].http;
      const store = configureStore(http);
      const overlay = openFlyout(
        toMountPoint(
          <Provider store={store}>
            <CoreServicesContext.Provider value={services}>
              <Container
                {...{
                  startingFlyout,
                  embeddable,
                  plugins,
                  closeFlyout: () => overlay.close(),
                  core,
                  services,
                }}
              />
            </CoreServicesContext.Provider>
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
          defaultMessage: 'Create anomaly detector',
        }
      ),
      icon: 'plusInCircle' as EuiIconType,
      order: 100,
      onClick: getOnClick('create'),
    },
    {
      grouping,
      id: 'associatedAnomalyDetector',
      title: i18n.translate(
        'dashboard.actions.adMenuItem.associatedAnomalyDetector.displayName',
        {
          defaultMessage: 'Associated anomaly detector',
        }
      ),
      icon: 'gear' as EuiIconType,
      order: 99,
      onClick: getOnClick('associated'),
    },
    {
      id: 'documentationAnomalyDetector',
      title: <DocumentationTitle />,
      icon: 'documentation' as EuiIconType,
      order: 98,
      onExecute: () => {
        window.open(
          'https://opensearch.org/docs/latest/monitoring-plugins/anomaly-detection/index/',
          '_blank'
        );
      },
    },
  ].map((options) => createADAction({ ...options, grouping }));
};
