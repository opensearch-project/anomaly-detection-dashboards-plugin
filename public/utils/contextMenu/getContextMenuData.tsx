import React from 'react';
import {
  EuiLink,
  EuiText,
  EuiCallOut,
  EuiSpacer,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { v4 as uuid } from 'uuid';
import CreateAnomalyDetector from '../../components/contextMenu/CreateAnomalyDetector';
import './styles.scss';
import { GetActionContextMenuDataArgs, Action } from '../../../../../src/plugins/ui_actions/public';
import FormikWrapper from './FormikWrapper';

export const getContextMenuData: Action['getContextMenuData'] = (
  options: GetActionContextMenuDataArgs
) => {
  const detectorId = uuid();
  const createAnomalyDetectorId = uuid();
  const manageDetectorId = uuid();
  const additionalFirstPanelGroups = [
    {
      name: 'Initial group',
      order: 11,
      items: [
        {
          name: 'Anomaly Detection',
          icon: 'nested',
          panel: detectorId,
        },
      ],
    },
  ];
  const additionalPanels: EuiContextMenuPanelDescriptor[] = [
    {
      id: detectorId,
      width: 300,
      title: 'Anomaly Detection',
      items: [
        {
          name: 'Create anomaly detector',
          icon: 'plusInCircle',
          panel: createAnomalyDetectorId,
        },
        {
          name: `Manage detectors${detectors.length ? ` (${detectors.length})` : ''}`,
          icon: 'wrench',
          panel: manageDetectorId,
        },
        {
          isSeparator: true,
          key: 'sep',
        },
        {
          className: 'ad-dashboards-context-menu__text-content',
          name: (
            <>
              <EuiText size="xs">
                Learn more about{' '}
                <EuiLink href="#" external>
                  Anomaly Detection Anywhere
                </EuiLink>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiCallOut>
                <EuiText size="xs">
                  Share your feedback for the feature by creating on issue on{' '}
                  <EuiLink href="#" external>
                    GitHub
                  </EuiLink>
                </EuiText>
              </EuiCallOut>
            </>
          ),
        },
      ],
    },
    {
      id: createAnomalyDetectorId,
      width: 400,
      title: 'Create anomaly detector',
      content: (
        <FormikWrapper {...{ getFormikOptions }}>
          <CreateAnomalyDetector {...options} />
        </FormikWrapper>
      ),
    },
    // {
    //   id: manageDetectorId,
    //   width: 400,
    //   title: 'Manage detectors',
    //   content: (
    //     <FormikWrapper {...{ getFormikOptions }}>
    //       <ManageDetectors />
    //     </FormikWrapper>
    //   ),
    // },
  ];

  return {
    additionalFirstPanelGroups,
    additionalPanels,
  };
};
