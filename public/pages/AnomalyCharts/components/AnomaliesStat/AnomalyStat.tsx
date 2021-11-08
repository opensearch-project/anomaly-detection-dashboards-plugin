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

import React, { Fragment } from 'react';
import { EuiIcon, EuiLink, EuiToolTip, EuiTitle } from '@elastic/eui';
import { Monitor } from '../../../../models/interfaces';
import { getAlertingMonitorListLink } from '../../../../utils/utils';
import { formatNumber } from '../../../utils/helpers';

interface AnomalyStatProps {
  title: any;
  description: any;
}

export const AnomalyStat = (props: AnomalyStatProps) => {
  return (
    <div className="euiStat euiStat--leftAligned">
      <div className="euiText euiText--small euiStat__description">
        {props.description}
      </div>
      <div
        className="euiTitle euiTitle--small euiStat__title"
        style={{ display: 'inline' }}
      >
        {props.title}
      </div>
    </div>
  );
};

export const AnomalyStatWithTooltip = (props: {
  isLoading: boolean;
  minValue: number | undefined;
  maxValue: number | undefined;
  description: string;
  tooltip: string;
}) => {
  const title = () => {
    return props.isLoading
      ? '-'
      : !props.maxValue
      ? '0'
      : `${formatNumber(props.minValue)}-${formatNumber(props.maxValue)}`;
  };
  const description = () => {
    return (
      <Fragment>
        <p>
          {props.description}{' '}
          <EuiToolTip position="top" content={props.tooltip}>
            <EuiIcon type="iInCircle" />
          </EuiToolTip>
        </p>
      </Fragment>
    );
  };
  return <AnomalyStat description={description()} title={title()} />;
};

export const AlertsStat = (props: {
  monitor: Monitor | undefined;
  showAlertsFlyout(): void;
  totalAlerts: number | undefined;
  isLoading: boolean;
}) => {
  const title = () => {
    return (
      <Fragment>
        <p
          className="euiTitle euiTitle--small euiStat__title"
          style={{ display: 'inline' }}
        >
          {props.totalAlerts === undefined || props.isLoading
            ? '-'
            : props.totalAlerts}{' '}
        </p>
        {props.monitor ? (
          <EuiLink
            href={`${getAlertingMonitorListLink()}/${
              // @ts-ignore
              props.monitor.id
            }`}
            target="_blank"
            style={{ fontSize: '14px' }}
          >
            View monitor <EuiIcon type="popout"></EuiIcon>
          </EuiLink>
        ) : null}
      </Fragment>
    );
  };

  const description = () => {
    return (
      <p>
        Alert{' '}
        <EuiLink onClick={props.showAlertsFlyout} style={{ fontSize: '12px' }}>
          Info
        </EuiLink>
      </p>
    );
  };

  return <AnomalyStat title={title()} description={description()} />;
};
