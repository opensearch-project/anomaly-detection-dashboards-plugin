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

import React, { useMemo } from 'react';
import {
    EuiSmallButton,
    EuiFlexGroup,
    EuiFlexItem,
    EuiPageHeader,
    EuiPageHeaderSection,
    EuiTitle,
    EuiText,
    EuiHealth,
    EuiSmallButtonIcon
} from '@elastic/eui';
import moment from 'moment';
import { getNotifications, getSavedObjectsClient, getUISettings, getDataSourceEnabled, getDataSourceManagementPlugin } from '../../../../services';
import { USE_NEW_HOME_PAGE } from '../../../../utils/constants';
import { Forecaster } from '../../../../models/interfaces';
import { FORECASTER_STATE, isActiveState } from '../../../../../server/utils/constants';
import { forecastStateToColorMap } from '../../../utils/constants';
import { DataSourceViewConfig } from '../../../../../../../src/plugins/data_source_management/public';
import { MountPoint } from '../../../../../../../src/core/public';
import { PageHeader } from '../../../../utils/PageHeader';

interface ForecasterControlsProps {
    forecaster?: Forecaster;
    dataSourceId: string;
    setActionMenu: (menuMount: MountPoint | undefined) => void;
    handleDeleteClick: () => void;
    handleStartTest: () => void;
    handleCancelForecasting: () => void;
    handleStartForecasting: () => void;
    runOnceRunning: React.MutableRefObject<boolean>;
}

const formatTime = (timeField: string, forecaster: Forecaster) => {
    return forecaster[timeField]
        ? moment(forecaster[timeField]).format('MMM DD, YYYY HH:mm:ss')
        : 'N/A';
};

const getStateMsg = (forecaster: Forecaster | undefined) => {
    console.log('forecaster?.curState', forecaster?.curState);
    switch (forecaster?.curState) {
        case FORECASTER_STATE.INACTIVE_NOT_STARTED: {
            return 'Not started';
        }

        case FORECASTER_STATE.INACTIVE_STOPPED: {
            return 'Stopped at ' + formatTime('realTimeLastUpdateTime', forecaster);
        }

        case FORECASTER_STATE.AWAITING_DATA_TO_INIT: {
            return 'Has been awaiting sufficient data to initialize forecast since ' + formatTime('realTimeLastUpdateTime', forecaster);
        }

        case FORECASTER_STATE.AWAITING_DATA_TO_RESTART: {
            return 'Has been awaiting sufficient data to restart forecast since  ' + formatTime('realTimeLastUpdateTime', forecaster);
        }

        case FORECASTER_STATE.INIT_TEST: {
            return 'Initializing test since ' + formatTime('runOnceLastUpdateTime', forecaster);
        }

        case FORECASTER_STATE.INITIALIZING_FORECAST: {
            return 'Initializing forecast since ' + formatTime('realTimeLastUpdateTime', forecaster);
        }

        case FORECASTER_STATE.TEST_COMPLETE: {
            return 'Test complete at ' + formatTime('runOnceLastUpdateTime', forecaster);
        }

        case FORECASTER_STATE.RUNNING: {
            return 'Running since ' + formatTime('realTimeLastUpdateTime', forecaster);
        }

        case FORECASTER_STATE.INIT_ERROR:
        case FORECASTER_STATE.FORECAST_FAILURE:
        case FORECASTER_STATE.INIT_TEST_FAILED: {
            // FIXME: Using "since" instead of "at" for real-time forecast errors because:
            // 1. Real-time jobs continue running even when in error state
            // 2. Timestamp won't update on subsequent failures
            // 3. "Since" better indicates the ongoing nature of the error state
            const errorMessage = forecaster?.curState === FORECASTER_STATE.INIT_ERROR
                ? 'Forecast initialization failed since '
                : forecaster?.curState === FORECASTER_STATE.INIT_TEST_FAILED
                    ? 'Test initialization failed at '
                    : 'Forecast failed since ';
            return errorMessage + formatTime(forecaster?.curState === FORECASTER_STATE.INIT_TEST_FAILED
                ? 'runOnceLastUpdateTime' : 'realTimeLastUpdateTime', forecaster);
        }

        default:
            return null;
    }
};

