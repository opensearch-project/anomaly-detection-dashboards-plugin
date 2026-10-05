/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { Formik } from 'formik';
import configureMockStore from 'redux-mock-store';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { DataSource } from '../DataSource';
import { initialState } from '../../../../../redux/reducers/opensearch';
import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../../utils/constants';
import { DetectorDefinitionFormikValues } from '../../../models/interfaces';
import { FILTER_TYPES } from '../../../../../models/interfaces';

jest.mock('../../DataFilterList/DataFilterList', () => ({
  DataFilterList: () => null,
}));

const renderSource = (isEdit = false, remoteOnly = false, error = '') => {
  const store = configureMockStore()({
    opensearch: {
      ...initialState,
      clusters: [
        { name: 'local', localCluster: true },
        { name: 'remote', localCluster: false },
      ],
      indices: [{ index: 'plain-index', health: 'green', localCluster: true }],
      aliases: [
        { alias: 'plain-alias', index: 'plain-index', localCluster: true },
      ],
      dataStreams: [
        { name: 'logs-stream', localCluster: true },
        { name: 'remote:logs-stream', localCluster: false },
      ],
      dataStreamsError: error,
    },
  });
  const index = isEdit ? [{ label: 'logs-stream' }] : [];
  const result = render(
    <Provider store={store}>
      <HashRouter>
        <Formik<DetectorDefinitionFormikValues>
          initialValues={{
            ...INITIAL_DETECTOR_DEFINITION_VALUES,
            index,
            clusters: [
              {
                label: remoteOnly ? 'remote (Remote)' : 'local (Local)',
                cluster: remoteOnly ? 'remote' : 'local',
                localcluster: remoteOnly ? 'false' : 'true',
              },
            ],
          }}
          onSubmit={jest.fn()}
        >
          {(formikProps) => (
            <>
              <DataSource
                formikProps={formikProps}
                origIndex={index}
                isEdit={isEdit}
                oldFilterType={FILTER_TYPES.SIMPLE}
                oldFilterQuery={{}}
              />
              <output data-test-subj="selectedSource">
                {formikProps.values.index.map((item) => item.label).join(',')}
              </output>
            </>
          )}
        </Formik>
      </HashRouter>
    </Provider>
  );
  return { ...result, store };
};

describe('Detector data stream sources', () => {
  test.each(['logs-stream', 'remote:logs-stream'])(
    'selects %s and requests its fields using the logical name',
    async (name) => {
      const { getByTestId, getByText, store } = renderSource();
      fireEvent.click(getByTestId('indicesFilter').querySelector('input')!);
      fireEvent.click(await waitFor(() => getByText(name)));
      await waitFor(() =>
        expect(getByTestId('selectedSource')).toHaveTextContent(name)
      );
      const mappingAction = store
        .getActions()
        .find((action) => action.type === 'opensearch/GET_MAPPINGS');
      const get = jest.fn();
      mappingAction.request({ get });
      expect(get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: { indices: [name] },
        })
      );
    }
  );

  test('keeps an existing logical stream selected when editing', async () => {
    const { getByTestId, store } = renderSource(true);
    await waitFor(() =>
      expect(
        store
          .getActions()
          .some(
            (action) => action.type === 'opensearch/GET_INDICES_AND_ALIASES'
          )
      ).toBe(true)
    );
    expect(getByTestId('selectedSource')).toHaveTextContent('logs-stream');
    expect(getByTestId('selectedSource')).not.toHaveTextContent('.ds-');
  });

  test('searches streams only on the selected remote cluster', async () => {
    const { getByTestId, store } = renderSource(false, true);
    await waitFor(() =>
      expect(
        store
          .getActions()
          .some(
            (action) => action.type === 'opensearch/GET_INDICES_AND_ALIASES'
          )
      ).toBe(true)
    );
    store.clearActions();
    fireEvent.change(getByTestId('indicesFilter').querySelector('input')!, {
      target: { value: 'logs' },
    });
    await waitFor(() =>
      expect(
        store
          .getActions()
          .some(
            (action) => action.type === 'opensearch/GET_INDICES_AND_ALIASES'
          )
      ).toBe(true)
    );
    const get = jest.fn();
    store
      .getActions()
      .find((action) => action.type === 'opensearch/GET_INDICES_AND_ALIASES')
      .request({ get });
    expect(get).toHaveBeenCalledWith(expect.any(String), {
      query: {
        indexOrAliasQuery: '*logs*',
        clusters: 'remote',
        queryForLocalCluster: false,
        includeDataStreams: true,
      },
    });
  });

  test('shows a stream discovery error while retaining index and alias choices', async () => {
    const { getByTestId, getByText } = renderSource(
      false,
      false,
      'Permission denied'
    );
    expect(getByText('Unable to load data streams')).toBeInTheDocument();
    expect(getByText('Permission denied')).toBeInTheDocument();
    fireEvent.click(getByTestId('indicesFilter').querySelector('input')!);
    expect(await waitFor(() => getByText('plain-index'))).toBeInTheDocument();
    expect(getByText('plain-alias')).toBeInTheDocument();
  });
});
