/*
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  EnhancedSelectionModal,
  flattenGroupedOptions,
  getClustersStringForSearchQuery,
  getVisibleClusterOptions,
} from '../EnhancedSelectionModal';

const mockDispatch = jest.fn();
const mockGetVisibleOptions = jest.fn();
const mockGetLocalCluster = jest.fn((clusters: any[]) =>
  clusters.filter((cluster) => cluster.localCluster)
);
const mockSanitizeSearchText = jest.fn((value: string) => value.trim());
const mockGetClustersInfo = jest.fn((dataSourceId?: string) => ({
  type: 'opensearch/GET_CLUSTERS_INFO',
  dataSourceId,
}));
const mockGetIndicesAndAliases = jest.fn(
  (query: string, dataSourceId: string | undefined, clusters: string, hasLocalCluster: boolean) => ({
    type: 'opensearch/GET_INDICES_AND_ALIASES',
    query,
    dataSourceId,
    clusters,
    hasLocalCluster,
  })
);
const mockGetPrioritizedIndices = jest.fn(
  (query: string, dataSourceId: string | undefined, clusters: string) => ({
    type: 'opensearch/GET_PRIORITIZED_INDICES',
    query,
    dataSourceId,
    clusters,
  })
);

let mockOpensearchState: any;

jest.mock('lodash', () => {
  const actual = jest.requireActual('lodash');
  return {
    ...actual,
    debounce: (fn: (...args: any[]) => any) => fn,
  };
});

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: any) => any) => selector({ opensearch: mockOpensearchState }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/daily-insights',
    search: '',
  }),
}));

jest.mock('../../../utils/helpers', () => ({
  getDataSourceFromURL: () => ({ dataSourceId: undefined }),
  getLocalCluster: (...args: any[]) => mockGetLocalCluster(...args),
  sanitizeSearchText: (...args: any[]) => mockSanitizeSearchText(...args),
  getVisibleOptions: (...args: any[]) => mockGetVisibleOptions(...args),
}));

jest.mock('../../../DefineDetector/utils/helpers', () => ({
  getClusterOptionLabel: (cluster: any) => (cluster.localCluster ? '[Local]' : cluster.name),
}));

jest.mock('../../../../services', () => ({
  getDataSourceEnabled: () => ({ enabled: false }),
}));

jest.mock('../../../../redux/reducers/opensearch', () => ({
  getClustersInfo: (...args: any[]) => mockGetClustersInfo(...args),
  getIndicesAndAliases: (...args: any[]) => mockGetIndicesAndAliases(...args),
  getPrioritizedIndices: (...args: any[]) => mockGetPrioritizedIndices(...args),
}));

const groupedOptions = [
  {
    label: 'Indices: [Local]',
    options: [{ label: 'logs-1' }],
  },
  {
    label: 'Aliases: [Local]',
    options: [{ label: 'logs-current' }],
  },
  {
    label: 'Indices: remote-a',
    options: [{ label: 'remote-a:logs-2' }],
  },
];

const defaultProps = {
  isVisible: true,
  selectedIndices: ['logs-1'],
  onSelectionChange: jest.fn(),
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
};

describe('EnhancedSelectionModal helpers', () => {
  test('builds a remote-cluster query string', () => {
    expect(
      getClustersStringForSearchQuery([
        { label: '[Local]', cluster: 'local', localcluster: 'true' },
        { label: 'remote-a', cluster: 'remote-a', localcluster: 'false' },
        { label: 'remote-b', cluster: 'remote-b', localcluster: 'false' },
      ])
    ).toBe('remote-a,remote-b');
  });

  test('sorts visible clusters with local first', () => {
    expect(
      getVisibleClusterOptions([
        { name: 'remote-b', localCluster: false },
        { name: 'local', localCluster: true },
        { name: 'remote-a', localCluster: false },
      ] as any)
    ).toEqual([
      { label: '[Local]', cluster: 'local', localcluster: 'true' },
      { label: 'remote-a', cluster: 'remote-a', localcluster: 'false' },
      { label: 'remote-b', cluster: 'remote-b', localcluster: 'false' },
    ]);
  });

  test('flattens grouped options into index and alias rows with metadata', () => {
    expect(
      flattenGroupedOptions(
        groupedOptions,
        [
          { index: 'logs-1', 'docs.count': '42', 'store.size': '1kb' },
          { index: 'remote-a:logs-2', 'docs.count': '3', 'store.size': '2kb' },
        ] as any,
        [{ alias: 'logs-current', index: 'logs-1' }] as any
      )
    ).toEqual([
      {
        name: 'logs-1',
        displayName: 'logs-1',
        type: 'index',
        cluster: '[Local]',
        docCount: 42,
        size: '1kb',
      },
      {
        name: 'logs-current',
        displayName: 'logs-current (alias)',
        type: 'alias',
        cluster: '[Local]',
        docCount: 0,
        size: 'Alias for: logs-1',
      },
      {
        name: 'remote-a:logs-2',
        displayName: 'remote-a:logs-2',
        type: 'index',
        cluster: 'remote-a',
        docCount: 3,
        size: '2kb',
      },
    ]);
  });
});

describe('EnhancedSelectionModal', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockOpensearchState = {
      requesting: false,
      clusters: [
        { name: 'local', localCluster: true },
        { name: 'remote-a', localCluster: false },
      ],
      indices: [
        { index: 'logs-1', 'docs.count': '42', 'store.size': '1kb' },
        { index: 'remote-a:logs-2', 'docs.count': '3', 'store.size': '2kb' },
      ],
      aliases: [{ alias: 'logs-current', index: 'logs-1' }],
    };
    mockGetVisibleOptions.mockReturnValue(groupedOptions);
    mockDispatch.mockResolvedValue({});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('renders badges, dispatches search actions, and lets the user clear and toggle selections', async () => {
    const onSelectionChange = jest.fn();
    const onCancel = jest.fn();

    render(
      <EnhancedSelectionModal
        {...defaultProps}
        selectedIndices={['logs-1', 'logs-current', 'remote-a:logs-2', 'overflow-index']}
        onSelectionChange={onSelectionChange}
        onCancel={onCancel}
        existingDetectorCounts={{
          'logs-1': {
            count: 2,
            names: ['Detector A', 'Detector B'],
          },
        }}
      />
    );

    await waitFor(() => {
      expect(mockGetClustersInfo).toHaveBeenCalledWith(undefined);
      expect(mockGetIndicesAndAliases).toHaveBeenCalledWith('', undefined, '', true);
    });

    expect(screen.getByText('4 selected')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('2 detectors')).toBeInTheDocument();

    fireEvent.click(document.getElementById('index-logs-1-0') as HTMLElement);
    expect(onSelectionChange).toHaveBeenCalledWith([
      'logs-current',
      'remote-a:logs-2',
      'overflow-index',
    ]);

    fireEvent.change(screen.getByPlaceholderText('Search indices...'), {
      target: { value: 'logs' },
    });

    await waitFor(() => {
      expect(mockSanitizeSearchText).toHaveBeenCalledWith('logs');
      expect(mockGetPrioritizedIndices).toHaveBeenCalledWith('logs', undefined, '');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onSelectionChange).toHaveBeenCalledWith([]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  test('supports the two-step confirmation flow and starts insights with the chosen agent ID', async () => {
    const onConfirm = jest.fn();
    const onStartInsights = jest.fn().mockResolvedValue(undefined);

    render(
      <EnhancedSelectionModal
        {...defaultProps}
        onConfirm={onConfirm}
        onStartInsights={onStartInsights}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirm Selected Indices \(1\)/i }));

    expect(onConfirm).toHaveBeenCalledWith();
    expect(screen.getByText('Confirm Auto Insights Setup')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Selection' }));
    expect(screen.getByPlaceholderText('Search indices...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirm Selected Indices \(1\)/i }));
    fireEvent.change(screen.getByPlaceholderText('Enter agent ID'), {
      target: { value: 'agent-42' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start Auto Insights' }));

    await waitFor(() => {
      expect(onStartInsights).toHaveBeenCalledWith(['logs-1'], 'agent-42');
    });
  });

  test('supports immediate execution with a custom agent ID', async () => {
    const onConfirm = jest.fn();

    render(
      <EnhancedSelectionModal
        {...defaultProps}
        immediateExecute={true}
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter agent ID'), {
      target: { value: 'instant-agent' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Selected Indices \(1\)/i }));

    expect(onConfirm).toHaveBeenCalledWith('instant-agent');
    expect(screen.queryByText('Confirm Auto Insights Setup')).not.toBeInTheDocument();
  });
});
