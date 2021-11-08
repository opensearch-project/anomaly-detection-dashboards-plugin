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

import { Action } from 'redux';

export const SET_HIDE_SIDE_NAV_BAR_STATE = 'adApp/SET_HIDE_SIDE_NAV_BAR_STATE';

const initialAdAppState = {
  hideSideNavBar: false,
};

export interface AdAppState {
  hideSideNavBar: boolean;
}

const reducer = (state = initialAdAppState, action: Action) => {
  switch (action.type) {
    case SET_HIDE_SIDE_NAV_BAR_STATE: {
      // @ts-ignore
      const hideNaveBar = action.payload;
      return {
        ...state,
        hideSideNavBar: hideNaveBar,
      };
    }
    default:
      return state;
  }
};

export default reducer;
