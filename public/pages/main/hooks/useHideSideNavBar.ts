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

import { useEffect } from 'react';
import { SET_HIDE_SIDE_NAV_BAR_STATE } from '../../../redux/reducers/adAppReducer';
import { useDispatch } from 'react-redux';

//A hook which hide side nav bar
export const useHideSideNavBar = (hidden: boolean, hiddenAfterClear: boolean) => {
    const dispatch = useDispatch();
    useEffect(
        () => {
            dispatch({ type: SET_HIDE_SIDE_NAV_BAR_STATE, payload: hidden })
            return () => {
                dispatch({ type: SET_HIDE_SIDE_NAV_BAR_STATE, payload: hiddenAfterClear })
            }
        },
        []
    );
};
