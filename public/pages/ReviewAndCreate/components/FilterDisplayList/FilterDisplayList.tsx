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

import { EuiText, EuiLink } from '@elastic/eui';
import React, { useState } from 'react';
import { get, isEmpty } from 'lodash';
import { FILTER_TYPES, UIFilter } from '../../../../models/interfaces';
import { CodeModal } from '../../../../components/CodeModal/CodeModal';
import { displayText } from '../../../DefineDetector/components/DataFilterList/utils/helpers';

interface FilterDisplayListProps {
  uiMetadata: any;
  filterQuery: any;
}

export const FilterDisplayList = (props: FilterDisplayListProps) => {
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [filterIndex, setFilterIndex] = useState<number>(-1);
  let filters = get(props, 'uiMetadata.filters', []);
  const oldFilterType = get(props, 'uiMetadata.filterType', undefined);

  // We want to show the custom filter if filters is empty and 
  // props.filterQuery isn't empty.
  // Two possible situations for the if branch:
  // First, old detectors with custom filters will have no filter list, but
  // will have a populated filter query.
  // Second, the detector has been created from API (no uiMetadata.* fields).
  if (isEmpty(filters) && !isEmpty(props.filterQuery)) {
    return (
      <div>
        <EuiText>
          <p className="enabled">
            {'Custom expression:'}{' '}
            <EuiLink
              data-test-subj="viewFilter"
              onClick={() => {
                setShowCodeModal(true);
              }}
            >
              View code
            </EuiLink>
          </p>
        </EuiText>
        {showCodeModal ? (
          <CodeModal
            code={props.filterQuery}
            title="Filter query"
            subtitle="Custom expression"
            closeModal={() => setShowCodeModal(false)}
          />
        ) : null}
      </div>
    );
  } else if (isEmpty(filters)) {
    return (
      <EuiText>
        <p className="enabled">-</p>
      </EuiText>
    );
  } else {
    return (
      <ol>
        {filters.map((filter: UIFilter, index: number) => {
          if (
            filter.filterType === FILTER_TYPES.SIMPLE ||
            oldFilterType === FILTER_TYPES.SIMPLE
          ) {
            return (
              <li className="enabled" key={index}>
                {displayText(filter)}
              </li>
            );
          } else {
            return (
              <div>
                <EuiText>
                  <p className="enabled">
                    {!isEmpty(filter.label)
                      ? `${filter.label}:`
                      : 'Custom expression:'}{' '}
                    <EuiLink
                      data-test-subj="viewFilter"
                      onClick={() => {
                        setShowCodeModal(true);
                        setFilterIndex(index);
                      }}
                    >
                      View code
                    </EuiLink>
                  </p>
                </EuiText>
                {showCodeModal && filterIndex === index ? (
                  <CodeModal
                    code={get(filter, 'query', props.filterQuery)}
                    title="Filter query"
                    subtitle="Custom expression"
                    closeModal={() => setShowCodeModal(false)}
                  />
                ) : null}
              </div>
            );
          }
        })}
      </ol>
    );
  }
};
