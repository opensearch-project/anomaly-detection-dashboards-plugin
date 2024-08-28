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

import { convertFieldCapsToMappingStructure } from '../opensearchHelpers';

describe('transformFieldCapsResponse', () => {
  test('transform the field capabilities response into a structured mapping object', () => {
    const fieldCapsResponse = {
      indices: [
        'opensearch-ccs-cluster2:host-health-us-west-1',
        'opensearch-ccs-cluster2:sample-ecommerce',
      ],
      fields: {
        _routing: {
          _routing: { type: '_routing', searchable: true, aggregatable: false },
        },
        _doc_count: {
          long: { type: 'long', searchable: false, aggregatable: false },
        },
        total_revenue_usd: {
          integer: {
            type: 'integer',
            searchable: true,
            aggregatable: true,
            indices: ['opensearch-ccs-cluster2:sample-ecommerce'],
          },
          unmapped: {
            type: 'unmapped',
            searchable: false,
            aggregatable: false,
            indices: ['opensearch-ccs-cluster2:host-health-us-west-1'],
          },
        },
        cpu_usage_percentage: {
          integer: {
            type: 'integer',
            searchable: true,
            aggregatable: true,
            indices: ['opensearch-ccs-cluster2:host-health-us-west-1'],
          },
          unmapped: {
            type: 'unmapped',
            searchable: false,
            aggregatable: false,
            indices: ['opensearch-ccs-cluster2:sample-ecommerce'],
          },
        },
        timestamp: {
          date: { type: 'date', searchable: true, aggregatable: true },
        },
      },
    };

    const expectedOutput = {
      'opensearch-ccs-cluster2:host-health-us-west-1': {
        mappings: {
          properties: {
            cpu_usage_percentage: { type: 'integer' },
            timestamp: { type: 'date' },
          },
        },
      },
      'opensearch-ccs-cluster2:sample-ecommerce': {
        mappings: {
          properties: {
            total_revenue_usd: { type: 'integer' },
            timestamp: { type: 'date' },
          },
        },
      },
    };

    const result = convertFieldCapsToMappingStructure(fieldCapsResponse);
    expect(result).toEqual(expectedOutput);
  });
});
