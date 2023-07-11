/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import AssociatedDetectors from '../AssociatedDetectors';
import { createMockVisEmbeddable } from '../../../../../../../../src/plugins/vis_augmenter/public/mocks';
import { FLYOUT_MODES } from '../../../../../../public/components/FeatureAnywhereContextMenu/AnywhereParentFlyout/constants';
import { CoreServicesContext } from '../../../../../../public/components/CoreServices/CoreServices';
import { coreServicesMock, httpClientMock } from '../../../../../../test/mocks';
import {
  HashRouter as Router,
  RouteComponentProps,
  Route,
  Switch,
} from 'react-router-dom';
import { Provider } from 'react-redux';
import configureStore from '../../../../../../public/redux/configureStore';
import { VisualizeEmbeddable } from '../../../../../../../../src/plugins/visualizations/public';
import {
  setSavedFeatureAnywhereLoader,
  setUISettings,
} from '../../../../../services';
import {
  generateAugmentVisSavedObject,
  VisLayerExpressionFn,
  VisLayerTypes,
  createSavedAugmentVisLoader,
  setUISettings as setVisAugUISettings,
  getMockAugmentVisSavedObjectClient,
  SavedObjectLoaderAugmentVis,
} from '../../../../../../../../src/plugins/vis_augmenter/public';
import { getAugmentVisSavedObjs } from '../../../../../../../../src/plugins/vis_augmenter/public/utils';
import { uiSettingsServiceMock } from '../../../../../../../../src/core/public/mocks';
import {
  PLUGIN_AUGMENTATION_ENABLE_SETTING,
  PLUGIN_AUGMENTATION_MAX_OBJECTS_SETTING,
} from '../../../../../../../../src/plugins/vis_augmenter/common';
import userEvent from '@testing-library/user-event';
const fn = {
  type: VisLayerTypes.PointInTimeEvents,
  name: 'test-fn',
  args: {
    testArg: 'test-value',
  },
} as VisLayerExpressionFn;
const originPlugin = 'test-plugin';

const uiSettingsMock = uiSettingsServiceMock.createStartContract();
setUISettings(uiSettingsMock);
setVisAugUISettings(uiSettingsMock);
const setUIAugSettings = (isEnabled = true, maxCount = 10) => {
  uiSettingsMock.get.mockImplementation((key: string) => {
    if (key === PLUGIN_AUGMENTATION_MAX_OBJECTS_SETTING) return maxCount;
    else if (key === PLUGIN_AUGMENTATION_ENABLE_SETTING) return isEnabled;
    else return false;
  });
};

setUIAugSettings();

jest.mock('../../../../../services', () => ({
  ...jest.requireActual('../../../../../services'),

  getUISettings: () => {
    return {
      get: (config: string) => {
        switch (config) {
          case 'visualization:enablePluginAugmentation':
            return true;
          case 'visualization:enablePluginAugmentation.maxPluginObjects':
            return 10;
          default:
            throw new Error(
              `Accessing ${config} is not supported in the mock.`
            );
        }
      },
    };
  },
  getNotifications: () => {
    return {
      toasts: {
        addDanger: jest.fn().mockName('addDanger'),
        addSuccess: jest.fn().mockName('addSuccess'),
      },
    };
  },
}));

jest.mock(
  '../../../../../../../../src/plugins/vis_augmenter/public/utils',
  () => ({
    getAugmentVisSavedObjs: jest.fn(),
  })
);
const visEmbeddable = createMockVisEmbeddable(
  'test-saved-obj-id',
  'test-title',
  false
);

