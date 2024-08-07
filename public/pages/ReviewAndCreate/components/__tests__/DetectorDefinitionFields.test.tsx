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
import { render, within } from '@testing-library/react';
import { DetectorDefinitionFields } from '../DetectorDefinitionFields/DetectorDefinitionFields';
import {
  Detector,
  UNITS,
  FILTER_TYPES,
  OPERATORS_MAP,
} from '../../../../models/interfaces';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { Formik } from 'formik';
import { DATA_TYPES } from '../../../../utils/constants';
import { Provider } from 'react-redux';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import configureStore from '../../../../redux/configureStore';


const getTestDetectorWithDifferentIndices = (indices: string[]) => {
  return {
    id: 'test-id',
    name: 'test-detector',
    indices: indices,
    detectionInterval: {
      period: {
        interval: 10,
        unit: UNITS.MINUTES,
      },
    },
    description: 'test-description',
    timeField: 'test-timefield',
    windowDelay: {
      period: {
        interval: 1,
        unit: UNITS.MINUTES,
      },
    },
    uiMetadata: {
      filters: [
        {
          filterType: FILTER_TYPES.SIMPLE,
          fieldInfo: [
            {
              label: 'test-filter-field',
              type: DATA_TYPES.TEXT,
            },
          ],
          operator: OPERATORS_MAP.IS,
          fieldValue: 'null',
        },
      ],
    },
    resultIndex: 'opensearch-ad-plugin-result-test',
    resultIndexMinAge: 7,
    resultIndexMinSize: 51200,
    resultIndexTtl: 60,
    flattenCustomResultIndex: true,
  } as Detector;
}
const onEditDetectorDefinition = jest.fn();

const renderWithRouter = (isCreate: boolean = false, testDetector: Detector) => ({
  
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <Formik initialValues={{}} onSubmit={jest.fn()}>
                  {() => (
                    <div>
                      <DetectorDefinitionFields
                        onEditDetectorDefinition={onEditDetectorDefinition}
                        detector={testDetector}
                        isCreate={isCreate}
                        dataSourceId={''}/>
                    </div>
                  )}
                </Formik>
              </CoreServicesContext.Provider>
            )}
          />
        </Switch>
      </Router>
    </Provider>
  ),
});

describe('<AdditionalSettings /> spec', () => {
  test('renders the component in create mode (no ID)', () => {
    const testDetector = getTestDetectorWithDifferentIndices(['test-index'])
    const { container, getByText, queryByText } = renderWithRouter(true, testDetector)
    expect(container.firstChild).toMatchSnapshot();
    getByText('test-detector');
    getByText('test-index');
    getByText('test-filter-field is null');
    getByText('10 Minutes');
    getByText('test-description');
    getByText('test-timefield');
    getByText('1 Minutes');
    getByText('opensearch-ad-plugin-result-test');
    getByText('Yes')
    getByText('7 Days');
    getByText('51200 MB');
    getByText('60 Days');
    expect(queryByText('test-id')).toBeNull();
  });
  test('renders the component in create mode (no ID) multi-index', () => {
    const testDetector = getTestDetectorWithDifferentIndices(['test-index', 'cluster-2:test-index-2', 'cluster-3:http-index'])
    const { container, getByText, queryByText, getByTestId } = renderWithRouter(true, testDetector)
    expect(container.firstChild).toMatchSnapshot();
    getByText('test-detector');
    queryByText('test-index')
    queryByText('...')
    getByTestId('indexNameCellViewAllLink');
    getByText('test-filter-field is null');
    getByText('10 Minutes');
    getByText('test-description');
    getByText('test-timefield');
    getByText('1 Minutes');
    getByText('opensearch-ad-plugin-result-test');
    getByText('Yes')
    getByText('7 Days');
    getByText('51200 MB');
    getByText('60 Days');
    queryByText('View All');

    expect(queryByText('test-id')).toBeNull();
  });
  test('renders the component in edit mode (with ID)', () => {
    const testDetector = getTestDetectorWithDifferentIndices(['test-index'])
    const { container, getByText, queryByText } = renderWithRouter(false, testDetector)
    expect(container.firstChild).toMatchSnapshot();
    getByText('test-detector');
    getByText('test-index');
    getByText('test-filter-field is null');
    getByText('10 Minutes');
    getByText('test-description');
    getByText('test-timefield');
    getByText('1 Minutes');
    expect(queryByText('test-id')).not.toBeNull();
  });
});