export const ForecasterControls = (props: ForecasterControlsProps) => {
    const { forecaster, dataSourceId, setActionMenu, handleDeleteClick, handleStartTest, handleCancelForecasting, handleStartForecasting, runOnceRunning } = props;
    const useUpdatedUX = getUISettings().get(USE_NEW_HOME_PAGE);

    let renderDataSourceComponent = null;
    const dataSourceEnabled = getDataSourceEnabled().enabled;

    if (dataSourceEnabled) {
        // getDataSourceManagementPlugin is set in public/plugin.ts and available to consume
        // in other pages. This avoids passing the props down through to all of the child
        // components
        const DataSourceMenu = getDataSourceManagementPlugin()?.ui.getDataSourceMenu<DataSourceViewConfig>();

        // Memoize renderDataSourceComponent to prevent the data source picker from blinking, showing
        // and hiding the data source during the re-rendering of the page.
        renderDataSourceComponent = useMemo(() => {
            if (!DataSourceMenu) {
                return null;
            }
            return (
                <DataSourceMenu
                    setMenuMountPoint={setActionMenu}
                    componentType={'DataSourceView'} // read-only
                    componentConfig={{
                        activeOption: [{ id: dataSourceId }],
                        fullWidth: false,
                        savedObjects: getSavedObjectsClient(),
                        notifications: getNotifications(),
                    }}
                />
            );
        }, [
            dataSourceId
        ]);
    }

    const badgeControl = (currentForecaster: Forecaster) => (
        <EuiText
            size="xs"
            // Make EuiText flow inline with the forecaster name instead of creating a new line
            style={{ display: 'inline-block', marginLeft: '8px' }}
        >
            <EuiHealth
                color={forecastStateToColorMap.get(forecaster?.curState ?? FORECASTER_STATE.INACTIVE_NOT_STARTED)}
                // Override EuiHealth's default black text color and add spacing after the status dot
                style={{
                    color: '#69707D',  // EUI gray color
                    marginLeft: '8px'
                }}
            >
                <span style={{
                    marginLeft: '4px',
                    fontWeight: '300'  // Use lighter font weight (300 is lighter than normal/400)
                }}>
                    {getStateMsg(currentForecaster)}
                </span>
            </EuiHealth>
        </EuiText>
    );

    const detailsActions = (currentForecaster: Forecaster) => {
        const deleteButton = <EuiSmallButtonIcon
            aria-label="Delete forecaster"
            iconType="trash"
            color="danger"
            onClick={handleDeleteClick}
            data-test-subj="trashButton"
        />;

        const startTestButton = <EuiSmallButton
            data-test-subj="startCancelTestButton"
            isDisabled={currentForecaster?.curState === FORECASTER_STATE.INIT_TEST || runOnceRunning.current}
            onClick={handleStartTest}
        >
            Start test
        </EuiSmallButton>;

        const startForecastButton = <EuiSmallButton
            style={{ marginLeft: 8 }}
            onClick={
                isActiveState(currentForecaster?.curState)
                    ? handleCancelForecasting
                    : handleStartForecasting
            }
            data-test-subj="startCancelForecastButton"
            isDisabled={currentForecaster?.curState === FORECASTER_STATE.INIT_TEST || runOnceRunning.current}
        >
            {isActiveState(currentForecaster?.curState)
                ? 'Stop forecasting'
                : 'Start forecasting'}
        </EuiSmallButton>;

        const actions = [];
        if (dataSourceEnabled && renderDataSourceComponent) {
            actions.push(renderDataSourceComponent);
        }
        actions.push(deleteButton);
        if (!isActiveState(currentForecaster?.curState)) {
            actions.push(startTestButton);
        }
        actions.push(startForecastButton);
        return actions;
    };

    const legacyHeaderControls = () => {
        if (!forecaster) return null;

        return (
            <EuiPageHeader style={{ justifyContent: 'space-between' }}>
                <EuiPageHeaderSection>
                    <EuiTitle size="m">
                        <h2 style={{ margin: 0 }}>
                            {!useUpdatedUX ? forecaster?.name : null}
                            {badgeControl(forecaster)}
                        </h2>
                    </EuiTitle>
                </EuiPageHeaderSection>

                <EuiPageHeaderSection>
                    <EuiFlexGroup
                        gutterSize="s"
                        alignItems="center"
                        justifyContent="flexEnd"
                        responsive={false}
                    >
                        {detailsActions(forecaster).map((action, idx) => (
                            action ? (
                                <EuiFlexItem grow={false} key={idx}>
                                    {action}
                                </EuiFlexItem>
                            ) : null
                        ))}
                    </EuiFlexGroup>
                </EuiPageHeaderSection>
            </EuiPageHeader>
        );
    };

    if (useUpdatedUX) {
        if (!forecaster) {
            return null;
        }
        return (
            <PageHeader
                appBadgeControls={[{ renderComponent: badgeControl(forecaster) }]}
                appRightControls={detailsActions(forecaster)
                    .map(action => action ? { renderComponent: action } : null)
                    .filter(Boolean)
                }
            >
                <EuiFlexGroup alignItems="flexEnd">
                    <EuiFlexItem grow={false}>
                        <EuiText size="s" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            <h1>{forecaster?.name}</h1>
                        </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem style={{ paddingBottom: '5px', marginLeft: '0px' }}>
                        {badgeControl(forecaster ?? {} as Forecaster)}
                    </EuiFlexItem>
                    {detailsActions(forecaster ?? {} as Forecaster).map((action, idx) => (
                        <EuiFlexItem grow={false} key={idx}>
                            {action}
                        </EuiFlexItem>
                    ))}
                </EuiFlexGroup>
            </PageHeader>
        );
    }

    // When not using updated UX, render the control directly
    return legacyHeaderControls();
};