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

import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../utils/constants';
import { DATA_TYPES } from '../../../../utils/constants';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import {
  detectorDefinitionToFormik,
  filtersToFormik,
} from '../../utils/helpers';
import {
  Detector,
  OPERATORS_MAP,
  FILTER_TYPES,
} from '../../../../models/interfaces';

describe('detectorDefinitionToFormik', () => {
  test('should return initialValues if detector is null', () => {
    const randomDetector = {} as Detector;
    const adFormikValues = detectorDefinitionToFormik(randomDetector);
    expect(adFormikValues).toEqual(INITIAL_DETECTOR_DEFINITION_VALUES);
  });
  test('should return correct values if detector is not null', () => {
    const randomDetector = getRandomDetector();
    const adFormikValues = detectorDefinitionToFormik(randomDetector);
    expect(adFormikValues).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      filters: randomDetector.uiMetadata.filters,
      filterQuery: JSON.stringify(randomDetector.filterQuery || {}, null, 4),
      index: [{ label: randomDetector.indices[0] }], // Currently we support only one index
      timeField: randomDetector.timeField,
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
      resultIndex: randomDetector.resultIndex,
      resultIndexMinAge: randomDetector.resultIndexMinAge,
      resultIndexMinSize: randomDetector.resultIndexMinSize,
      resultIndexTtl: randomDetector.resultIndexTtl,
      flattenCustomResultIndex: randomDetector.flattenCustomResultIndex,
    });
  });
  test('should return if detector does not have metadata', () => {
    const randomDetector = getRandomDetector();
    //@ts-ignore
    randomDetector.uiMetadata = undefined;
    const adFormikValues = detectorDefinitionToFormik(randomDetector);
    expect(adFormikValues).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      filterQuery: JSON.stringify(randomDetector.filterQuery || {}, null, 4),
      filters: filtersToFormik(randomDetector),
      index: [{ label: randomDetector.indices[0] }], // Currently we support only one index
      timeField: randomDetector.timeField,
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
      resultIndex: randomDetector.resultIndex,
      resultIndexMinAge: randomDetector.resultIndexMinAge,
      resultIndexMinSize: randomDetector.resultIndexMinSize,
      resultIndexTtl: randomDetector.resultIndexTtl,
      flattenCustomResultIndex: randomDetector.flattenCustomResultIndex,
    });
  });
  test("upgrade old detector's filters to include filter type", () => {
    const randomDetector = getRandomDetector();
    randomDetector.uiMetadata = {
      features: {},
      filters: [
        {
          fieldInfo: [
            {
              label: 'service',
              type: DATA_TYPES.KEYWORD,
            },
          ],
          fieldValue: 'app_3',
          operator: OPERATORS_MAP.IS,
        },
        {
          fieldInfo: [
            {
              label: 'host',
              type: DATA_TYPES.KEYWORD,
            },
          ],
          fieldValue: 'server_2',
          operator: OPERATORS_MAP.IS,
        },
      ],
      filterType: FILTER_TYPES.SIMPLE,
    };
    const adFormikValues = filtersToFormik(randomDetector);
    expect(adFormikValues).toEqual([
      {
        fieldInfo: [
          {
            label: 'service',
            type: DATA_TYPES.KEYWORD,
          },
        ],
        fieldValue: 'app_3',
        operator: OPERATORS_MAP.IS,
        filterType: FILTER_TYPES.SIMPLE,
      },
      {
        fieldInfo: [
          {
            label: 'host',
            type: DATA_TYPES.KEYWORD,
          },
        ],
        fieldValue: 'server_2',
        operator: OPERATORS_MAP.IS,
        filterType: FILTER_TYPES.SIMPLE,
      },
    ]);
  });
});
