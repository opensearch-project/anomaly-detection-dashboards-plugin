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

/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
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
  const isOldDetector = !isEmpty(oldFilterType);

  // Old detectors with custom filters will have no filter list, but
  // will have a populated filter query
  if (isEmpty(filters) && isOldDetector && !isEmpty(props.filterQuery)) {
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
