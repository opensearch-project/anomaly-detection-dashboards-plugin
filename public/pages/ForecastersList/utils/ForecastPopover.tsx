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

import React, { useState } from 'react';
import { EuiHealth, EuiSmallButton, EuiLink, EuiSpacer, EuiText, EuiHorizontalRule, EuiCodeBlock, EuiCallOut } from '@elastic/eui';
import { ForecasterListItem } from '../../../models/interfaces';
import { FORECASTER_STATE, FORECASTER_STATE_TO_DISPLAY, isForecasterErrorState } from '../../../../server/utils/constants';
import moment from 'moment';
import { FORECASTING_FEATURE_NAME } from '../../../utils/constants';

interface ForecasterPopoverProps {
  forecaster: ForecasterListItem;
  stateColor: string;
  timeField: 'realTimeLastUpdateTime' | 'runOnceLastUpdateTime';
  message: string;
  dataSourceId?: string,
}

const buildForecasterUrl = (forecasterId: string, dataSourceId?: string) => {
  let url = `${FORECASTING_FEATURE_NAME}#/forecasters/${forecasterId}/details`;

  if (dataSourceId) {
    url += `?dataSourceId=${dataSourceId}`;
  }

  // Add a unique timestamp to force a complete page refresh
  // This ensures the ForecasterDetail component fully remounts and loads fresh data
  url += (dataSourceId ? '&' : '?') + '_t=' + Date.now();

  return url;
};

// FIXME: Cannot use EuiPopover here as it conflicts with EuiDataGrid's enlarge cell action.
// Current implementation uses a custom popover solution as a workaround.
export function ForecasterPopover(props: ForecasterPopoverProps) {
  const {
    forecaster,
    stateColor,
    timeField,
    message,
    dataSourceId,
  } = props;

  // FIXME: Attempted to implement error display in a separate modal, but encountered two major issues:
  // 1. Popover would remain on top of modal, partially hiding error message
  // 2. Attempts to close popover resulted in an empty popover still being displayed
  // Current workaround: Display error message within the same popover instead of a separate modal
  const [showFullError, setShowFullError] = useState(false);

  const forecasterUrl = buildForecasterUrl(forecaster.id, dataSourceId);

  const formattedTime = forecaster[timeField]
    ? moment(forecaster[timeField]).format('MMM DD, YYYY HH:mm:ss')
    : 'N/A';

  // If we are not showing the full error, show the standard popover content
  if (!showFullError) {
    return (
      <div style={popoverStyles}>
        <EuiHealth color={stateColor}>
          {FORECASTER_STATE_TO_DISPLAY[forecaster.curState]}
        </EuiHealth>
        {/* Override default margin-top from EuiHorizontalRule to reduce space below EuiHealth */}
        <EuiHorizontalRule margin="xs" style={{ marginTop: 0 }}/>

        <EuiText size="s">
          <p>
            {/* tabIndex={-1} prevents the link from receiving automatic focus when popover opens,
                * while maintaining clickability. Without this, EUI's accessibility features would
                * automatically focus the link, causing unwanted highlighting.
                */}
            <EuiLink href={forecasterUrl} tabIndex={-1}>
              {forecaster.name}
            </EuiLink>
            {' '}
            {message} {formattedTime}
          </p>
        </EuiText>
        <EuiSpacer size="s" />


        {forecaster.stateError && isForecasterErrorState(forecaster.curState) ? (
          <EuiSmallButton
            color="danger"
            onClick={() => setShowFullError(true)}
            fullWidth
          >
            See full error
          </EuiSmallButton>
        ) : (
          <EuiSmallButton
            fullWidth
            onClick={() => window.location.href = forecasterUrl}
          >
            View forecast
          </EuiSmallButton>
        )}
      </div>
    );
  }

  // If showFullError = true, display the entire error text
  return (
    <div style={popoverStyles}>
      <EuiHealth color={stateColor}>
        {FORECASTER_STATE_TO_DISPLAY[forecaster.curState]}
      </EuiHealth>
      <EuiHorizontalRule margin="xs" style={{ marginTop: 0 }}/>

      <EuiCallOut title="Full error details" color="danger" iconType="alert">
        <EuiText size="s">
          <p>
            <strong>{forecaster.name}</strong>
          </p>
          <p>
            {/* The date/time from your field */}
            {message} {formattedTime}
          </p>
        </EuiText>

        <EuiSpacer size="s" />
        <EuiCodeBlock
          language="bash"
          paddingSize="s"
          overflowHeight={200}
        >
          {forecaster.stateError || 'No error found'}
        </EuiCodeBlock>
      </EuiCallOut>

      <EuiSpacer size="s" />

      {/* Provide a way to go back or close */}
      <EuiSmallButton fill size="s" onClick={() => setShowFullError(false)}>
        Back
      </EuiSmallButton>
    </div>
  );
}

const popoverStyles: React.CSSProperties = {
  width: 250
};

export const getErrorModalTitle = (state: FORECASTER_STATE) => {
  switch (state) {
    case FORECASTER_STATE.INIT_ERROR:
      return 'Forecast initialization error';
    case FORECASTER_STATE.FORECAST_FAILURE:
      return 'Forecast execution error';
    case FORECASTER_STATE.INIT_TEST_FAILED:
      return 'Test initialization error';
    default:
      return 'Forecast error';
  }
};
