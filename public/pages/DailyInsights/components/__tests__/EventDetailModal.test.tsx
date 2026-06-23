/*
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EventDetailModal } from '../EventDetailModal';
import { buildDiscoverUrl } from '../../utils/discoverLink';

jest.mock('../../utils/discoverLink', () => ({
  buildDiscoverUrl: jest.fn(),
}));

const baseCluster = {
  indices: ['logs-*'],
  detector_ids: ['det-1', 'det-2'],
  detector_names: ['CPU detector', 'Latency detector'],
  entities: ['service.name=checkout'],
  model_ids: ['model-1'],
  num_anomalies: 1,
  event_start: '2026-04-07T10:00:00.000Z',
  event_end: '2026-04-07T10:05:00.000Z',
  cluster_text: 'Cluster text fallback',
  anomalies: [
    {
      model_id: 'model-1',
      detector_id: 'det-1',
      data_start_time: '2026-04-07T10:00:00.000Z',
      data_end_time: '2026-04-07T10:05:00.000Z',
    },
  ],
};

const baseProps = {
  cluster: baseCluster,
  onClose: jest.fn(),
  detectorDescriptions: {
    'det-1': 'Tracks checkout CPU anomalies',
    'det-2': 'Automatically created by OpenSearch',
  },
  detectorFeatures: {
    'det-1': ['avg_cpu'],
  },
  detectorTimeFields: {
    'det-1': '@timestamp',
  },
  anomalyEntities: {
    'model-1': ['service.name=checkout'],
  },
  dataSourceId: 'ds-1',
  core: {} as any,
};

describe('EventDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders an AI summary when one is available', () => {
    render(<EventDetailModal {...baseProps} llmSummary="AI saw a checkout CPU spike." />);

    expect(screen.getByText('AI Summary')).toBeInTheDocument();
    expect(screen.getByText('AI saw a checkout CPU spike.')).toBeInTheDocument();
  });

  test('renders the loading summary state', () => {
    render(<EventDetailModal {...baseProps} llmLoading={true} />);

    expect(screen.getByText('Generating summary...')).toBeInTheDocument();
  });

  test('renders fallback detector descriptions and filters generic auto-generated text', () => {
    render(<EventDetailModal {...baseProps} />);

    expect(screen.getByText(/1 anomaly detected/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /CPU detector/i })).toBeInTheDocument();
    expect(screen.getByText(/Tracks checkout CPU anomalies/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Automatically created by OpenSearch/i)
    ).not.toBeInTheDocument();
  });

  test('does not try to build a Discover URL when core is unavailable', async () => {
    render(<EventDetailModal {...baseProps} core={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Discover' }));

    await waitFor(() => {
      expect(buildDiscoverUrl).not.toHaveBeenCalled();
    });
  });

  test('builds and opens the Discover URL for an anomaly', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    (buildDiscoverUrl as jest.Mock).mockResolvedValue('https://example.test/discover');

    render(<EventDetailModal {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Discover' }));

    await waitFor(() => {
      expect(buildDiscoverUrl).toHaveBeenCalledWith(
        baseProps.core,
        expect.objectContaining({
          indices: ['logs-*'],
          startTime: '2026-04-07T10:00:00.000Z',
          endTime: '2026-04-07T10:05:00.000Z',
          entities: ['service.name=checkout'],
          timeField: '@timestamp',
          dataSourceId: 'ds-1',
        })
      );
      expect(openSpy).toHaveBeenCalledWith('https://example.test/discover', '_blank');
    });

    openSpy.mockRestore();
  });
});
