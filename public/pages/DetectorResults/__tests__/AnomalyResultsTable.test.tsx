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

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnomalyResultsTable } from '../containers/AnomalyResultsTable';
import { getSavedObjectsClient, getNotifications, getDataSourceEnabled } from '../../../services';
import { CoreServicesContext } from '../../../components/CoreServices/CoreServices';

const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

jest.mock('../../../services', () => ({
  getSavedObjectsClient: jest.fn(),
  getNotifications: jest.fn(),
  getDataSourceEnabled: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: undefined,
  }),
}));

jest.mock('../../../pages/utils/helpers', () => ({
  getDataSourceFromURL: jest.fn().mockReturnValue({
    dataSourceId: undefined,
  }),
}));

const mockCoreServices = {
  uiSettings: {
    get: jest.fn().mockReturnValue(false),
  },
  workspaces: {
    currentWorkspace$: {
      pipe: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue(null),
      }),
    },
    client$: {
      getValue: jest.fn().mockReturnValue({
        getCurrentWorkspaceId: jest.fn().mockReturnValue(null),
      }),
    },
  },
};

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <CoreServicesContext.Provider value={mockCoreServices as any}>
      {component}
    </CoreServicesContext.Provider>
  );
};

describe('AnomalyResultsTable', () => {
  const mockAnomalies = [
    {
      startTime: 1617235200000,
      endTime: 1617238800000,
      anomalyGrade: 0.8,
      confidence: 0.9,
      entity: [
        { name: 'DestCityName', value: 'Zurich' },
        { name: 'OriginCityName', value: 'Zurich' }
      ],
    },
  ];

  const defaultProps = {
    anomalies: mockAnomalies,
    detectorIndices: ['test-index', 'followCluster:test-index'],
    detectorTimeField: 'timestamp',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({ savedObjects: [] }),
      create: jest.fn().mockResolvedValue({ id: 'test-id' }),
    });
    
    (getNotifications as jest.Mock).mockReturnValue({
      toasts: {
        addSuccess: jest.fn(),
        addDanger: jest.fn(),
      },
    });

    (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled: false });
  });

  it('shows no anomalies message when there are no anomalies', () => {
    renderWithContext(<AnomalyResultsTable {...defaultProps} anomalies={[]} />);
    expect(screen.getByText('There are no anomalies currently.')).toBeInTheDocument();
  });

  it('renders Actions column with discover icon', () => {
    renderWithContext(<AnomalyResultsTable {...defaultProps} />);
    
    const actionsColumn = screen.getByText('Actions');
    expect(actionsColumn).toBeInTheDocument();
    
    const discoverButton = screen.getByTestId('discoverIcon');
    expect(discoverButton).toBeInTheDocument();
  });

  it('handles high cardinality detector with entity values', async () => {
    const selectedHeatmapCell = {
      entity: mockAnomalies[0].entity,
      startTime: mockAnomalies[0].startTime,
      endTime: mockAnomalies[0].endTime,
      dateRange: {
        startDate: mockAnomalies[0].startTime,
        endDate: mockAnomalies[0].endTime,
      },
      entityList: mockAnomalies[0].entity,
      severity: 0.8,
    };

    renderWithContext(
      <AnomalyResultsTable 
        {...defaultProps} 
        isHCDetector={true}
        selectedHeatmapCell={selectedHeatmapCell}
      />
    );
    
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const cells = screen.getAllByRole('cell');
      const entityCell = cells.find(cell => 
        cell.textContent?.includes('DestCityName: Zurich') && 
        cell.textContent?.includes('OriginCityName: Zurich')
      );
      
      expect(entityCell).toBeInTheDocument();
      expect(entityCell?.textContent).toContain('DestCityName: Zurich');
      expect(entityCell?.textContent).toContain('OriginCityName: Zurich');
    });
  });

  it('uses existing index pattern if found', async () => {
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({ 
        savedObjects: [{ id: 'existing-id' }] 
      }),
      create: jest.fn(),
    });

    const { container } = renderWithContext(<AnomalyResultsTable {...defaultProps} />);
    
    const discoverButton = container.querySelector('[data-test-subj="discoverIcon"]');
    if (discoverButton) {
      fireEvent.click(discoverButton);
      
      const savedObjectsClient = getSavedObjectsClient();
      expect(savedObjectsClient.create).not.toHaveBeenCalled();
    }
  });

  it('creates new index pattern when none exists', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 'new-index-pattern-id' });
    (getSavedObjectsClient as jest.Mock).mockReturnValue({
      find: jest.fn().mockResolvedValue({ savedObjects: [] }),
      create: mockCreate,
    });

    const { container } = renderWithContext(<AnomalyResultsTable {...defaultProps} />);
    
    const discoverButton = container.querySelector('[data-test-subj="discoverIcon"]');
    if (discoverButton) {
      fireEvent.click(discoverButton);
      
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith('index-pattern', {
          title: 'test-index,followCluster:test-index',
          timeFieldName: 'timestamp',
        });
      });

      const notifications = getNotifications();
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Created new index pattern: test-index,followCluster:test-index')
      );
    }
  });

  describe('mds feature flag', () => {
    it('shows Actions column when mds is disabled', () => {
      (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled: false });
      
      renderWithContext(<AnomalyResultsTable {...defaultProps} />);
      
      const actionsColumn = screen.getByText('Actions');
      expect(actionsColumn).toBeInTheDocument();
      
      const discoverButton = screen.getByTestId('discoverIcon');
      expect(discoverButton).toBeInTheDocument();
    });

    it('shows Actions column when mds is enabled', () => {
      (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled: true });
      
      renderWithContext(<AnomalyResultsTable {...defaultProps} />);
      
      const actionsColumn = screen.queryByText('Actions');
      expect(actionsColumn).toBeInTheDocument();
      
      const discoverButton = screen.queryByTestId('discoverIcon');
      expect(discoverButton).toBeInTheDocument();
    });
  });

  describe('HC detector with entity values containing special characters', () => {
    const mockAnomaliesWithSpaces = [
      {
        startTime: 1617235200000,
        endTime: 1617238800000,
        anomalyGrade: 0.8,
        confidence: 0.9,
        entity: [
          { name: 'DestCityName', value: 'Des Moines' },
          { name: 'OriginCityName', value: 'Los Angeles' },
          { name: 'lastName', value: "O'Brien" },
          { name: 'host', value: 'cpu%user' },
        ],
      },
    ];

    const propsWithSpaces = {
      anomalies: mockAnomaliesWithSpaces,
      detectorIndices: ['test-index'],
      detectorTimeField: 'timestamp',
      isHCDetector: true,
    };

    it('handles entity values with spaces in HC detector', async () => {
      const selectedHeatmapCell = {
        entity: mockAnomaliesWithSpaces[0].entity,
        startTime: mockAnomaliesWithSpaces[0].startTime,
        endTime: mockAnomaliesWithSpaces[0].endTime,
        dateRange: {
          startDate: mockAnomaliesWithSpaces[0].startTime,
          endDate: mockAnomaliesWithSpaces[0].endTime,
        },
        entityList: mockAnomaliesWithSpaces[0].entity,
        severity: 0.8,
      };

      renderWithContext(
        <AnomalyResultsTable 
          {...propsWithSpaces} 
          selectedHeatmapCell={selectedHeatmapCell}
        />
      );
      
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        
        const cells = screen.getAllByRole('cell');
        const entityCell = cells.find(cell => 
          cell.textContent?.includes('DestCityName: Des Moines') && 
          cell.textContent?.includes('OriginCityName: Los Angeles') &&
          cell.textContent?.includes("lastName: O'Brien") &&
          cell.textContent?.includes('host: cpu%user')
        );
        
        expect(entityCell).toBeInTheDocument();
        expect(entityCell?.textContent).toContain('DestCityName: Des Moines');
        expect(entityCell?.textContent).toContain('OriginCityName: Los Angeles');
        expect(entityCell?.textContent).toContain("lastName: O'Brien");
        expect(entityCell?.textContent).toContain('host: cpu%user');
      });
    });

    it('generates properly quoted rison URL when opening discover with entity values containing spaces', async () => {
      const selectedHeatmapCell = {
        entity: mockAnomaliesWithSpaces[0].entity,
        startTime: mockAnomaliesWithSpaces[0].startTime,
        endTime: mockAnomaliesWithSpaces[0].endTime,
        dateRange: {
          startDate: mockAnomaliesWithSpaces[0].startTime,
          endDate: mockAnomaliesWithSpaces[0].endTime,
        },
        entityList: mockAnomaliesWithSpaces[0].entity,
        severity: 0.8,
      };

      // Mock existing index pattern
      (getSavedObjectsClient as jest.Mock).mockReturnValue({
        find: jest.fn().mockResolvedValue({ 
          savedObjects: [{ id: 'existing-id' }] 
        }),
        create: jest.fn(),
      });

      const { container } = renderWithContext(
        <AnomalyResultsTable 
          {...propsWithSpaces} 
          selectedHeatmapCell={selectedHeatmapCell}
        />
      );
      
      const discoverButton = container.querySelector('[data-test-subj="discoverIcon"]');
      if (discoverButton) {
        fireEvent.click(discoverButton);
        
        await waitFor(() => {
          expect(mockWindowOpen).toHaveBeenCalled();
          
          const openedUrl = mockWindowOpen.mock.calls[0][0];
          
          // Verify that the URL contains properly encoded filters
          expect(openedUrl).toContain("DestCityName:'Des%20Moines'");
          expect(openedUrl).toContain("OriginCityName:'Los%20Angeles'");
          expect(openedUrl).toContain("lastName:'O!'Brien'");
          expect(openedUrl).toContain("host:cpu%25user");
          
          // Verify that the URL doesn't contain unquoted values with spaces
          expect(openedUrl).not.toContain("DestCityName:Des Moines");
          expect(openedUrl).not.toContain("OriginCityName:Los Angeles");
          expect(openedUrl).not.toContain("lastName:O'Brien");
          expect(openedUrl).not.toContain("host:cpu%user");
        });
      }
    });

    it('handles entity values with special characters that need quoting', async () => {
      const mockAnomaliesWithSpecialChars = [
        {
          startTime: 1617235200000,
          endTime: 1617238800000,
          anomalyGrade: 0.8,
          confidence: 0.9,
          entity: [
            { name: 'field(with)parens', value: 'value with ! and symbols' },
            { name: 'normal_field', value: 'normal_value' }
          ],
        },
      ];

      const selectedHeatmapCell = {
        entity: mockAnomaliesWithSpecialChars[0].entity,
        startTime: mockAnomaliesWithSpecialChars[0].startTime,
        endTime: mockAnomaliesWithSpecialChars[0].endTime,
        dateRange: {
          startDate: mockAnomaliesWithSpecialChars[0].startTime,
          endDate: mockAnomaliesWithSpecialChars[0].endTime,
        },
        entityList: mockAnomaliesWithSpecialChars[0].entity,
        severity: 0.8,
      };

      // Mock existing index pattern
      (getSavedObjectsClient as jest.Mock).mockReturnValue({
        find: jest.fn().mockResolvedValue({ 
          savedObjects: [{ id: 'existing-id' }] 
        }),
        create: jest.fn(),
      });

      const { container } = renderWithContext(
        <AnomalyResultsTable 
          {...propsWithSpaces} 
          anomalies={mockAnomaliesWithSpecialChars}
          selectedHeatmapCell={selectedHeatmapCell}
        />
      );
      
      const discoverButton = container.querySelector('[data-test-subj="discoverIcon"]');
      if (discoverButton) {
        fireEvent.click(discoverButton);
        
        await waitFor(() => {
          expect(mockWindowOpen).toHaveBeenCalled();
          
          const openedUrl = mockWindowOpen.mock.calls[0][0];
          
          // Verify that special characters are properly encoded
          expect(openedUrl).toContain("'field(with)parens':'value%20with%20!!%20and%20symbols'");
          
          // Normal field should not be quoted
          expect(openedUrl).toContain("normal_field:normal_value");
        });
      }
    });
  });
}); 