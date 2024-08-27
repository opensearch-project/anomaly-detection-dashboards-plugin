/*
 * Copyright OpenSearch Contributors
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

    ml.getAgent = ca({
        url: {
            fmt: `/_plugins/_ml/config/<%=id%>`,
            req: {
                id: {
                    type: 'string',
                    required: true,
                },
            },
        },
        method: 'GET',
    });

    ml.executeAgent = ca({
        url: {
            fmt: `/_plugins/_ml/agents/<%=agentId%>/_execute`,
            req: {
                agentId: {
                    type: 'string',
                    required: true,
                },
            },
        },
        needBody: true,
        method: 'POST',
    });
}
