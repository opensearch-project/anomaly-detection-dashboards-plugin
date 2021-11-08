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


import { DataTypes, Mappings } from './opensearch';

export function shouldSkip(mapping: any) {
  const isDisabled = mapping.enabled === false;
  const hasIndexDisabled = mapping.index === false;
  const isNestedDataType = mapping.type === 'nested';
  return isDisabled || hasIndexDisabled || isNestedDataType;
}

export function resolvePath(path: string, field: string): string {
  if (path) return `${path}.${field}`;
  return field;
}

export function getTypeFromMappings(
  mappings: Mappings,
  dataTypes: DataTypes,
  path = ''
): DataTypes {
  let currentDataTypes = { ...dataTypes };
  if (shouldSkip(mappings)) return currentDataTypes;

  if (mappings.properties) {
    Object.entries(mappings.properties).forEach(([field, value]) => {
      currentDataTypes = getTypeFromMappings(
        value as Mappings,
        currentDataTypes,
        resolvePath(path, field)
      );
    });
    return currentDataTypes;
  }
  const type = mappings.type;

  if (currentDataTypes[type]) {
    if (currentDataTypes[type].indexOf(path) === -1) {
      currentDataTypes[type].push(path);
    }
  } else {
    currentDataTypes[type] = [path];
  }

  if (mappings.fields) {
    Object.entries(mappings.fields).forEach(([field, value]) => {
      currentDataTypes = getTypeFromMappings(
        value as Mappings,
        currentDataTypes,
        resolvePath(path, field)
      );
    });
  }

  return currentDataTypes;
}

export function getPathsPerDataType(mappings: Mappings): DataTypes {
  let dataTypesPath: DataTypes = {};
  Object.entries(mappings).forEach(([index, { mappings: docMappings }]) => {
    dataTypesPath = getTypeFromMappings(docMappings, dataTypesPath);
  });
  return dataTypesPath;
}
