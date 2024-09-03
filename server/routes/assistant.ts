/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

//@ts-ignore
import { get, set } from 'lodash';
import { Router } from '../router';
import { getErrorMessage } from './utils/adHelpers';
import {
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
} from '../../../../src/core/server';
import { getClientBasedOnDataSource } from '../utils/helpers';
import { SUGGEST_ANOMALY_DETECTOR_CONFIG_ID } from '../utils/constants';

export function registerAssistantRoutes(
  apiRouter: Router,
  assistantService: AssistantService
) {
  apiRouter.post('/_generate_parameters', assistantService.generateParameters);
}

export default class AssistantService {
  private client: any;
  dataSourceEnabled: boolean;

  constructor(client: any, dataSourceEnabled: boolean) {
    this.client = client;
    this.dataSourceEnabled = dataSourceEnabled;
  }

  generateParameters = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    try {
      const { dataSourceId = '' } = request.params as { dataSourceId?: string };
      const { index } = request.body as { index: string };
      if (!index) {
        throw new Error('index cannot be empty');
      }
      const callWithRequest = getClientBasedOnDataSource(
        context,
        this.dataSourceEnabled,
        request,
        dataSourceId,
        this.client
      );

      const getAgentResponse = await callWithRequest('ml.getAgent', {
        id: SUGGEST_ANOMALY_DETECTOR_CONFIG_ID,
      });

      if (
        !getAgentResponse || !(getAgentResponse.ml_configuration?.agent_id || getAgentResponse.configuration?.agent_id)
      ) {
        throw new Error(
          'Cannot get flow agent id for generating anomaly detector'
        );
      }

      const agentId = getAgentResponse.ml_configuration?.agent_id || getAgentResponse.configuration?.agent_id;

      const executeAgentResponse = await callWithRequest('ml.executeAgent', {
        agentId: agentId,
        body: {
          parameters: {
            index: index,
          },
        },
      });
      if (
        !executeAgentResponse ||
        !executeAgentResponse['inference_results'] ||
        !executeAgentResponse['inference_results'][0].output[0] ||
        !executeAgentResponse['inference_results'][0].output[0].result
      ) {
        throw new Error('Execute agent for generating anomaly detector failed');
      }

      return opensearchDashboardsResponse.ok({
        body: {
          ok: true,
          generatedParameters: JSON.parse(
            executeAgentResponse['inference_results'][0].output[0].result
          ),
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
