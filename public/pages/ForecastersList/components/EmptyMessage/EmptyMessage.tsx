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

import { EuiSmallButton, EuiEmptyPrompt, EuiText, EuiLink } from '@elastic/eui';
import React from 'react';
import { CreateForecasterButtons } from '../../../../components/CreateForecasterButtons/CreateForecasterButtons';
import { FORECASTER_DOCS_LINK } from '../../../../utils/constants';

const FILTER_TEXT =
  'There are no results for your search. Reset the search criteria to view forecasts.';
const EMPTY_TEXT = 'Forecasts appear here.';

interface EmptyForecasterProps {
  isFilterApplied: boolean;
  onResetFilters: () => void;
}

export const EmptyForecasterMessage = (props: EmptyForecasterProps) => (
  <EuiEmptyPrompt
    data-test-subj="emptyForecasterListMessage"
    style={{ maxWidth: '45em' }}
    body={
      <EuiText size="s">
        <p>
          {props.isFilterApplied ? FILTER_TEXT : EMPTY_TEXT}
          {!props.isFilterApplied && (
            <>
              {' '}
              <EuiLink href={`${FORECASTER_DOCS_LINK}`} target="_blank">
                Learn more
              </EuiLink>
            </>
          )}
        </p>
      </EuiText>
    }
    actions={
      props.isFilterApplied ? (
        <EuiSmallButton
          fill
          onClick={props.onResetFilters}
          data-test-subj="resetListFilters"
        >
          Reset search criteria
        </EuiSmallButton>
      ) : (
        <CreateForecasterButtons />
      )
    }
  />
);
