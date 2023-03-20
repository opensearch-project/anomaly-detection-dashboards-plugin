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

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiInMemoryTable,
  EuiFlyoutBody,
  EuiButton,
  EuiFlyout,
  EuiFlexItem,
} from '@elastic/eui';
import { get } from 'lodash';
import '../styles.scss';
import { getColumns } from '../utils/helpers';
import { CoreServicesContext } from '../../../../components/CoreServices/CoreServices';
import { CoreStart } from '../../../../../../../src/core/public';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../../../redux/reducers';
import { DetectorListItem } from '../../../../models/interfaces';
import { getSavedFeatureAnywhereLoader } from '../../../../services';
import {
  GET_ALL_DETECTORS_QUERY_PARAMS,
  SINGLE_DETECTOR_NOT_FOUND_MSG,
} from '../../../../pages/utils/constants';
import { getDetectorList } from '../../../../redux/reducers/ad';
import {
  prettifyErrorMessage,
  NO_PERMISSIONS_KEY_WORD,
} from '../../../../../server/utils/helpers';
import { SavedObjectLoader } from '../../../../../../../src/plugins/saved_objects/public';
import { EmptyAssociatedDetectorFlyoutMessage } from '../components/EmptyMessage/EmptyMessage';
import {
  createAugmentVisSavedObject,
  ISavedAugmentVis,
  VisLayerExpressionFn,
} from '../../../../../../../src/plugins/vis_augmenter/public';

export const AssociatedDetectors = ({ embeddable, closeFlyout }) => {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const allDetectors = useSelector((state: AppState) => state.ad.detectorList);
  const isRequestingFromES = useSelector(
    (state: AppState) => state.ad.requesting
  );
  const [isLoadingFinalDetectors, setIsLoadingFinalDetectors] =
    useState<boolean>(true);
  const isLoading = isRequestingFromES || isLoadingFinalDetectors;
  const errorGettingDetectors = useSelector(
    (state: AppState) => state.ad.errorMessage
  );
  const embeddableTitle = embeddable.getTitle();
  const [selectedDetectors, setSelectedDetectors] = useState(
    [] as DetectorListItem[]
  );

  useEffect(() => {
    if (
      errorGettingDetectors &&
      !errorGettingDetectors.includes(SINGLE_DETECTOR_NOT_FOUND_MSG)
    ) {
      console.error(errorGettingDetectors);
      core.notifications.toasts.addDanger(
        typeof errorGettingDetectors === 'string' &&
          errorGettingDetectors.includes(NO_PERMISSIONS_KEY_WORD)
          ? prettifyErrorMessage(errorGettingDetectors)
          : 'Unable to get all detectors'
      );
      setIsLoadingFinalDetectors(false);
    }
  }, [errorGettingDetectors]);

  useEffect(() => {
    getDetectors();
  }, []);

  // Handle all filtering / sorting of detectors
  useEffect(() => {
    const savedObjectLoader: SavedObjectLoader =
      getSavedFeatureAnywhereLoader();
    // Gets all augmented saved objects
    savedObjectLoader.findAll().then((resp: any) => {
      if (resp != undefined) {
        const savedAugmentObjectsArr: ISavedAugmentVis[] = get(
          resp,
          'hits',
          []
        );
        const curSelectedDetectors = getAssociatedDetectors(
          Object.values(allDetectors),
          savedAugmentObjectsArr
        );
        setSelectedDetectors(curSelectedDetectors);
        setIsLoadingFinalDetectors(false);
      }
    });
  }, [allDetectors]);

  // cross checks all the detectors that exist with all the savedAugment Objects to only display ones
  const getAssociatedDetectors = (
    detectors: DetectorListItem[],
    savedAugmentObjects: ISavedAugmentVis[]
  ) => {
    const savedAugmentForThisVisualization: ISavedAugmentVis[] =
      savedAugmentObjects.filter(
        (savedObj) => get(savedObj, 'visId', '') === embeddable.vis.id
      );
    const savedAugmentDetectorsSet = new Set(
      savedAugmentForThisVisualization.map((savedObject) =>
        get(savedObject, 'pluginResourceId', '')
      )
    );
    const detectorsToDisplay = detectors.filter((detector) =>
      savedAugmentDetectorsSet.has(detector.id)
    );
    console.log('detectorsToDisplay: ' + JSON.stringify(detectorsToDisplay));
    return detectorsToDisplay;
  };

  const getDetectors = async () => {
    dispatch(getDetectorList(GET_ALL_DETECTORS_QUERY_PARAMS));
  };

  // This method is only here for development/testing purposes.
  const getSavedObjects = async () => {
    const resp = await getSavedFeatureAnywhereLoader().findAll();
    console.log('response: ' + JSON.stringify(resp));
  };

  // This method is only here for development/testing purposes.
  const createSavedObjects = async () => {
    enum VisLayerTypes {
      PointInTimeEvents = 'PointInTimeEvents',
    }
    const fn = {
      type: VisLayerTypes.PointInTimeEvents,
      name: 'test-fn',
      args: {
        testArg: selectedDetectors[0].id,
      },
    } as VisLayerExpressionFn;

    const savedObjectToCreate = {
      title: 'test-title',
      pluginResourceId: selectedDetectors[0].id,
      visId: embeddable.vis.id,
      savedObjectType: 'visualization',
      visLayerExpressionFn: fn,
    } as ISavedAugmentVis;

    const savedObject = await createAugmentVisSavedObject(savedObjectToCreate);
    console.log('savedObject: ' + JSON.stringify(savedObject));

    const response = await savedObject.save({});
    console.log('response: ' + JSON.stringify(response));
  };

  const onUnlink = useCallback(
    (item) => {
      console.log('onUnlink', item);
      closeFlyout();
    },
    [closeFlyout]
  );
  const onView = useCallback(
    (item) => {
      console.log('onView', item);
      closeFlyout();
    },
    [closeFlyout]
  );
  const columns = useMemo(() => getColumns({ onUnlink, onView }), [onUnlink]);

  const tableProps = {
    items: selectedDetectors,
    columns,
    search: {
      box: {
        disabled: selectedDetectors.length === 0,
        incremental: true,
        schema: true,
      },
    },
    hasActions: true,
    pagination: true,
    sorting: true,
    message: isLoading ? (
      'Loading detectors...'
    ) : (
      <EmptyAssociatedDetectorFlyoutMessage
        //isFilterApplied={search}
        embeddableTitle={embeddableTitle}
      />
    ),
  };

  return (
    //<div className="associated-detectors">
    <EuiFlyout ownFocus size="m" onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="associated-detectors__title">Associated anomaly detectors</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {/* below buttons are just here for development/testing purposes*/}
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              createSavedObjects();
            }}
          >
            Create saved objects{' '}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => {
              getSavedObjects();
            }}
          >
            Get Saved Objects
          </EuiButton>
        </EuiFlexItem>
        <EuiText>
          <h4>{embeddableTitle}</h4>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiInMemoryTable {...tableProps} />
      </EuiFlyoutBody>
    </EuiFlyout>

    //</div>
  );
};
