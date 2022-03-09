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

import { API } from '../../utils/constants';

export default function adPlugin(Client: any, config: any, components: any) {
  const ca = components.clientAction.factory;

  Client.prototype.ad = components.clientAction.namespaceFactory();
  const ad = Client.prototype.ad.prototype;
  ad.deleteDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'DELETE',
  });

  ad.previewDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/_preview`,
    },
    needBody: true,
    method: 'POST',
  });
  ad.createDetector = ca({
    url: {
      fmt: API.DETECTOR_BASE,
    },
    needBody: true,
    method: 'POST',
  });
  ad.validateDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/_validate/<%=validationType%>`,
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
  ad.searchDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/_search`,
    },
    needBody: true,
    method: 'POST',
  });
  ad.searchTasks = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/tasks/_search`,
    },
    needBody: true,
    method: 'POST',
  });
  ad.updateDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>?if_seq_no=<%=ifSeqNo%>&if_primary_term=<%=ifPrimaryTerm%>&refresh=wait_for`,
      req: {
        detectorId: {
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
  ad.getDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>?job=true&task=true`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  ad.searchResults = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/results/_search`,
    },
    needBody: true,
    method: 'POST',
  });

  ad.searchResultsFromCustomResultIndex = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/results/_search/<%=resultIndex%>?only_query_custom_result_index=<%=onlyQueryCustomResultIndex%>`,
      req: {
        resultIndex: {
          type: 'string',
          required: false,
        },
        onlyQueryCustomResultIndex: {
          type: 'string',
          required: false,
        },
      },
    },
    needBody: true,
    method: 'POST',
  });

  ad.startDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>/_start`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'POST',
  });

  ad.startHistoricalDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>/_start`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
      needBody: true,
    },
    method: 'POST',
  });

  ad.stopDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>/_stop`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'POST',
  });

  ad.stopHistoricalDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>/_stop?historical=true`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'POST',
  });

  ad.detectorProfile = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>/_profile/init_progress,state,error`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  ad.matchDetector = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/match?name=<%=detectorName%>`,
      req: {
        detectorName: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: true,
    method: 'GET',
  });

  ad.detectorCount = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/count`,
    },
    method: 'GET',
  });

  ad.topAnomalyResults = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>/results/_topAnomalies?historical=false`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
      needBody: true,
    },
    method: 'POST',
  });

  ad.topHistoricalAnomalyResults = ca({
    url: {
      fmt: `${API.DETECTOR_BASE}/<%=detectorId%>/results/_topAnomalies?historical=true`,
      req: {
        detectorId: {
          type: 'string',
          required: true,
        },
      },
      needBody: true,
    },
    method: 'POST',
  });
}
