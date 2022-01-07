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
import moment from 'moment';
import path from 'path';
import { ServerResponse } from '../models/types';
import { Router } from '../router';
import { SAMPLE_TYPE } from '../utils/constants';
import { loadSampleData } from '../sampleData/utils/helpers';
import {
  RequestHandlerContext,
  OpenSearchDashboardsRequest,
  OpenSearchDashboardsResponseFactory,
  IOpenSearchDashboardsResponse,
} from '../../../../src/core/server';

export function registerSampleDataRoutes(
  apiRouter: Router,
  sampleDataService: SampleDataService
) {
  apiRouter.post(
    '/create_sample_data/{type}',
    sampleDataService.createSampleData
  );
}

export default class SampleDataService {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  // Get the zip file stored in server, unzip it, and bulk insert it
  createSampleData = async (
    context: RequestHandlerContext,
    request: OpenSearchDashboardsRequest,
    opensearchDashboardsResponse: OpenSearchDashboardsResponseFactory
  ): Promise<IOpenSearchDashboardsResponse<any>> => {
    //@ts-ignore
    const type = request.params.type as SAMPLE_TYPE;
    try {
      let filePath = '';
      let indexName = '';

      switch (type) {
        case SAMPLE_TYPE.HTTP_RESPONSES: {
          filePath = path.resolve(
            __dirname,
            '../sampleData/rawData/httpResponses.json.gz'
          );
          indexName = 'sample-http-responses';
          break;
        }
        case SAMPLE_TYPE.ECOMMERCE: {
          filePath = path.resolve(
            __dirname,
            '../sampleData/rawData/ecommerce.json.gz'
          );
          indexName = 'sample-ecommerce';
          break;
        }
        case SAMPLE_TYPE.HOST_HEALTH: {
          filePath = path.resolve(
            __dirname,
            '../sampleData/rawData/hostHealth.json.gz'
          );
          indexName = 'sample-host-health';
          break;
        }
      }

      await loadSampleData(filePath, indexName, this.client, request);

      return opensearchDashboardsResponse.ok({ body: { ok: true } });
    } catch (err) {
      console.log('Anomaly detector - Unable to load the sample data', err);
      return opensearchDashboardsResponse.ok({
        body: { ok: false, error: err.message },
      });
    }
  };
}
