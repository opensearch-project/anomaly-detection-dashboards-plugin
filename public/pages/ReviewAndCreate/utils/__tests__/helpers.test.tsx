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

import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../../DefineDetector/utils/constants';
import { DEFAULT_SHINGLE_SIZE } from '../../../../utils/constants';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { formikToDetector, formikToFilterQuery } from '../../utils/helpers';
import {
  FILTER_TYPES,
  OPERATORS_MAP,
  UNITS,
} from '../../../../models/interfaces';
import { DATA_TYPES } from '../../../../utils/constants';

describe('formikToDetector', () => {
  test('should convert formikValues to API call with filters', () => {
    const randomDetector = getRandomDetector();
    const ad = formikToDetector({
      ...INITIAL_DETECTOR_DEFINITION_VALUES,
      name: randomDetector.name,
      description: randomDetector.description,
      index: [{ label: randomDetector.indices[0] }],
      timeField: randomDetector.timeField,
      filters: [
        {
          filterType: FILTER_TYPES.SIMPLE,
          fieldInfo: [{ label: 'age', type: DATA_TYPES.NUMBER }],
          operator: OPERATORS_MAP.IS_NOT_NULL,
        },
      ],
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
      featureList: [],
      categoryFieldEnabled: false,
      categoryField: [],
      shingleSize: DEFAULT_SHINGLE_SIZE,
      realTime: false,
      historical: false,
      startTime: undefined,
      endTime: undefined,
    });
    expect(ad).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      indices: randomDetector.indices,
      featureAttributes: [],
      filterQuery: {
        bool: {
          filter: [
            {
              exists: {
                field: 'age',
              },
            },
          ],
        },
      },
      uiMetadata: {
        features: {},
        filters: [
          {
            filterType: FILTER_TYPES.SIMPLE,
            fieldInfo: [{ label: 'age', type: DATA_TYPES.NUMBER }],
            operator: OPERATORS_MAP.IS_NOT_NULL,
          },
        ],
      },
      timeField: randomDetector.timeField,
      detectionInterval: {
        period: {
          interval: randomDetector.detectionInterval.period.interval,
          unit: UNITS.MINUTES,
        },
      },
      windowDelay: {
        period: {
          interval: randomDetector.windowDelay.period.interval,
          unit: UNITS.MINUTES,
        },
      },
      shingleSize: DEFAULT_SHINGLE_SIZE,
      categoryField: undefined,
    });
  });
});

describe('formikToFilterQuery', () => {
  const numericFieldName = [{ label: 'age', type: 'number' }];
  const textField = [{ label: 'city', type: 'text' }];
  const keywordField = [{ label: 'city.keyword', type: 'keyword' }];

  test.each([
    [
      numericFieldName,
      OPERATORS_MAP.IS,
      20,
      { bool: { filter: [{ term: { age: 20 } }] } },
    ],
    [
      textField,
      OPERATORS_MAP.IS,
      'Seattle',
      { bool: { filter: [{ match_phrase: { city: 'Seattle' } }] } },
    ],
    [
      numericFieldName,
      OPERATORS_MAP.IS_NOT,
      20,
      { bool: { filter: [{ bool: { must_not: { term: { age: 20 } } } }] } },
    ],
    [
      textField,
      OPERATORS_MAP.IS_NOT,
      'Seattle',
      {
        bool: {
          filter: [
            { bool: { must_not: { match_phrase: { city: 'Seattle' } } } },
          ],
        },
      },
    ],
    [
      numericFieldName,
      OPERATORS_MAP.IS_NULL,
      undefined,
      {
        bool: {
          filter: [{ bool: { must_not: { exists: { field: 'age' } } } }],
        },
      },
    ],
    [
      numericFieldName,
      OPERATORS_MAP.IS_NOT_NULL,
      undefined,
      { bool: { filter: [{ exists: { field: 'age' } }] } },
    ],
    [
      numericFieldName,
      OPERATORS_MAP.IS_GREATER,
      20,
      { bool: { filter: [{ range: { age: { gt: 20 } } }] } },
    ],
    [
      numericFieldName,
      OPERATORS_MAP.IS_GREATER_EQUAL,
      20,
      { bool: { filter: [{ range: { age: { gte: 20 } } }] } },
    ],
    [
      numericFieldName,
      OPERATORS_MAP.IS_LESS,
      20,
      { bool: { filter: [{ range: { age: { lt: 20 } } }] } },
    ],
    [
      numericFieldName,
      OPERATORS_MAP.IS_LESS_EQUAL,
      20,
      { bool: { filter: [{ range: { age: { lte: 20 } } }] } },
    ],
    [
      textField,
      OPERATORS_MAP.STARTS_WITH,
      'Se',
      { bool: { filter: [{ prefix: { city: 'Se' } }] } },
    ],
    [
      textField,
      OPERATORS_MAP.ENDS_WITH,
      'Se',
      { bool: { filter: [{ wildcard: { city: '*Se' } }] } },
    ],
    [
      textField,
      OPERATORS_MAP.CONTAINS,
      'Se',
      {
        bool: {
          filter: [{ query_string: { query: `*Se*`, default_field: 'city' } }],
        },
      },
    ],
    [
      keywordField,
      OPERATORS_MAP.CONTAINS,
      'Se',
      { bool: { filter: [{ wildcard: { 'city.keyword': '*Se*' } }] } },
    ],
    [
      textField,
      OPERATORS_MAP.NOT_CONTAINS,
      'Se',
      {
        bool: {
          filter: [
            {
              bool: {
                must_not: {
                  query_string: { query: `*Se*`, default_field: 'city' },
                },
              },
            },
          ],
        },
      },
    ],
  ])(
    '.formikToFilterQuery (%j,  %S)',
    //@ts-ignore
    (fieldInfo, operator, fieldValue, expected) => {
      expect(
        formikToFilterQuery({
          filters: [
            {
              filterType: FILTER_TYPES.SIMPLE,
              fieldInfo,
              operator,
              fieldValue,
            },
          ],
        })
      ).toEqual(expected);
    }
  );
});
