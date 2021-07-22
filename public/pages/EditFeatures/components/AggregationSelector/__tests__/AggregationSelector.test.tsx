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

/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Formik } from 'formik';
import { AggregationSelector } from '../AggregationSelector';
import { FEATURE_TYPE } from '../../../../../models/interfaces';
import {
  initialState,
  mockedStore,
} from '../../../../../redux/utils/testUtils';
import { FeaturesFormikValues } from '../../../containers/utils/formikToFeatures';

const INITIAL_VALUES = {
  featureId: 'test-id',
  featureName: 'test-feature',
  featureType: FEATURE_TYPE.SIMPLE,
  featureEnabled: true,
  aggregationQuery: '',
};

const renderAggregationSelector = (initialValue: FeaturesFormikValues) => ({
  ...render(
    <Provider
      store={mockedStore({
        ...initialState,
        opensearch: {
          ...initialState.opensearch,
          dataTypes: {
            keyword: ['cityName.keyword'],
            integer: ['age'],
            text: ['cityName'],
          },
        },
      })}
    >
      <Formik initialValues={initialValue} onSubmit={jest.fn()}>
        {(formikProps) => (
          <div>
            <AggregationSelector />
          </div>
        )}
      </Formik>
    </Provider>
  ),
});

describe('<AggregationSelector /> spec', () => {
  describe('Empty results', () => {
    test('renders component with aggregation types and defaults to empty', () => {
      const { container } = renderAggregationSelector(INITIAL_VALUES);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
