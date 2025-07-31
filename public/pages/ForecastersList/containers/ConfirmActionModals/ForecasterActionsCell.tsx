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

import { FORECASTER_ACTION } from "../../utils/constants";

import { EuiSmallButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from "@elastic/eui";
import { FORECASTER_STATE } from "../../../../../server/utils/constants";
import React, {
    useState,
} from 'react';
import { useDispatch } from "react-redux";
import {
    startForecaster,
    stopForecaster,
    deleteForecaster,
    testForecaster,
  } from '../../../../redux/reducers/forecast';
import { ForecasterListItem } from "../../../../models/interfaces";
import { CoreServicesContext } from "../../../../components/CoreServices/CoreServices";
import {
    prettifyErrorMessage,
} from '../../../../../server/utils/helpers';
import { CoreStart, } from '../../../../../../../src/core/public';
import { ConfirmDeleteForecastersModal } from "./ConfirmDeleteForecastersModal";
import { ConfirmStopForecastersModal } from "./ConfirmStopForecastersModal";
import { ConfirmStartForecastersModal } from "./ConfirmStartForecastersModal";
import { ConfirmModalState } from "../List/List";
import { ConfirmTestForecasterModal } from "./ConfirmTestForecasterModal";


interface ForecasterActionsCellProps {
    rowIndex: number;
    forecastersToDisplay: ForecasterListItem[];
    confirmModalState: ConfirmModalState;
    setConfirmModalState: (state: any) => void;
    setIsLoadingFinalForecasters: (state: boolean) => void;
    selectedDataSourceId: string | undefined;
    getUpdatedForecasters: () => void;
    isLoading: boolean
}
  
export function ForecasterActionsCell(props: ForecasterActionsCellProps) {
    const {
        rowIndex,
        forecastersToDisplay,
        // allMonitors,
        confirmModalState,
        setConfirmModalState,
        setIsLoadingFinalForecasters,
        selectedDataSourceId,
        getUpdatedForecasters,
        isLoading
    } = props;

    // Safely guard against out-of-bounds
    if (rowIndex >= forecastersToDisplay.length) return null;
    const forecaster = forecastersToDisplay[rowIndex];
    if (!forecaster) return null;

    const forecasterState = forecaster.curState;
    const forecasterId = forecaster.id;
    const forecasterName = forecaster.name;

    // Now you can use React hooks here
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const closePopover = () => setIsPopoverVisible(false);

    // const [modalType, setModalType] = useState<string | null>(null);

    // Add these handlers
    const handleTestClick = () => {
        // setModalType('test');
        setConfirmModalState({
            isOpen: true,
            action: FORECASTER_ACTION.TEST,
            isListLoading: false,
            isRequestingToClose: false,
            affectedForecasters: [forecaster],
            affectedMonitors: {},
        });
        closePopover();
    };

    const handleStartClick = () => {
        setConfirmModalState({
            isOpen: true,
            action: FORECASTER_ACTION.START,
            isListLoading: false,
            isRequestingToClose: false,
            affectedForecasters: [forecaster],
            affectedMonitors: {},
        });
        closePopover();
    };

    const handleDeleteClick = () => {
        setConfirmModalState({
            isOpen: true,
            action: FORECASTER_ACTION.DELETE,
            isListLoading: false,
            isRequestingToClose: false,
            affectedForecasters: [forecaster],
        });
        closePopover();
    };

    const handleStopClick = (isCancel: boolean = false) => {
        setConfirmModalState({
            isOpen: true,
            action: FORECASTER_ACTION.STOP,
            isListLoading: false,
            isRequestingToClose: false,
            affectedForecasters: [forecaster],
            actionText: isCancel ? 'cancel' : undefined,
        });
        closePopover();
    };

    const dispatch = useDispatch();
    const core = React.useContext(CoreServicesContext) as CoreStart;

    const handleHideModal = () => {
        setConfirmModalState({
          ...confirmModalState,
          isOpen: false,
        });
      };
    
      const handleConfirmModal = () => {
        setConfirmModalState({
          ...confirmModalState,
          isRequestingToClose: true,
        });
      };

    function getActions() {
        if (
            [
                FORECASTER_STATE.INACTIVE_STOPPED,
                FORECASTER_STATE.INACTIVE_NOT_STARTED,
                FORECASTER_STATE.INIT_ERROR,
                FORECASTER_STATE.INIT_TEST_FAILED,
                FORECASTER_STATE.TEST_COMPLETE,
            ].includes(forecasterState)
        ) {
            return [
                <EuiContextMenuItem icon="wrench" key="test" onClick={handleTestClick}>
                    Test
                </EuiContextMenuItem>,
                <EuiContextMenuItem icon="play" key="start" onClick={handleStartClick}>
                    Start forecasting
                </EuiContextMenuItem>,
                <EuiContextMenuItem icon="trash" key="delete" onClick={handleDeleteClick}>
                    Delete
                </EuiContextMenuItem>,
            ];
        } else if (
            [
                FORECASTER_STATE.AWAITING_DATA_TO_INIT,
                FORECASTER_STATE.AWAITING_DATA_TO_RESTART,
                FORECASTER_STATE.INIT_TEST,
                FORECASTER_STATE.INITIALIZING_FORECAST,
                FORECASTER_STATE.FORECAST_FAILURE,
            ].includes(forecasterState)
        ) {
            return [
                <EuiContextMenuItem icon="cross" key="cancel" onClick={() => handleStopClick(true)}>
                    Cancel forecast
                </EuiContextMenuItem>,
                <EuiContextMenuItem icon="trash" key="delete" onClick={handleDeleteClick}>
                    Delete
                </EuiContextMenuItem>,
            ];
        } else if (forecasterState === FORECASTER_STATE.RUNNING) {
            return [
                <EuiContextMenuItem icon="pause" key="stop" onClick={() => handleStopClick(false)}>
                    Stop forecasting
                </EuiContextMenuItem>,
                <EuiContextMenuItem icon="trash" key="delete" onClick={handleDeleteClick}>
                    Delete
                </EuiContextMenuItem>,
            ];
        }

        // Default / fallback: empty array
        return [];
    }

    const handleStartForecasterJob = async (forecasterId: string, forecasterName: string) => {
        setIsLoadingFinalForecasters(true);

        try {
            await dispatch(startForecaster(forecasterId, selectedDataSourceId));
            core.notifications.toasts.addSuccess(`Successfully started ${forecasterName}`);
        } catch (error) {
            core.notifications.toasts.addDanger(
                prettifyErrorMessage(`Error starting forecaster: ${error}`)
            );
        } finally {
            getUpdatedForecasters();
        }
    };

    const handleTestForecaster = async (forecasterId: string, forecasterName: string) => {
        setIsLoadingFinalForecasters(true);

        try {
            await dispatch(testForecaster(forecasterId, selectedDataSourceId));
            core.notifications.toasts.addSuccess(`Successfully started test for ${forecasterName}`);
        } catch (error) {
            core.notifications.toasts.addDanger(
                prettifyErrorMessage(`Error starting test for forecaster: ${error}`)
            );
        } finally {
            getUpdatedForecasters();
        }
    };

    const handleStopForecasterJob = async (forecasterId: string, forecasterName: string) => {
        setIsLoadingFinalForecasters(true);
        try {
            await dispatch(stopForecaster(forecasterId, selectedDataSourceId));
            core.notifications.toasts.addSuccess(`Successfully stopped ${forecasterName}`);
        } catch (error) {
            core.notifications.toasts.addDanger(
                prettifyErrorMessage(`Error stopping forecaster: ${error}`)
            );
        } finally {
            getUpdatedForecasters();
        };
    };

    const handleDeleteForecasterJob = async (forecasterId: string, forecasterName: string) => {
        setIsLoadingFinalForecasters(true);
        try {
            await dispatch(deleteForecaster(forecasterId, selectedDataSourceId));
            core.notifications.toasts.addSuccess(`Successfully deleted ${forecasterName}`);
        } catch (error) {
            core.notifications.toasts.addDanger(
                prettifyErrorMessage(`Error deleting forecaster: ${error}`)
            );
        } finally {
            getUpdatedForecasters();
        };
    };

    // Update the modal rendering section
    let modal;
    
    if (confirmModalState.isOpen) {
        switch (confirmModalState.action) {
            case FORECASTER_ACTION.START:
                modal = (
                    <ConfirmStartForecastersModal
                        forecasters={confirmModalState.affectedForecasters}
                        onStartForecaster={handleStartForecasterJob}
                        onHide={handleHideModal}
                        onConfirm={handleConfirmModal}
                        isListLoading={isLoading}
                    />
                );
                break;
            case FORECASTER_ACTION.STOP:
                modal = (
                    <ConfirmStopForecastersModal
                        forecasters={confirmModalState.affectedForecasters}
                        onStopForecaster={(forecasterId: string, forecasterName: string) => handleStopForecasterJob(forecasterId, forecasterName)}
                        onHide={handleHideModal}
                        onConfirm={handleConfirmModal}
                        isListLoading={isLoading}
                        actionText={confirmModalState.actionText}
                    />
                );
                break;
            case FORECASTER_ACTION.DELETE:
                const forecastToDelete = confirmModalState.affectedForecasters[0];
                modal = (
                    <ConfirmDeleteForecastersModal
                        forecasterId={forecastToDelete.id}
                        forecasterName={forecastToDelete.name}
                        forecasterState={forecastToDelete.curState}
                        onStopForecasters={(forecasterId: string, forecasterName: string) => handleStopForecasterJob(forecasterId, forecasterName)}
                        onDeleteForecasters={(forecasterId: string, forecasterName: string) => handleDeleteForecasterJob(forecasterId, forecasterName)}
                        onHide={handleHideModal}
                        onConfirm={handleConfirmModal}
                        isListLoading={isLoading}
                    />
                );
                break;
            case FORECASTER_ACTION.TEST:
                modal = (
                    <ConfirmTestForecasterModal
                        forecasterId={forecasterId}
                        forecasterName={forecasterName}
                        onClose={handleHideModal}
                        onConfirm={handleConfirmModal}
                        onTestForecaster={handleTestForecaster}
                        isListLoading={isLoading}
                    />
                );
                break;
            default:
                modal = null;
                break;
        }
    } else {
        modal = null;
    }


    return (
        <>
            <EuiPopover
                isOpen={isPopoverVisible}
                panelPaddingSize="none"
                anchorPosition="upCenter"
                button={
                    <EuiSmallButtonIcon
                        aria-label="Show actions"
                        iconType="boxesVertical"
                        color="text"
                        onClick={() => setIsPopoverVisible(!isPopoverVisible)}
                    />
                }
                closePopover={closePopover}
            >
                <EuiContextMenuPanel items={getActions()} size="s" title="Actions" />
            </EuiPopover>
            {modal}
        </>
    );
}

