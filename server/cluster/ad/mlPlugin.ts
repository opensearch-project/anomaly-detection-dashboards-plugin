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
}