const renderWithRouter = (visEmbeddable: VisualizeEmbeddable) => ({
  ...render(
    <Provider store={configureStore(httpClientMock)}>
      <Router>
        <Switch>
          <Route
            render={(props: RouteComponentProps) => (
              <CoreServicesContext.Provider value={coreServicesMock}>
                <AssociatedDetectors
                  embeddable={visEmbeddable}
                  closeFlyout={jest.fn()}
                  setMode={FLYOUT_MODES.associated}
                />
              </CoreServicesContext.Provider>
            )}
          />
        </Switch>
      </Router>
    </Provider>
  ),
});
describe('AssociatedDetectors spec', () => {
  let augmentVisLoader: SavedObjectLoaderAugmentVis;
  let mockDeleteFn: jest.Mock;
  let detectorsToAssociate = new Array(2).fill(null).map((_, index) => {
    return {
      id: `detector_id_${index}`,
      name: `detector_name_${index}`,
      indices: [`index_${index}`],
      totalAnomalies: 5,
      lastActiveAnomaly: Date.now() + index,
    };
  });
  //change one of the two detectors to have an ID not matching the ID in saved object
  detectorsToAssociate[1].id = '5';

  const savedObjects = new Array(2).fill(null).map((_, index) => {
    const pluginResource = {
      type: 'test-plugin',
      id: `detector_id_${index}`,
    };
    return generateAugmentVisSavedObject(
      `valid-obj-id-${index}`,
      fn,
      `vis-id-${index}`,
      originPlugin,
      pluginResource
    );
  });
  beforeEach(() => {
    mockDeleteFn = jest.fn().mockResolvedValue('someValue');
    augmentVisLoader = createSavedAugmentVisLoader({
      savedObjectsClient: {
        ...getMockAugmentVisSavedObjectClient(savedObjects),
        delete: mockDeleteFn,
      },
    } as any) as SavedObjectLoaderAugmentVis;
    setSavedFeatureAnywhereLoader(augmentVisLoader);
  });
  describe('Renders loading component', () => {
    test('renders the detector is loading', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: { detectorList: [], totalDetectors: 0 },
      });
      (getAugmentVisSavedObjs as jest.Mock).mockImplementation(() =>
        Promise.resolve(savedObjects)
      );
      const { getByText } = renderWithRouter(visEmbeddable);
      getByText('Loading detectors...');
      getByText('Real-time state');
      getByText('Associate a detector');
    });
  });

  describe('renders either one or zero detectors', () => {
    test('renders one associated detector', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          detectorList: detectorsToAssociate,
          totalDetectors: detectorsToAssociate.length,
        },
      });
      (getAugmentVisSavedObjs as jest.Mock).mockImplementation(() =>
        Promise.resolve(savedObjects)
      );
      const { getByText, queryByText } = renderWithRouter(visEmbeddable);
      getByText('Loading detectors...');
      await waitFor(() => getByText('detector_name_0'));
      getByText('5');
      expect(queryByText('detector_name_1')).toBeNull();
    }, 80000);
    test('renders no associated detectors', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          detectorList: [detectorsToAssociate[1]],
          totalDetectors: 1,
        },
      });
      (getAugmentVisSavedObjs as jest.Mock).mockImplementation(() =>
        Promise.resolve(savedObjects)
      );
      const { getByText, findByText } = renderWithRouter(visEmbeddable);
      getByText('Loading detectors...');
      await waitFor(() =>
        findByText(
          'There are no anomaly detectors associated with test-title visualization.',
          undefined,
          { timeout: 100000 }
        )
      );
    }, 150000);
  });

  describe('tests unlink functionality', () => {
    test('unlinks a single detector', async () => {
      httpClientMock.get = jest.fn().mockResolvedValue({
        ok: true,
        response: {
          detectorList: detectorsToAssociate,
          totalDetectors: detectorsToAssociate.length,
        },
      });
      (getAugmentVisSavedObjs as jest.Mock).mockImplementation(() =>
        Promise.resolve(savedObjects)
      );
      const { getByText, queryByText, getAllByTestId } =
        renderWithRouter(visEmbeddable);
      getByText('Loading detectors...');
      await waitFor(() => getByText('detector_name_0'));
      getByText('5');
      expect(queryByText('detector_name_1')).toBeNull();
      userEvent.click(getAllByTestId('unlinkButton')[0]);
      await waitFor(() =>
        getByText(
          'Removing association unlinks detector_name_0 detector from the visualization but does not delete it. The detector association can be restored.'
        )
      );
      userEvent.click(getAllByTestId('confirmUnlinkButton')[0]);
      expect(
        (
          await getAugmentVisSavedObjs(
            'valid-obj-id-0',
            augmentVisLoader,
            uiSettingsMock
          )
        ).length
      ).toEqual(2);
      await waitFor(() => expect(mockDeleteFn).toHaveBeenCalledTimes(1));
    }, 100000);
  });
});

