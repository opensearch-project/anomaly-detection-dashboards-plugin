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

//@ts-ignore
import { get, set } from 'lodash';
import { SearchResponse } from '../models/interfaces';
import { Monitor } from '../models/types';
import { Router } from '../router';
import { MAX_MONITORS } from '../utils/constants';
import { getErrorMessage } from './utils/adHelpers';
import {
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
} from '../../../../src/core/server';

export function registerAlertingRoutes(
  apiRouter: Router,
  alertingService: AlertingService
) {
  apiRouter.post('/monitors/_search', alertingService.searchMonitors);
  apiRouter.get('/monitors/alerts', alertingService.searchAlerts);
}

export default class AlertingService {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  searchMonitors = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const requestBody = {
        size: MAX_MONITORS,
        query: {
          nested: {
            path: 'monitor.inputs',
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'monitor.inputs.search.indices.keyword': {
                        value: '.opendistro-anomaly-results*',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };
      const response: SearchResponse<Monitor> = await this.client
        .asScoped(request)
        .callAsCurrentUser('alerting.searchMonitors', { body: requestBody });
      const totalMonitors = get(response, 'hits.total.value', 0);
      const allMonitors = get(response, 'hits.hits', []).reduce(
        (acc: any, monitor: any) => ({
          ...acc,
          [monitor._id]: {
            id: monitor._id,
            name: get(monitor, '_source.name'),
            enabled: get(monitor, '_source.enabled', false),
            enabledTime: get(monitor, '_source.enabled_time'),
            schedule: get(monitor, '_source.schedule'),
            inputs: get(monitor, '_source.inputs'),
            triggers: get(monitor, '_source.triggers'),
            lastUpdateTime: get(monitor, '_source.last_update_time'),
          },
        }),
        {}
      );

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: {
            totalMonitors,
            monitors: Object.values(allMonitors),
          },
        },
      });
    } catch (err) {
      console.log('Unable to get monitor on top of detector', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };

  searchAlerts = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { monitorId, startTime, endTime } = request.query as {
        monitorId?: string;
        startTime?: number;
        endTime?: number;
      };
      const response = await this.client
        .asScoped(request)
        .callAsCurrentUser('alerting.searchAlerts', {
          monitorId: monitorId,
          startTime: startTime,
          endTime: endTime,
        });
      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response,
        },
      });
    } catch (err) {
      console.log('Unable to search alerts', err);
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };
}
