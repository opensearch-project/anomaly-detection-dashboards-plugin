import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { Action } from '../../../../../src/plugins/ui_actions/public';
import { createADAction } from 'public/action/ad_dashboard_action';

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
        console.log("create ad");

        // openFlyout(
        //   toMountPoint(
        //     <FormikWrapper {...{ getFormikOptions }}>
        //       < {...{ embeddable }} />
        //     </FormikWrapper>
        //   ),
        //   { size: 'l' }
        // );

      },
    },
    {
      grouping,
      id: 'manageAnomalyDetector',
      title: i18n.translate('dashboard.actions.alertingMenuItem.manageAnomalyDetector.displayName', {
        defaultMessage: 'Manage anomaly detector',
      }),
      icon: 'wrench' as EuiIconType,
      order: 99,
      onClick: async ({ embeddable }) => {
        console.log("manage ad");
      },
    },
    {
      id: 'documentation',
      title: i18n.translate('dashboard.actions.adMenuItem.documentation.displayName', {
        defaultMessage: 'Documentation',
      }),
      icon: 'documentation' as EuiIconType,
      order: 98,
      onClick: () => {
        window.open(
          'https://opensearch.org/docs/latest/monitoring-plugins/alerting/index/',
          '_blank'
        );
      },
    },
  ]
  //.map((options) => createADAction({ ...options, grouping }));
