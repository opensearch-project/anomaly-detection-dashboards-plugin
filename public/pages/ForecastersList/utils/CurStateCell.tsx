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

import React from 'react';
import { forecastStateToColorMap } from '../../utils/constants';
import { FORECASTER_STATE } from '../../../../server/utils/constants';
import { ForecasterListItem } from '../../../models/interfaces';
import { ForecasterPopover } from './ForecastPopover';

interface CurStateCellProps {
  forecaster: ForecasterListItem;
  dataSourceId?: string;
  isExpanded: boolean; 
  onForceCollapse?: () => void;
}

export function CurStateCell({
  forecaster,
  dataSourceId,
}: CurStateCellProps) {

  return (
    <div>
      {stateRenderFactory(forecaster, dataSourceId)}
    </div>
  );
}

function stateRenderFactory(
    forecaster: ForecasterListItem,
    dataSourceId: string | undefined,
) {

    const curState = forecaster.curState;
    const stateColor = forecastStateToColorMap.get(curState);
  
    let popoverContent;
  
    switch (curState) {
      case FORECASTER_STATE.INACTIVE_STOPPED: {
        popoverContent = <ForecasterPopover
          forecaster={forecaster}
          stateColor={stateColor || ''}
          timeField='realTimeLastUpdateTime'
          message='stopped at'
          dataSourceId={dataSourceId}
        />;
        break;
      }
  
      case FORECASTER_STATE.AWAITING_DATA_TO_INIT: {
        popoverContent = <ForecasterPopover
          forecaster={forecaster}
          stateColor={stateColor || ''}
          timeField='realTimeLastUpdateTime'
          message='has been awaiting sufficient data to initialize forecast since'
          dataSourceId={dataSourceId}
        />;
        break;
      }
  
      case FORECASTER_STATE.AWAITING_DATA_TO_RESTART: {
        popoverContent = <ForecasterPopover
          forecaster={forecaster}
          stateColor={stateColor || ''}
          timeField='realTimeLastUpdateTime'
          message='has been awaiting sufficient data to restart forecast since'
          dataSourceId={dataSourceId}
        />;
        break;
      }
  
      case FORECASTER_STATE.INIT_TEST: {
        popoverContent = <ForecasterPopover
          forecaster={forecaster}
          stateColor={stateColor || ''}
          timeField='runOnceLastUpdateTime'
          message='has been initializing test since'
          dataSourceId={dataSourceId}
        />;
        break;
      }
  
      case FORECASTER_STATE.INITIALIZING_FORECAST: {
        popoverContent = <ForecasterPopover
          forecaster={forecaster}
          stateColor={stateColor || ''}
          timeField='realTimeLastUpdateTime'
          message='initializing forecast since'
          dataSourceId={dataSourceId}
        />;
        break;
      }
  
      case FORECASTER_STATE.TEST_COMPLETE: {
        popoverContent = <ForecasterPopover
          forecaster={forecaster}
          stateColor={stateColor || ''}
          timeField='runOnceLastUpdateTime'
          message='test complete at'
          dataSourceId={dataSourceId}
        />;
        break;
      }
  
      case FORECASTER_STATE.RUNNING: {
        popoverContent = <ForecasterPopover
          forecaster={forecaster}
          stateColor={stateColor || ''}
          timeField='realTimeLastUpdateTime'
          message='has been running since'
          dataSourceId={dataSourceId}
        />;
        break;
      }
  
      case FORECASTER_STATE.INIT_ERROR:
      case FORECASTER_STATE.FORECAST_FAILURE:
      case FORECASTER_STATE.INIT_TEST_FAILED: {
        // FIXME: Using "since" instead of "at" for real-time forecast errors because:
        // 1. Real-time jobs continue running even when in error state
        // 2. Timestamp won't update on subsequent failures
        // 3. "Since" better indicates the ongoing nature of the error state
        const errorMessage = curState === FORECASTER_STATE.INIT_ERROR
          ? 'forecast initialization failed since'
          : forecaster.curState === FORECASTER_STATE.INIT_TEST_FAILED
            ? 'test initialization failed at'
            : 'forecast failed since';
        popoverContent = <ForecasterPopover
          forecaster={forecaster}
          stateColor={stateColor || ''}
          timeField={curState === FORECASTER_STATE.INIT_TEST_FAILED ? 'runOnceLastUpdateTime' : 'realTimeLastUpdateTime'}
          message={errorMessage}
          dataSourceId={dataSourceId}
        />;
        break;
      }
  
      default:
        return null;
    }
  
    return ( 
        popoverContent
    );
  }
