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
import { DetectorControls } from '../DetectorControls';
import { UNITS } from '../../../../../models/interfaces';

describe('<DetectorControls /> spec', () => {
  const detector = {
    primaryTerm: 1,
    seqNo: 1,
    id: '',
    name: '4QY4YHEB5W9C7vlb3Mou',
    description: 'test detector',
    timeField: 'timestamp',
    indices: ['test-index'],
    filterQuery: { match_all: { boost: 1.0 } },
    featureAttributes: [],
    windowDelay: { period: { interval: 0, unit: UNITS.MINUTES } },
    detectionInterval: { period: { interval: 0, unit: UNITS.MINUTES } },
    uiMetadata: {},
    lastUpdateTime: 1586714882000,
    enabled: false,
    enabledTime: 1586722082000,
  };
  const features = [
    {
      featureId: 'ZNU5YHEBTQyq-K19pyEP',
      featureName: 'feature1',
      featureEnabled: true,
      importance: 1,
      aggregationQuery: {
        feature1: { sum: { field: 'value' } },
      },
    },
  ];
  const onEditDetector = jest.fn();
  const onEditFeatures = jest.fn();
  const onDelete = jest.fn();
  const onStartDetector = jest.fn();
  const onStopDetector = jest.fn();
  describe('Detector Controls', () => {
    test('renders detector controls with disabled detecor and empty features', () => {
      const { container } = render(
        <DetectorControls
          onEditDetector={onEditDetector}
          onEditFeatures={onEditFeatures}
          onDelete={onDelete}
          onStartDetector={onStartDetector}
          onStopDetector={onStopDetector}
          // @ts-ignore
          detector={detector}
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders detector controls with enabled detecor and empty features', () => {
      const enabledDetector = { ...detector, enabled: true };
      const { container } = render(
        <DetectorControls
          onEditDetector={onEditDetector}
          onEditFeatures={onEditFeatures}
          onDelete={onDelete}
          onStartDetector={onStartDetector}
          onStopDetector={onStopDetector}
          // @ts-ignore
          detector={enabledDetector}
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders detector controls with disabled detecor and features', () => {
      const disabledDetectorWithFeatures = {
        ...detector,
        featureAttributes: features,
      };
      const { container } = render(
        <DetectorControls
          onEditDetector={onEditDetector}
          onEditFeatures={onEditFeatures}
          onDelete={onDelete}
          onStartDetector={onStartDetector}
          onStopDetector={onStopDetector}
          // @ts-ignore
          detector={disabledDetectorWithFeatures}
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders detector controls with enabled detecor and features', () => {
      const disabledDetectorWithFeatures = {
        ...detector,
        enabled: true,
        featureAttributes: features,
      };
      const { container } = render(
        <DetectorControls
          onEditDetector={onEditDetector}
          onEditFeatures={onEditFeatures}
          onDelete={onDelete}
          onStartDetector={onStartDetector}
          onStopDetector={onStopDetector}
          // @ts-ignore
          detector={disabledDetectorWithFeatures}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
