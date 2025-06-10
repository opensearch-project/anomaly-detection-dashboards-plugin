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

import { API, CUSTOM_FORECAST_RESULT_INDEX_WILDCARD, DEFAULT_FORECAST_RESULT_INDEX_WILDCARD } from '../../utils/constants';

export default function forecastFeature(Client: any, config: any, components: any) {
  const ca = components.clientAction.factory;

  Client.prototype.forecast = components.clientAction.namespaceFactory();
  const forecast = Client.prototype.forecast.prototype;
  forecast.deleteForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/<%=forecasterId%>`,
      req: {
        forecasterId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'DELETE',
  });

  forecast.runOnceForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/<%=forecasterId%>/_run_once`,
      req: {
        forecasterId: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: true,
    method: 'POST',
  });
  forecast.createForecaster = ca({
    url: {
      fmt: API.FORECASTER_BASE,
    },
    needBody: true,
    method: 'POST',
  });
  forecast.validateForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/_validate/<%=validationType%>`,
      req: {
        validationType: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: true,
    method: 'POST',
  });
  forecast.suggestForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/_suggest/<%=suggestType%>`,
      req: {
        suggestType: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: true,
    method: 'POST',
  });
  forecast.searchForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/_search`,
    },
    needBody: true,
    method: 'POST',
  });
  forecast.searchTasks = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/tasks/_search`,
    },
    needBody: true,
    method: 'POST',
  });
  forecast.updateForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/<%=forecasterId%>?if_seq_no=<%=ifSeqNo%>&if_primary_term=<%=ifPrimaryTerm%>&refresh=wait_for`,
      req: {
        forecasterId: {
          type: 'string',
          required: true,
        },
        ifSeqNo: {
          type: 'string',
          required: true,
        },
        ifPrimaryTerm: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: true,
    method: 'PUT',
  });
  forecast.getForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/<%=forecasterId%>?job=true&task=true`,
      req: {
        forecasterId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  forecast.searchResults = ca({
    url: {
      fmt: `/${DEFAULT_FORECAST_RESULT_INDEX_WILDCARD}/_search`,
    },
    needBody: true,
    method: 'POST',
  });

  forecast.searchResultsFromCustomResultIndex = ca({
    url: {
      fmt: `/<%=resultIndex%>/_search`,
      req: {
        resultIndex: {
          type: 'string',
          required: false,
        },
      },
    },
    needBody: true,
    method: 'POST',
  });

  forecast.startForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/<%=forecasterId%>/_start`,
      req: {
        forecasterId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'POST',
  });

  forecast.stopForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/<%=forecasterId%>/_stop`,
      req: {
        forecasterId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'POST',
  });

  forecast.forecasterProfile = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/<%=forecasterId%>/_profile/init_progress,state,error`,
      req: {
        forecasterId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  forecast.matchForecaster = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/match?name=<%=forecasterName%>`,
      req: {
        forecasterName: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: true,
    method: 'GET',
  });

  forecast.forecasterCount = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/count`,
    },
    method: 'GET',
  });

  forecast.topForecastResults = ca({
    url: {
      fmt: `${API.FORECASTER_BASE}/<%=forecasterId%>/results/_topForecasts`,
      req: {
        forecasterId: {
          type: 'string',
          required: true,
        },
      },
      needBody: true,
    },
    method: 'POST',
  });
}
