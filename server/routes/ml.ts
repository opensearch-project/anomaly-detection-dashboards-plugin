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

import { Router } from '../router';
import { getErrorMessage } from './utils/adHelpers';
import {
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
} from '../../../../src/core/server';
import { getClientBasedOnDataSource } from '../utils/helpers';

export function registerMLRoutes(
  apiRouter: Router,
  mlService: MLService
) {
  apiRouter.post('/agents/{agentId}/execute', mlService.executeAgent);
  apiRouter.post('/agents/{agentId}/execute/{dataSourceId}', mlService.executeAgent);
}

export default class MLService {
  private client: any;
  dataSourceEnabled: boolean;

  constructor(client: any, dataSourceEnabled: boolean) {
    this.client = client;
    this.dataSourceEnabled = dataSourceEnabled;
  }

  executeAgent = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    
    try {
      const { agentId, dataSourceId = '' } = request.params as { agentId: string, dataSourceId?: string };
      const { indices } = request.body as { indices: string[] };
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const requestBody = {
        parameters: {
          input: indices
        }
      };
      
      const response = await callWithRequest('ml.executeAgent', {
        agentId: agentId,
        async: true,
        body: requestBody
      });

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          response: response,
        },
      });
    } catch (err) {
      return opensearchDashboardsResponse.ok({
        body: {
          ok: false,
          error: getErrorMessage(err),
        },
      });
    }
  };
}
