/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useEffect, useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiTitle,
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
import { ISavedAugmentVis } from '../../../../../../../src/plugins/vis_augmenter/public';
import { ASSOCIATED_DETECTOR_ACTION } from '../utils/constants';
import { ConfirmUnlinkDetectorModal } from '../components/ConfirmUnlinkDetectorModal/ConfirmUnlinkDetectorModal';

interface ConfirmModalState {
  isOpen: boolean;
  action: ASSOCIATED_DETECTOR_ACTION;
  isListLoading: boolean;
  isRequestingToClose: boolean;
  affectedDetector: DetectorListItem;
}

function AssociatedDetectors({ embeddable, closeFlyout, setMode }) {
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

  // Establish savedObjectLoader for all operations on vis augmented saved objects
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

  // Update modal state if user decides to close modal
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

  // Handle all changes in the assoicated detectors such as unlinking or new detectors associated
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
  // that are associated to the current visualization
  const getAssociatedDetectors = (
    detectors: DetectorListItem[],
    savedAugmentObjects: ISavedAugmentVis[]
  ) => {
    // Filter all savedAugmentObjects that aren't linked to the specific visualization
    const savedAugmentForThisVisualization: ISavedAugmentVis[] =
      savedAugmentObjects.filter(
        (savedObj) => get(savedObj, 'visId', '') === embeddable.vis.id
      );

    // Map all detector IDs for all the found augmented vis objects
    const savedAugmentDetectorsSet = new Set(
      savedAugmentForThisVisualization.map((savedObject) =>
        get(savedObject, 'pluginResourceId', '')
      )
    );

    // filter out any detectors that aren't on the set of detectors IDs from the augmented vis objects.
    const detectorsToDisplay = detectors.filter((detector) =>
      savedAugmentDetectorsSet.has(detector.id)
    );
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

        // find saved Augment object matching detector we want to unlink
        // There should only be one detector and vis pairing
        const savedAugmentToUnlink = savedAugmentForThisVisualization.find(
          (savedObject) =>
            get(savedObject, 'pluginResourceId', '') === detectorToUnlink.id
        );
        const savedObjectToUnlinkId = get(savedAugmentToUnlink, 'id', '');
        await savedObjectLoader
          .delete(savedObjectToUnlinkId)
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
    dispatch(getDetectorList(GET_ALL_DETECTORS_QUERY_PARAMS));
  };

  // TODO: this part is incomplete because it is pending on complete the work for associating an existing
  // detector which is dependent on changes in the action.tsx code that jackie will merge in
  // const onAssociateExistingDetector = async () => {
  //   console.log('inside create anomaly detector');
  // };

  const handleUnlinkDetectorAction = (detector: DetectorListItem) => {
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
      core.notifications.toasts.addWarning(
        'Make sure selected detector has not been deleted'
      );
    }
  };

  const columns = useMemo(
    () => getColumns({ handleUnlinkDetectorAction }),
    [handleUnlinkDetectorAction]
  );

  const renderEmptyMessage = () => {
    if (isLoading) {
      return 'Loading detectors...';
    } else if (!isEmpty(selectedDetectors)) {
      return (
        <EmptyAssociatedDetectorFlyoutMessage
          isFilterApplied={true}
          embeddableTitle={embeddableTitle}
        />
      );
    } else {
      return (
        <EmptyAssociatedDetectorFlyoutMessage
          isFilterApplied={false}
          embeddableTitle={embeddableTitle}
        />
      );
    }
  };

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
    message: renderEmptyMessage(),
  };
  return (
    <div className="associated-detectors">
      <EuiFlyout ownFocus size="m" paddingSize="m" onClose={closeFlyout}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="associated-detectors__title">
              Associated anomaly detectors
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody style={{ overflowY: 'auto' }}>
          {getUnlinkConfirmModal()}
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
                  setMode('existing');
                }}
              >
                Associate a detector
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiInMemoryTable {...tableProps} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </div>
  );
}

export default AssociatedDetectors;
