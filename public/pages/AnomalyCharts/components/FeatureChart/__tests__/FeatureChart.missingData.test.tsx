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
import { render } from '@testing-library/react';
import { FeatureChart } from '../FeatureChart';
import {
  DateRange,
  EntityData,
  FeatureAggregationData,
  FeatureAttributes,
  FEATURE_TYPE,
  Schedule,
  UNITS,
} from '../../../../../models/interfaces';

const mockLineAnnotationSpy = jest.fn();

jest.mock('@elastic/charts', () => {
  const React = require('react');
  return {
    Chart: ({ children }: any) => <div data-test-subj="chart">{children}</div>,
    Axis: () => null,
    LineSeries: () => null,
    RectAnnotation: () => null,
    Settings: () => null,
    Position: { Right: 'Right' },
    ScaleType: { Time: 'time', Linear: 'linear' },
    niceTimeFormatter: () => () => '',
    timeFormatter: () => () => '',
    AnnotationDomainType: { XDomain: 'xDomain' },
    LineAnnotation: (props: any) => {
      mockLineAnnotationSpy(props);
      if (!props.dataValues || props.dataValues.length === 0) {
        return null;
      }
      return (
        <div
          data-test-subj="line-annotation"
          data-values-length={props.dataValues?.length ?? 0}
        />
      );
    },
  };
});

jest.mock('../../../../../components/ContentPanel/ContentPanel', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="content-panel">{children}</div>
  ),
}));

jest.mock('../../../../../hooks/useDelayedLoader', () => ({
  useDelayedLoader: () => false,
}));

jest.mock('../../../../../utils/opensearchDashboardsUtils', () => ({
  darkModeEnabled: () => false,
}));

jest.mock('../../../../DetectorConfig/components/CodeModal/CodeModal', () => ({
  CodeModal: () => null,
}));

const MINUTE_IN_MILLIS = 60 * 1000;
const baseTime = 1587431440000;

const defaultFeature: FeatureAttributes = {
  featureId: 'feature-1',
  featureName: 'feature',
  featureEnabled: true,
  importance: 1,
  aggregationQuery: {},
};

const defaultDateRange: DateRange = {
  startDate: baseTime,
  endDate: baseTime + 10 * MINUTE_IN_MILLIS,
};

const defaultEntityData: EntityData[][] = [[]];

const defaultWindowDelay: Schedule = {
  interval: 0,
  unit: UNITS.MINUTES,
};

const createFeatureData = (points: number): FeatureAggregationData[] => {
  return Array.from({ length: points })
    .map((_, index) => {
      const startTime = baseTime + index * MINUTE_IN_MILLIS;
      const endTime = startTime + MINUTE_IN_MILLIS;
      return {
        data: 1,
        startTime,
        endTime,
        plotTime: endTime,
      };
    })
    .reverse();
};

const renderFeatureChart = ({
  featureData,
  detectorInterval,
  detectorFrequency,
}: {
  featureData: FeatureAggregationData[];
  detectorInterval: Schedule;
  detectorFrequency: Schedule;
}) => {
  return render(
    <FeatureChart
      feature={defaultFeature}
      featureData={[featureData]}
      rawFeatureData={[featureData]}
      annotations={[]}
      isLoading={false}
      dateRange={defaultDateRange}
      featureType={FEATURE_TYPE.SIMPLE}
      field="field"
      aggregationMethod="avg"
      featureDataSeriesName="feature data"
      detectorInterval={detectorInterval}
      detectorFrequency={detectorFrequency}
      showFeatureMissingDataPointAnnotation={true}
      detectorEnabledTime={defaultDateRange.startDate}
      entityData={defaultEntityData}
      windowDelay={defaultWindowDelay}
    />
  );
};

describe('FeatureChart missing data annotations', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLineAnnotationSpy.mockClear();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('LineAnnotation not rendered with full data when detector frequency is greater than interval', () => {
    const featureData = createFeatureData(10);

    const detectorInterval: Schedule = {
      interval: 1,
      unit: UNITS.MINUTES,
    };
    const detectorFrequency: Schedule = {
      interval: 5,
      unit: UNITS.MINUTES,
    };

    const { queryByTestId } = renderFeatureChart({
      featureData,
      detectorInterval,
      detectorFrequency,
    });

    expect(mockLineAnnotationSpy).toHaveBeenCalled();
    const callArgs = mockLineAnnotationSpy.mock.lastCall[0];
    expect(callArgs.dataValues).toHaveLength(0);
    expect(queryByTestId('line-annotation')).toBeNull();
  });

  test('LineAnnotation not rendered when latest five minutes are missing but detector frequency is five minutes', () => {
    const featureData = createFeatureData(5);

    const detectorInterval: Schedule = {
      interval: 1,
      unit: UNITS.MINUTES,
    };
    const detectorFrequency: Schedule = {
      interval: 5,
      unit: UNITS.MINUTES,
    };

    const { queryByTestId } = renderFeatureChart({
      featureData,
      detectorInterval,
      detectorFrequency,
    });

    expect(mockLineAnnotationSpy).toHaveBeenCalled();
    const callArgs = mockLineAnnotationSpy.mock.lastCall[0];
    expect(callArgs.dataValues).toHaveLength(0);
    expect(queryByTestId('line-annotation')).toBeNull();
  });

  test('LineAnnotation rendered when latest data points are missing', () => {
    const featureData = createFeatureData(5);

    const detectorInterval: Schedule = {
      interval: 1,
      unit: UNITS.MINUTES,
    };

    const detectorFrequency: Schedule = {
      interval: 1,
      unit: UNITS.MINUTES,
    };

    const { getByTestId } = renderFeatureChart({
      featureData,
      detectorInterval,
      detectorFrequency,
    });

    expect(mockLineAnnotationSpy).toHaveBeenCalled();
    const callArgs = mockLineAnnotationSpy.mock.lastCall[0];
    expect(callArgs.dataValues.length).toBeGreaterThan(0);

    const annotationNode = getByTestId('line-annotation');
    expect(annotationNode.getAttribute('data-values-length')).toEqual(
      callArgs.dataValues.length.toString()
    );
  });
});
