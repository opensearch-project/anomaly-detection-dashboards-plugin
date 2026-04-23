/*
 * SPDX-License-Identifier: Apache-2.0
 */

export default function mlPlugin(
  Client: any,
  config: any,
  components: any
) {
  const ca = components.clientAction.factory;

  Client.prototype.ml = components.clientAction.namespaceFactory();
  const ml = Client.prototype.ml.prototype;

  ml.executeAgent = ca({
    url: {
      fmt: `/_plugins/_ml/agents/<%=agentId%>/_execute?async=<%=async%>`,
      req: {
        agentId: {
          type: 'string',
          required: true,
        },
        async: {
          type: 'boolean',
          required: false,
        },
      },
    },
    needBody: true,
    method: 'POST',
  });

  ml.getTask = ca({
    url: {
      fmt: `/_plugins/_ml/tasks/<%=taskId%>`,
      req: {
        taskId: {
          type: 'string',
          required: true,
        },
      },
    },
    method: 'GET',
  });

  ml.predict = ca({
    url: {
      fmt: `/_plugins/_ml/models/<%=modelId%>/_predict`,
      req: {
        modelId: {
          type: 'string',
          required: true,
        },
      },
    },
    needBody: true,
    method: 'POST',
  });
}
