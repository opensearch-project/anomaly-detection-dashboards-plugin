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
import { render, screen } from '@testing-library/react';
import {
  renderTime,
  renderState,
  getDataGridColumns,
  renderCellValueFactory,
  DEFAULT_EMPTY_DATA,
} from '../tableUtils';
import { FORECASTER_STATE, FORECASTER_STATE_TO_DISPLAY } from '../../../../../server/utils/constants';

// Mock moment
jest.mock('moment', () => {
  const originalMoment = jest.requireActual('moment');
  return {
    __esModule: true,
    default: (time?: any) => {
      if (time === 1640995200000) { // Jan 1, 2022 00:00:00 GMT
        return {
          isValid: () => true,
          format: (format: string) => '01/01/2022 12:00 AM',
        };
      }
      if (time === 'invalid') {
        return {
          isValid: () => false,
          format: () => 'Invalid date',
        };
      }
      return originalMoment(time);
    },
  };
});

// Mock EUI components
jest.mock('@elastic/eui', () => ({
  EuiLink: ({ href, children }: any) => <a href={href}>{children}</a>,
  EuiHealth: ({ color, children }: any) => <div data-color={color}>{children}</div>,
  EuiToolTip: ({ content, children }: any) => <div title={content}>{children}</div>,
}));

// Mock CurStateCell
jest.mock('../CurStateCell', () => ({
  CurStateCell: ({ forecaster, onForceCollapse }: any) => (
    <div data-testid="cur-state-cell">
      CurStateCell for {forecaster.name}
      <button onClick={onForceCollapse}>Force Collapse</button>
    </div>
  ),
}));

// Mock constants
jest.mock('../../../../utils/constants', () => ({
  FORECASTING_FEATURE_NAME: 'forecasting',
}));

