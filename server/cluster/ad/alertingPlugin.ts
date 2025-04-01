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

import { API, MAX_ALERTS } from '../../utils/constants';

export default function alertingPlugin(
  Client: any,
  config: any,
  components: any
) {
  const ca = components.clientAction.factory;

  Client.prototype.adAlerting = components.clientAction.namespaceFactory();
  const adAlerting = Client.prototype.adAlerting.prototype;

  adAlerting.searchMonitors = ca({
    url: {
      fmt: `${API.ALERTING_BASE}/_search`,
    },
    needBody: true,
    method: 'POST',
  });

  adAlerting.searchAlerts = ca({
    url: {
      fmt: `${API.ALERTING_BASE}/alerts?size=${MAX_ALERTS}&monitorId=<%=monitorId%>&sortString=start_time&sortOrder=desc&searchString=start_time:[<%=startTime%>%20TO%20<%=endTime%>]`,
      req: {
        monitorId: {
          type: 'string',
          required: true,
        },
        startTime: {
          type: 'number',
          required: true,
        },
        endTime: {
          type: 'number',
          required: true,
        },
      },
    },
    method: 'GET',
  });
}
