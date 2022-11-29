import React from 'react';
import {
  EuiLink,
  EuiText,
  EuiCallOut,
  EuiSpacer,
  EuiIcon,
  EuiToolTip,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { v4 as uuid } from 'uuid';
import './styles.scss';
import { getInitialValues } from './helpers';
import { GetActionContextMenuDataArgs, Action } from '../../../../../src/plugins/ui_actions/public';
import FormikWrapper from './FormikWrapper';

export const getContextMenuData: Action['getContextMenuData'] = (
  options: GetActionContextMenuDataArgs
) => {
  const initialValues = getInitialValues();
  const { anomalies, detectors } = initialValues;
  const getFormikOptions = () => ({
    initialValues,
    onSubmit: (values) => {
      console.log(values);
    },
  });
  const detectorId = uuid();
  const createAnomalyDetectorId = uuid();
  const manageDetectorId = uuid();
  const viewAnomaliesByTriggerId = uuid();
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
    {
      name: 'View events',
      isTitleVisible: true,
      order: 10,
      items: [
        {
          name: anomalies.length ? (
            `Anomalies (${anomalies.length})`
          ) : (
            <EuiText>
              Anomalies{' '}
              <EuiToolTip position="left" content="Here is some tooltip text">
                <EuiLink href="#">
                  <EuiIcon type="questionInCircle" />
                </EuiLink>
              </EuiToolTip>
            </EuiText>
          ),
          icon: 'nested',
          panel: viewAnomaliesByTriggerId,
          className: anomalies.length ? '' : 'ad-dashboards-context-menu__no-action',
          disabled: !anomalies.length,
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
    {
      id: manageDetectorId,
      width: 400,
      title: 'Manage detectors',
      content: (
        <FormikWrapper {...{ getFormikOptions }}>
          <ManageDetectors />
        </FormikWrapper>
      ),
    },
    {
      id: viewAnomaliesByTriggerId,
      width: 400,
      title: 'View Anomalies by Trigger',
      content: (
        <FormikWrapper {...{ getFormikOptions }}>
          <ViewAnomalies />
        </FormikWrapper>
      ),
    },
  ];

  return {
    additionalFirstPanelGroups,
    additionalPanels,
  };
};