//I have a new beforeEach because I making a lot more detectors and saved objects for these tests
describe('test over 10 associated objects functionality', () => {
  let augmentVisLoader: SavedObjectLoaderAugmentVis;
  let mockDeleteFn: jest.Mock;
  const detectorsToAssociate = new Array(16).fill(null).map((_, index) => {
    const hasAnomaly = Math.random() > 0.5;
    return {
      id: `detector_id_${index}`,
      name: `detector_name_${index}`,
      indices: [`index_${index}`],
      totalAnomalies: hasAnomaly ? Math.floor(Math.random() * 10) : 0,
      lastActiveAnomaly: hasAnomaly ? Date.now() + index : 0,
    };
  });

  const savedObjects = new Array(16).fill(null).map((_, index) => {
    const pluginResource = {
      type: 'test-plugin',
      id: `detector_id_${index}`,
    };
    return generateAugmentVisSavedObject(
      `valid-obj-id-${index}`,
      fn,
      `vis-id-${index}`,
      originPlugin,
      pluginResource
    );
  });
  beforeEach(() => {
    mockDeleteFn = jest.fn().mockResolvedValue('someValue');
    augmentVisLoader = createSavedAugmentVisLoader({
      savedObjectsClient: {
        ...getMockAugmentVisSavedObjectClient(savedObjects),
        delete: mockDeleteFn,
      },
    } as any) as SavedObjectLoaderAugmentVis;
    setSavedFeatureAnywhereLoader(augmentVisLoader);
  });
  test('create 20 detectors and saved objects', async () => {
    httpClientMock.get = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        detectorList: detectorsToAssociate,
        totalDetectors: detectorsToAssociate.length,
      },
    });
    (getAugmentVisSavedObjs as jest.Mock).mockImplementation(() =>
      Promise.resolve(savedObjects)
    );

    const { getByText, queryByText, getAllByTestId, findByText } =
      renderWithRouter(visEmbeddable);

    await waitFor(() =>
      findByText('detector_name_1', undefined, { timeout: 200000 })
    );
    expect(queryByText('detector_name_15')).toBeNull();
    // Navigate to next page
    await waitFor(() =>
      userEvent.click(getAllByTestId('pagination-button-next')[0])
    );
    await waitFor(() => findByText('detector_name_15'));

    expect(queryByText('detector_name_0')).toBeNull();
    // Navigate to previous page
    await waitFor(() =>
      userEvent.click(getAllByTestId('pagination-button-previous')[0])
    );
    getByText('detector_name_0');
    expect(queryByText('detector_name_15')).toBeNull();
  }, 200000);

  test('searching functionality', async () => {
    httpClientMock.get = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        detectorList: detectorsToAssociate,
        totalDetectors: detectorsToAssociate.length,
      },
    });
    (getAugmentVisSavedObjs as jest.Mock).mockImplementation(() =>
      Promise.resolve(savedObjects)
    );

    const { queryByText, getByPlaceholderText, findByText } =
      renderWithRouter(visEmbeddable);

    // initial load only first 10 detectors
    await waitFor(() =>
      findByText('detector_name_1', undefined, { timeout: 60000 })
    );
    expect(queryByText('detector_name_15')).toBeNull();

    //Input search event
    userEvent.type(getByPlaceholderText('Search...'), 'detector_name_15');
    await waitFor(() => {
      findByText('detector_name_15');
    });
    expect(queryByText('detector_name_1')).toBeNull();
  }, 100000);

  test('sorting functionality', async () => {
    httpClientMock.get = jest.fn().mockResolvedValue({
      ok: true,
      response: {
        detectorList: detectorsToAssociate,
        totalDetectors: detectorsToAssociate.length,
      },
    });
    (getAugmentVisSavedObjs as jest.Mock).mockImplementation(() =>
      Promise.resolve(savedObjects)
    );

    const { queryByText, getAllByTestId, findByText } =
      renderWithRouter(visEmbeddable);

    // initial load only first 10 detectors (string sort means detector_name_0 -> detector_name_9 show up)
    await waitFor(() =>
      findByText('detector_name_0', undefined, { timeout: 100000 })
    );
    expect(queryByText('detector_name_15')).toBeNull();

    // Sort by name (string sorting)
    userEvent.click(getAllByTestId('tableHeaderSortButton')[0]);
    await waitFor(() =>
      findByText('detector_name_15', undefined, { timeout: 150000 })
    );
    expect(queryByText('detector_name_9')).toBeNull();
  }, 200000);
});
