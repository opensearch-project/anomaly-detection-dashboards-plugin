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
import { Provider } from 'react-redux';
import userEvent from '@testing-library/user-event';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { render, waitFor } from '@testing-library/react';
import { ReviewAndCreate } from '../ReviewAndCreate';
import configureStore from '../../../../redux/configureStore';
import { httpClientMock, coreServicesMock } from '../../../../../test/mocks';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { INITIAL_DETECTOR_JOB_VALUES } from '../../../DetectorJobs/utils/constants';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../../ConfigureModel/utils/constants';
import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../../DefineDetector/utils/constants';

const renderWithRouter = (isEdit: boolean = false) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <ReviewAndCreate
                  setStep={jest.fn()}
                  values={{
                    ...INITIAL_DETECTOR_DEFINITION_VALUES,
                    ...INITIAL_MODEL_CONFIGURATION_VALUES,
                    ...INITIAL_DETECTOR_JOB_VALUES,
                  }}
                  {...props}
                />
              </CoreServicesContext.Provider>
            )}
          />
        </Switch>
      </Router>
    </Provider>
  ),
});

describe('<ReviewAndCreate /> spec', () => {
  test('renders the component, validation loading', () => {
    const { container, getByText } = renderWithRouter(false);
    expect(container.firstChild).toMatchSnapshot();
    getByText('Review and create');
    getByText('Detector settings');
    getByText('Model configuration');
    getByText('Detector schedule');
    getByText('Create detector');
    getByText('Validating detector configurations');
    getByText('Validating model configurations');
  });
});

describe('Validation no issue', () => {
  test('renders succesful validation callout', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {},
    });
    const { getByText } = renderWithRouter(false);
    await waitFor(() => {});
    getByText('Detector settings are validated');
    getByText('Model configurations are validated');
  });
});

describe('validation model issue found', () => {
  test('renders filter query validation issue', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        model: {
          filter_query: {
            message:
              'Data is too sparse after data filter is applied. Consider changing the data filter',
          },
        },
      },
    });
    const { getByText } = renderWithRouter(false);
    await waitFor(() => {});
    getByText('We identified some areas that might improve your model');
    getByText(
      'Data is too sparse after data filter is applied. Consider changing the data filter'
    );
    getByText('Model configurations are validated');
  });

  test('renders dectector interval validation issue', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        model: {
          detector_interval: {
            message:
              'The selected detector interval might collect sparse data. Consider changing interval length to: 4',
          },
        },
      },
    });
    const { getByText } = renderWithRouter(false);
    await waitFor(() => {});
    getByText('We identified some areas that might improve your model');
    getByText(
      'The selected detector interval might collect sparse data. Consider changing interval length to: 4'
    );
    getByText('Model configurations are validated');
  });

  test('renders category field validation issue', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        model: {
          category_field: {
            message:
              'Data is most likely too sparse with the given category fields. Consider revising category field/s or ingesting more data',
          },
        },
      },
    });
    const { getByText } = renderWithRouter(false);
    await waitFor(() => {});
    getByText('We identified some areas that might improve your model');
    getByText(
      'Data is most likely too sparse with the given category fields. Consider revising category field/s or ingesting more data'
    );
    getByText('Detector settings are validated');
  });

  test('renders success callout on internal aggregation validation issue (aggregation)', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        model: {
          timeout: {
            message: 'Model validation experienced issues completing',
          },
        },
      },
    });
    const { getByText } = renderWithRouter(false);
    await waitFor(() => {});
    // Currently in case of internal aggregation failure we don't block users and let them continue with creating a detector
    // this failure is caused by an issue with Opensearch core and not necessarily user input
    getByText('Detector settings are validated');
    getByText('Model configurations are validated');
  });
});

describe('issue in detector validation', () => {
  test('issues in detector timestamp', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        detector: {
          time_field: {
            message: 'Timestamp field: timestamp must be of type date',
          },
        },
      },
    });
    const { getByText } = renderWithRouter(false);
    await waitFor(() => {});
    // Currently in case of internal aggregation failure we don't block users and let them continue with creating a detector
    // this failure is caused by an issue with Opensearch core and not necessarily user input
    getByText('Timestamp field: timestamp must be of type date');
    getByText('Issues found in the detector settings');
    getByText('Model configurations are validated');
  });

  test('issues in feature query', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        detector: {
          feature_attributes: {
            message:
              'Feature has an invalid query returning empty aggregated data: f_1, Feature has an invalid query causing a runtime exception: f_2',
            sub_issues: {
              f_1: 'Feature has an invalid query returning empty aggregated data: f_1',
              f_2: 'Feature has an invalid query causing a runtime exception: f_2',
            },
          },
        },
      },
    });
    const { getByText } = renderWithRouter(false);
    await waitFor(() => {});
    getByText(
      'The "f_1" Feature has an invalid query returning empty aggregated data: f_1'
    );
    getByText(
      'The "f_2" Feature has an invalid query causing a runtime exception: f_2'
    );
    getByText('Issues found in the model configuration');
    getByText('Detector settings are validated');
  });

  test('issues in feature query', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        detector: {
          feature_attributes: {
            message: 'Detector has duplicate feature names: f_1, f_2',
          },
        },
      },
    });
    const { container, getByText } = renderWithRouter(false);
    await waitFor(() => {});
    expect(container).toMatchSnapshot();
    getByText('Issues found in the model configuration');
    getByText('Detector settings are validated');
  });
});

describe('create Detector', () => {
  test('renders succesful validation callout', async () => {
    httpClientMock.post = jest.fn().mockResolvedValue({
      ok: true,
      response: {},
    });
    const { getByText, getByTestId } = renderWithRouter(false);
    await waitFor(() => {});
    getByText('Detector settings are validated');
    getByText('Model configurations are validated');
    userEvent.click(getByTestId('createDetectorButton'));
  });
});