describe('tableUtils', () => {
  describe('renderTime', () => {
    test('should render formatted time for valid timestamp', () => {
      const result = renderTime(1640995200000); // Jan 1, 2022 00:00:00 GMT
      expect(result).toBe('01/01/2022 12:00 AM');
    });

    test('should render default empty data for invalid timestamp', () => {
      const result = renderTime('invalid' as any);
      expect(result).toBe(DEFAULT_EMPTY_DATA);
    });

    test('should render default empty data for undefined', () => {
      const result = renderTime(undefined as any);
      expect(result).toBe(DEFAULT_EMPTY_DATA);
    });

    test('should render default empty data for null', () => {
      const result = renderTime(null as any);
      expect(result).toBe(DEFAULT_EMPTY_DATA);
    });
  });

  describe('renderState', () => {
    test('should render state with correct color and display text', () => {
      const { container } = render(renderState(FORECASTER_STATE.RUNNING));
      
      const healthElement = container.querySelector('[data-color="primary"]');
      expect(healthElement).toBeInTheDocument();
      expect(healthElement).toHaveTextContent(FORECASTER_STATE_TO_DISPLAY[FORECASTER_STATE.RUNNING]);
    });

    test('should render inactive state correctly', () => {
      const { container } = render(renderState(FORECASTER_STATE.INACTIVE_NOT_STARTED));
      
      const healthElement = container.querySelector('[data-color="subdued"]');
      expect(healthElement).toBeInTheDocument();
      expect(healthElement).toHaveTextContent(FORECASTER_STATE_TO_DISPLAY[FORECASTER_STATE.INACTIVE_NOT_STARTED]);
    });

    test('should render error state correctly', () => {
      const { container } = render(renderState(FORECASTER_STATE.INIT_ERROR));
      
      const healthElement = container.querySelector('[data-color="danger"]');
      expect(healthElement).toBeInTheDocument();
      expect(healthElement).toHaveTextContent(FORECASTER_STATE_TO_DISPLAY[FORECASTER_STATE.INIT_ERROR]);
    });
  });

  describe('getDataGridColumns', () => {
    test('should return correct number of columns', () => {
      const columns = getDataGridColumns();
      expect(columns).toHaveLength(4);
    });

    test('should return columns with correct properties', () => {
      const columns = getDataGridColumns();
      
      // Check name column
      expect(columns[0]).toEqual(
        expect.objectContaining({
          id: 'name',
          displayAsText: 'Name',
          isSortable: true,
          schema: 'string',
        })
      );

      // Check indices column
      expect(columns[1]).toEqual(
        expect.objectContaining({
          id: 'indices',
          displayAsText: 'Indices',
          isSortable: true,
          schema: 'string',
        })
      );

      // Check curState column
      expect(columns[2]).toEqual(
        expect.objectContaining({
          id: 'curState',
          displayAsText: 'Status',
          isSortable: true,
          schema: 'string',
          isExpandable: true,
        })
      );

      // Check lastUpdateTime column
      expect(columns[3]).toEqual(
        expect.objectContaining({
          id: 'lastUpdateTime',
          displayAsText: 'Last updated',
          isSortable: true,
          schema: 'datetime',
          defaultSortDirection: 'desc',
        })
      );
    });

    test('should have tooltip content in display property', () => {
      const columns = getDataGridColumns();
      
      columns.forEach(column => {
        expect(column.display).toBeDefined();
        const { container } = render(column.display as React.ReactElement);
        expect(container.querySelector('[title]')).toBeInTheDocument();
      });
    });
  });

  describe('renderCellValueFactory', () => {
    const mockForecasters = [
      {
        id: 'forecaster-1',
        name: 'Test Forecaster 1',
        indices: ['index-1', 'index-2'],
        curState: FORECASTER_STATE.RUNNING,
        lastUpdateTime: 1640995200000,
      },
      {
        id: 'forecaster-2',
        name: 'Test Forecaster 2',
        indices: [],
        curState: FORECASTER_STATE.INACTIVE_NOT_STARTED,
        lastUpdateTime: 1640995200000,
      },
    ];

    test('should render name column with correct link', () => {
      const RenderCellValue = renderCellValueFactory(mockForecasters);
      const { container } = render(
        <RenderCellValue
          rowIndex={0}
          columnId="name"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent('Test Forecaster 1');
      expect(link?.href).toContain('forecasting#/forecasters/forecaster-1/details');
      expect(link?.href).toContain('_t=');
    });

    test('should render name column with dataSourceId in URL', () => {
      const RenderCellValue = renderCellValueFactory(mockForecasters, 'test-datasource');
      const { container } = render(
        <RenderCellValue
          rowIndex={0}
          columnId="name"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      const link = container.querySelector('a');
      expect(link?.href).toContain('dataSourceId=test-datasource');
    });

    test('should render indices column with multiple indices', () => {
      const RenderCellValue = renderCellValueFactory(mockForecasters);
      const { container } = render(
        <RenderCellValue
          rowIndex={0}
          columnId="indices"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      expect(container).toHaveTextContent('index-1, index-2');
    });

    test('should render indices column with empty data for no indices', () => {
      const RenderCellValue = renderCellValueFactory(mockForecasters);
      const { container } = render(
        <RenderCellValue
          rowIndex={1}
          columnId="indices"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      expect(container).toHaveTextContent(DEFAULT_EMPTY_DATA);
    });

    test('should render curState column with simple state when not expanded', () => {
      const RenderCellValue = renderCellValueFactory(mockForecasters);
      const { container } = render(
        <RenderCellValue
          rowIndex={0}
          columnId="curState"
          setCellProps={() => {}}
          isExpandable={true}
          isExpanded={false}
          isDetails={false}
        />
      );

      expect(container.querySelector('[data-color="primary"]')).toBeInTheDocument();
      expect(container).toHaveTextContent(FORECASTER_STATE_TO_DISPLAY[FORECASTER_STATE.RUNNING]);
    });

    test('should render CurStateCell when expanded and not forcibly collapsed', () => {
      const forecasters = [
        {
          id: 'test-1',
          name: 'Test Forecaster 1',
          curState: FORECASTER_STATE.INITIALIZING_FORECAST,
          lastUpdateTime: 1234567890,
        }
      ];

      const CellValue = renderCellValueFactory(forecasters);
      const { container } = render(
        <CellValue 
          rowIndex={0} 
          columnId="curState"
          isExpanded={true}
          isExpandable={true}
          setCellProps={() => {}}
        />
      );

      expect(container).toHaveTextContent('CurStateCell for Test Forecaster 1');
      expect(container).toHaveTextContent('Force Collapse');
    });

    test('should render normal state when not expanded', () => {
      const forecasters = [
        {
          id: 'test-1',
          name: 'Test Forecaster 1',
          curState: FORECASTER_STATE.INITIALIZING_FORECAST,
          lastUpdateTime: 1234567890,
        }
      ];

      const CellValue = renderCellValueFactory(forecasters);
      const { container } = render(
        <CellValue 
          rowIndex={0} 
          columnId="curState"
          isExpanded={false}
          setCellProps={() => {}}
        />
      );

      expect(container.querySelector('[data-color]')).toBeInTheDocument();
      expect(container).not.toHaveTextContent('CurStateCell');
    });

    test('should render normal state when forcibly collapsed', () => {
      const forecasters = [
        {
          id: 'test-1',
          name: 'Test Forecaster 1',
          curState: FORECASTER_STATE.INITIALIZING_FORECAST,
          lastUpdateTime: 1234567890,
        }
      ];

      const forceCollapsedRows = new Set([0]);
      const CellValue = renderCellValueFactory(forecasters, undefined, forceCollapsedRows);
      const { container } = render(
        <CellValue 
          rowIndex={0} 
          columnId="curState"
          isExpanded={true}
          setCellProps={() => {}}
        />
      );

      expect(container.querySelector('[data-color]')).toBeInTheDocument();
      expect(container).not.toHaveTextContent('CurStateCell');
    });

    test('should render normal state for INACTIVE_NOT_STARTED even when expanded', () => {
      const forecasters = [
        {
          id: 'test-1',
          name: 'Test Forecaster 1',
          curState: FORECASTER_STATE.INACTIVE_NOT_STARTED,
          lastUpdateTime: 1234567890,
        }
      ];

      const CellValue = renderCellValueFactory(forecasters);
      const { container } = render(
        <CellValue 
          rowIndex={0} 
          columnId="curState"
          isExpanded={true}
          setCellProps={() => {}}
        />
      );

      expect(container.querySelector('[data-color]')).toBeInTheDocument();
      expect(container).not.toHaveTextContent('CurStateCell');
    });

    test('should render lastUpdateTime column with formatted time', () => {
      const RenderCellValue = renderCellValueFactory(mockForecasters);
      const { container } = render(
        <RenderCellValue
          rowIndex={0}
          columnId="lastUpdateTime"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      expect(container).toHaveTextContent('01/01/2022 12:00 AM');
    });

    test('should render default value for unknown column', () => {
      const mockForecastersWithCustomField = [
        { ...mockForecasters[0], customField: 'custom value' }
      ];
      
      const RenderCellValue = renderCellValueFactory(mockForecastersWithCustomField);
      const { container } = render(
        <RenderCellValue
          rowIndex={0}
          columnId="customField"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      expect(container).toHaveTextContent('custom value');
    });

    test('should return null for invalid row index', () => {
      const RenderCellValue = renderCellValueFactory(mockForecasters);
      const result = render(
        <RenderCellValue
          rowIndex={999}
          columnId="name"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      expect(result.container.firstChild).toBeNull();
    });

    test('should return null for missing forecaster', () => {
      const RenderCellValue = renderCellValueFactory([]);
      const result = render(
        <RenderCellValue
          rowIndex={0}
          columnId="name"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      expect(result.container.firstChild).toBeNull();
    });

    test('should handle error gracefully and return default empty data', () => {
      // Create a forecaster that will cause an error during property access
      const faultyForecasters = [
        {
          id: 'test',
          name: 'test',
          // Create a getter that throws an error
          get curState() {
            throw new Error('Property access error');
          }
        }
      ];
      
      const RenderCellValue = renderCellValueFactory(faultyForecasters);
      
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { container } = render(
        <RenderCellValue
          rowIndex={0}
          columnId="curState"
          setCellProps={() => {}}
          isExpandable={false}
          isExpanded={false}
          isDetails={false}
        />
      );

      expect(container).toHaveTextContent(DEFAULT_EMPTY_DATA);
      expect(consoleSpy).toHaveBeenCalledWith('Error rendering cell value:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
