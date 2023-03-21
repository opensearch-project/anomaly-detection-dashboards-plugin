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

import React, { useMemo, useEffect, useState } from 'react';
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
  EuiFlexGroup,
} from '@elastic/eui';
import { get, isEmpty } from 'lodash';
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
import { ASSOCIATED_DETECTOR_ACTION } from '../utils/constants';
import { ConfirmUnlinkDetectorModal } from '../components/ConfirmUnlinkDetectorModal/ConfirmUnlinkDetectorModal';

interface ConfirmModalState {
  isOpen: boolean;
  action: ASSOCIATED_DETECTOR_ACTION;
  isListLoading: boolean;
  isRequestingToClose: boolean;
  affectedDetector: DetectorListItem;
}

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

  const [detectorToUnlink, setDetectorToUnlink] = useState(
    {} as DetectorListItem
  );
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>(
    {
      isOpen: false,
      //@ts-ignore
      action: null,
      isListLoading: false,
      isRequestingToClose: false,
      affectedDetector: {} as DetectorListItem,
    }
  );
  const savedObjectLoader: SavedObjectLoader = getSavedFeatureAnywhereLoader();

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

  // Update modal state if user decides to close
  useEffect(() => {
    if (confirmModalState.isRequestingToClose) {
      if (isLoading) {
        setConfirmModalState({
          ...confirmModalState,
          isListLoading: true,
        });
      } else {
        setConfirmModalState({
          ...confirmModalState,
          isOpen: false,
          isListLoading: false,
          isRequestingToClose: false,
        });
      }
    }
  }, [confirmModalState.isRequestingToClose, isLoading]);

  useEffect(() => {
    getDetectors();
  }, []);

  // Handle all filtering / sorting of detectors
  useEffect(() => {
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

  const onUnlinkDetector = async () => {
    setIsLoadingFinalDetectors(true);
    await savedObjectLoader.findAll().then(async (resp: any) => {
      if (resp != undefined) {
        const savedAugmentObjects: ISavedAugmentVis[] = get(resp, 'hits', []);
        // gets all the saved object for this visualization
        const savedAugmentForThisVisualization: ISavedAugmentVis[] =
          savedAugmentObjects.filter(
            (savedObj) => get(savedObj, 'visId', '') === embeddable.vis.id
          );

        const savedAugmentToUnlink = savedAugmentForThisVisualization.filter(
          (savedObject) =>
            get(savedObject, 'pluginResourceId', '') === detectorToUnlink.id
        );

        const savedObjectToUnlinkId = get(savedAugmentToUnlink[0], 'id', '');
        await savedObjectLoader
          .delete(savedObjectToUnlinkId)
          .then((resp: any) => {})
          .catch((error) => {
            core.notifications.toasts.addDanger(
              prettifyErrorMessage(
                `Error unlinking selected detector: ${error}`
              )
            );
          })
          .finally(() => {
            getDetectors();
          });
      }
    });
  };

  const getUnlinkConfirmModal = () => {
    if (confirmModalState.isOpen) {
      return (
        <ConfirmUnlinkDetectorModal
          detector={confirmModalState.affectedDetector}
          onUnlinkDetector={onUnlinkDetector}
          onHide={handleHideModal}
          onConfirm={handleConfirmModal}
          isListLoading={isLoading}
        />
      );
    }
  };

  const handleHideModal = () => {
    setConfirmModalState({
      ...confirmModalState,
      isOpen: false,
    });
  };

  const handleConfirmModal = () => {
    setConfirmModalState({
      ...confirmModalState,
      isRequestingToClose: true,
    });
  };

  const getDetectors = async () => {
    console.log('inside getDetectors()');
    dispatch(getDetectorList(GET_ALL_DETECTORS_QUERY_PARAMS));
  };

  // This method is only here for development/testing purposes.
  const getSavedObjects = async () => {
    const resp = await getSavedFeatureAnywhereLoader().findAll();
    console.log('response: ' + JSON.stringify(resp));
  };

  const onAssociateExistingDetector = async () => {
    console.log('inside create anomaly detector');
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
    console.log('all Detectors: ' + JSON.stringify(allDetectors));
    const savedObjectToCreate = {
      title: 'test-title',
      pluginResourceId: 'bNZIp4UB3stq6UHwpWwS',
      visId: embeddable.vis.id,
      savedObjectType: 'visualization',
      visLayerExpressionFn: fn,
    } as ISavedAugmentVis;

    const savedObject = await createAugmentVisSavedObject(savedObjectToCreate);
    console.log('savedObject: ' + JSON.stringify(savedObject));

    const response = await savedObject.save({});
    console.log('response: ' + JSON.stringify(response));
    getDetectors();
  };

  const handleUnlinkDetectorAction = (detector: DetectorListItem) => {
    //console.log('onUnlink: ', detector);
    setDetectorToUnlink(detector);
    if (!isEmpty(detector)) {
      setConfirmModalState({
        isOpen: true,
        action: ASSOCIATED_DETECTOR_ACTION.UNLINK,
        isListLoading: false,
        isRequestingToClose: false,
        affectedDetector: detector,
      });
    } else {
      // might not need this
      core.notifications.toasts.addWarning(
        'Make sure selected detector has not been deleted'
      );
    }
  };

  const columns = useMemo(
    () => getColumns({ handleUnlinkDetectorAction }),
    [handleUnlinkDetectorAction]
  );

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
    <EuiFlyout ownFocus size="m" paddingSize="m" onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="associated-detectors__title">Associated anomaly detectors</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody style={{ overflowY: 'auto' }}>
        {getUnlinkConfirmModal()}
        {/* below buttons are just here for development/testing purposes*/}
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem component="span">
            <EuiTitle size="xxs">
              <h3>{embeddableTitle}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              fill
              iconType="link"
              onClick={() => {
                onAssociateExistingDetector();
              }}
            >
              Associate a detector
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiInMemoryTable {...tableProps} />
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
      </EuiFlyoutBody>
    </EuiFlyout>
    //</div>
  );
};
