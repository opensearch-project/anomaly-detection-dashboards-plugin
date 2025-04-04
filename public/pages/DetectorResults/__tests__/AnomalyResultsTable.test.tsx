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

const mockCoreServices = {
  uiSettings: {
    get: jest.fn().mockReturnValue(false),
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
    detectorIndex: ['test-index'],
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

  describe('mds feature flag', () => {
    it('shows Actions column when mds is disabled', () => {
      (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled: false });
      
      renderWithContext(<AnomalyResultsTable {...defaultProps} />);
      
      const actionsColumn = screen.getByText('Actions');
      expect(actionsColumn).toBeInTheDocument();
      
      const discoverButton = screen.getByTestId('discoverIcon');
      expect(discoverButton).toBeInTheDocument();
    });

    it('hides Actions column when mds is enabled', () => {
      (getDataSourceEnabled as jest.Mock).mockReturnValue({ enabled: true });
      
      renderWithContext(<AnomalyResultsTable {...defaultProps} />);
      
      const actionsColumn = screen.queryByText('Actions');
      expect(actionsColumn).not.toBeInTheDocument();
      
      const discoverButton = screen.queryByTestId('discoverIcon');
      expect(discoverButton).not.toBeInTheDocument();
    });
  });
}); 