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
import _ from 'lodash';
import { Mappings } from 'public/redux/reducers/opensearch';

export const convertFieldCapsToMappingStructure = (fieldCapsResponse) => {
  let mappings: Mappings = {};

  fieldCapsResponse.indices.forEach((index) => {
    mappings[index] = {
      mappings: {
        properties: {},
      },
    };
  });
  for (const [fieldName, fieldDetails] of Object.entries(
    fieldCapsResponse.fields
  )) {
    if (fieldName.startsWith('_')) {
      continue;
    }
    for (const [fieldType, typeDetails] of Object.entries(fieldDetails)) {
      if (fieldType == 'unmapped') {
        continue;
      }
      let mapped_indices = _.get(
        typeDetails,
        'indices',
        fieldCapsResponse.indices
      );
      mapped_indices.forEach((mappedIndex) => {
        mappings[mappedIndex]['mappings']['properties'][fieldName] = {
          type: typeDetails.type,
        };
      });
    }
  }
  return mappings;
};
