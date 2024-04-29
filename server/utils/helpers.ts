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

import {
  camelCase,
  isEmpty,
  isPlainObject,
  map,
  mapKeys,
  mapValues,
  snakeCase,
} from 'lodash';

import { MIN_IN_MILLI_SECS } from './constants';
import {
  ILegacyClusterClient,
  LegacyCallAPIOptions,
  OpenSearchDashboardsRequest,
  RequestHandlerContext,
} from '../../../../src/core/server';

export const SHOW_DECIMAL_NUMBER_THRESHOLD = 0.01;

export function mapKeysDeep(obj: object, fn: any): object | any[] {
  if (Array.isArray(obj)) {
    return map(obj, (innerObj) => mapKeysDeep(innerObj, fn));
  } else {
    //@ts-ignore
    return isPlainObject(obj)
      ? mapValues(mapKeys(obj, fn), (value) => mapKeysDeep(value, fn))
      : obj;
  }
}

export const toSnake = (value: any, key: string) => snakeCase(key);

export const toCamel = (value: any, key: string) => camelCase(key);

export const getFloorPlotTime = (plotTime: number): number => {
  return Math.floor(plotTime / MIN_IN_MILLI_SECS) * MIN_IN_MILLI_SECS;
};

export const toFixedNumber = (num: number, digits?: number, base?: number) => {
  var pow = Math.pow(base || 10, digits || 2);
  return Math.round(num * pow) / pow;
};

// 1.If num>0.01, will keep two digits;
// 2.If num<0.01, will use scientific notation, for example 0.001234 will become 1.23e-3
export const toFixedNumberForAnomaly = (num: number): number => {
  return num >= SHOW_DECIMAL_NUMBER_THRESHOLD
    ? toFixedNumber(num, 2)
    : Number(num.toExponential(2));
};

export const formatAnomalyNumber = (num: number): string => {
  return num >= SHOW_DECIMAL_NUMBER_THRESHOLD
    ? num.toFixed(2)
    : num.toExponential(2);
};

const PERMISSIONS_ERROR_PATTERN =
  /no permissions for \[(.+)\] and User \[name=(.+), backend_roles/;

export const NO_PERMISSIONS_KEY_WORD = 'no permissions';

export const DOES_NOT_HAVE_PERMISSIONS_KEY_WORD = 'does not have permissions';

export const CANT_FIND_KEY_WORD = "Can't find";

export const prettifyErrorMessage = (rawErrorMessage: string) => {
  if (isEmpty(rawErrorMessage) || rawErrorMessage === 'undefined') {
    return 'Unknown error is returned.';
  }
  const match = rawErrorMessage.match(PERMISSIONS_ERROR_PATTERN);
  if (isEmpty(match)) {
    return rawErrorMessage;
  } else {
    return `User ${match[2]} has no permissions to [${match[1]}].`;
  }
};

export function getClientBasedOnDataSource(
  context: RequestHandlerContext,
  dataSourceEnabled: boolean,
  request: OpenSearchDashboardsRequest,
  dataSourceId: string,
  client: ILegacyClusterClient
): (
  endpoint: string,
  clientParams?: Record<string, any>,
  options?: LegacyCallAPIOptions
) => any {
  if (dataSourceEnabled && dataSourceId && dataSourceId.trim().length != 0) {
    // client for remote cluster
    return context.dataSource.opensearch.legacy.getClient(dataSourceId).callAPI;
  } else {
    // fall back to default local cluster
    return client.asScoped(request).callAsCurrentUser;
  }
}
