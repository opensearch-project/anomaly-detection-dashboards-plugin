export const featureQuery1 = {
  featureName: 'value',
  featureEnabled: true,
  aggregationQuery: {
    size: 0,
    query: {
      bool: {
        must: {
          terms: {
            detector_id: ['detector_1', 'detector_2'],
          },
        },
      },
    },
    aggs: {
      unique_detectors: {
        terms: {
          field: 'detector_id',
          size: 20,
          order: {
            total_anomalies_in_24hr: 'asc',
          },
        },
        aggs: {
          total_anomalies_in_24hr: {
            filter: {
              range: {
                data_start_time: { gte: 'now-24h', lte: 'now' },
              },
            },
          },
          latest_anomaly_time: { max: { field: 'data_start_time' } },
        },
      },
    },
  },
} as { [key: string]: any };

export const featureQuery2 = {
  featureName: 'value2',
  featureEnabled: true,
  aggregationQuery: {
    aggregation_name: {
      max: {
        field: 'value2',
      },
    },
  },
} as { [key: string]: any };
