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

import { createSelector } from 'reselect';
import { AppState } from '../reducers';

const opensearchSelector = (state: AppState) => state.opensearch;

const NUMBER_TYPES = [
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
];

export const getIndices = createSelector(
  opensearchSelector,
  (opensearch) => opensearch.indices
);

export const getDataTypes = createSelector(
  opensearchSelector,
  (opensearch) => opensearch.dataTypes
);

const getNumberFields = createSelector(getDataTypes, (dataTypes) => ({
  number: NUMBER_TYPES.reduce((acc, currentType) => {
    const newOptions = dataTypes[currentType] || [];
    return acc.concat(newOptions);
  }, []),
}));

const getOtherFields = createSelector(getDataTypes, (dataTypes) =>
  Object.keys(dataTypes).reduce((acc, dataType: string) => {
    if (NUMBER_TYPES.includes(dataType)) {
      return { ...acc };
    } else {
      return {
        ...acc,
        [dataType]: [...dataTypes[dataType]],
      };
    }
  }, {} as { [key: string]: string[] })
);

//TODO:: Memoize this selector to avoid calculation on each time
export const getAllFields = createSelector(
  getNumberFields,
  getOtherFields,
  (numberFields, otherFields): { [key: string]: string[] } => {
    return { ...numberFields, ...otherFields };
  }
);
