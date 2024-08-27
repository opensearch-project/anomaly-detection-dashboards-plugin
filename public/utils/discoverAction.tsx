/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'
import { ANOMALY_DETECTION_ICON } from "./constants";
import GenerateAnomalyDetector from "../components/DiscoverAction/GenerateAnomalyDetector";
import { getClient, getOverlays } from '../../public/services';
import { toMountPoint } from "../../../../src/plugins/opensearch_dashboards_react/public";
import { Provider } from "react-redux";
import configureStore from '../redux/configureStore';
import { DiscoverAction, DiscoverActionContext } from "../../../../src/plugins/data_explorer/public/types";

export const getDiscoverAction = (): DiscoverAction => {
    const onClick = function (context: DiscoverActionContext) {
        const overlayService = getOverlays();
        const openFlyout = overlayService.openFlyout;
        const store = configureStore(getClient());
        const overlay = openFlyout(
            toMountPoint(
                <Provider store={store}>
                    <GenerateAnomalyDetector
                        closeFlyout={() => overlay.close()}
                        context={context}
                    />
                </Provider>
            )
        );
    }

    return {
        order: 0,
        name: 'Generate anomaly detector',
        iconType: ANOMALY_DETECTION_ICON,
        onClick: onClick,
    }
};
