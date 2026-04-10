/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { OPERATORS_QUERY_MAP } from '../whereFilters';
import { OPERATORS_MAP } from '../../components/DataFilterList/utils/constant';
import { DATA_TYPES } from '../../../../utils/constants';
import { UIFilter } from '../../../../models/interfaces';

const makeFilter = (overrides: Partial<UIFilter> = {}): UIFilter =>
  ({
    fieldInfo: [{ label: 'myField', type: DATA_TYPES.KEYWORD }],
    fieldValue: 'testValue',
    ...overrides,
  } as UIFilter);

describe('OPERATORS_QUERY_MAP', () => {
  describe('IS operator', () => {
    test('generates term query for non-text', () => {
      const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS].query(makeFilter());
      expect(result).toEqual({ term: { myField: 'testValue' } });
    });

    test('generates match_phrase for text type', () => {
      const filter = makeFilter({
        fieldInfo: [{ label: 'myField', type: DATA_TYPES.TEXT }],
      });
      const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS].query(filter);
      expect(result).toEqual({ match_phrase: { myField: 'testValue' } });
    });
  });

  describe('IS_NOT operator', () => {
    test('generates must_not term for non-text', () => {
      const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS_NOT].query(
        makeFilter()
      );
      expect(result).toEqual({
        bool: { must_not: { term: { myField: 'testValue' } } },
      });
    });

    test('generates must_not match_phrase for text', () => {
      const filter = makeFilter({
        fieldInfo: [{ label: 'myField', type: DATA_TYPES.TEXT }],
      });
      const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS_NOT].query(filter);
      expect(result).toEqual({
        bool: { must_not: { match_phrase: { myField: 'testValue' } } },
      });
    });
  });

  test('IS_NULL generates must_not exists', () => {
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS_NULL].query(
      makeFilter()
    );
    expect(result).toEqual({
      bool: { must_not: { exists: { field: 'myField' } } },
    });
  });

  test('IS_NOT_NULL generates exists', () => {
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS_NOT_NULL].query(
      makeFilter()
    );
    expect(result).toEqual({ exists: { field: 'myField' } });
  });

  test('IS_GREATER generates range gt', () => {
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS_GREATER].query(
      makeFilter()
    );
    expect(result).toEqual({ range: { myField: { gt: 'testValue' } } });
  });

  test('IS_GREATER_EQUAL generates range gte', () => {
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS_GREATER_EQUAL].query(
      makeFilter()
    );
    expect(result).toEqual({ range: { myField: { gte: 'testValue' } } });
  });

  test('IS_LESS generates range lt', () => {
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS_LESS].query(
      makeFilter()
    );
    expect(result).toEqual({ range: { myField: { lt: 'testValue' } } });
  });

  test('IS_LESS_EQUAL generates range lte', () => {
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IS_LESS_EQUAL].query(
      makeFilter()
    );
    expect(result).toEqual({ range: { myField: { lte: 'testValue' } } });
  });

  test('IN_RANGE generates range gte/lte', () => {
    const filter = makeFilter({ fieldRangeStart: 10, fieldRangeEnd: 20 });
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.IN_RANGE].query(filter);
    expect(result).toEqual({ range: { myField: { gte: 10, lte: 20 } } });
  });

  test('NOT_IN_RANGE generates must_not range', () => {
    const filter = makeFilter({ fieldRangeStart: 10, fieldRangeEnd: 20 });
    const result =
      OPERATORS_QUERY_MAP[OPERATORS_MAP.NOT_IN_RANGE].query(filter);
    expect(result).toEqual({
      bool: { must_not: { range: { myField: { gte: 10, lte: 20 } } } },
    });
  });

  test('STARTS_WITH generates prefix', () => {
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.STARTS_WITH].query(
      makeFilter()
    );
    expect(result).toEqual({ prefix: { myField: 'testValue' } });
  });

  test('ENDS_WITH generates wildcard', () => {
    const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.ENDS_WITH].query(
      makeFilter()
    );
    expect(result).toEqual({ wildcard: { myField: '*testValue' } });
  });

  describe('CONTAINS operator', () => {
    test('generates wildcard for non-text', () => {
      const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.CONTAINS].query(
        makeFilter()
      );
      expect(result).toEqual({ wildcard: { myField: '*testValue*' } });
    });

    test('generates query_string for text', () => {
      const filter = makeFilter({
        fieldInfo: [{ label: 'myField', type: DATA_TYPES.TEXT }],
      });
      const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.CONTAINS].query(filter);
      expect(result).toEqual({
        query_string: { query: '*testValue*', default_field: 'myField' },
      });
    });
  });

  describe('NOT_CONTAINS operator', () => {
    test('generates must_not wildcard for non-text', () => {
      const result = OPERATORS_QUERY_MAP[OPERATORS_MAP.NOT_CONTAINS].query(
        makeFilter()
      );
      expect(result).toEqual({
        bool: { must_not: { wildcard: { myField: '*testValue*' } } },
      });
    });

    test('generates must_not query_string for text', () => {
      const filter = makeFilter({
        fieldInfo: [{ label: 'myField', type: DATA_TYPES.TEXT }],
      });
      const result =
        OPERATORS_QUERY_MAP[OPERATORS_MAP.NOT_CONTAINS].query(filter);
      expect(result).toEqual({
        bool: {
          must_not: {
            query_string: { query: '*testValue*', default_field: 'myField' },
          },
        },
      });
    });
  });
});
