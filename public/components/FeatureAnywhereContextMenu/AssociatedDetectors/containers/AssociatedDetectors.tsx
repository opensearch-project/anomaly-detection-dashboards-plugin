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
  EuiCallOut,
} from '@elastic/eui';
import { get, isEmpty } from 'lodash';
import '../styles.scss';
import { getColumns } from '../utils/helpers';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../../../redux/reducers';
import { DetectorListItem } from '../../../../models/interfaces';
import {
  getSavedFeatureAnywhereLoader,
  getNotifications,
  getUISettings,
} from '../../../../services';
import {
  GET_ALL_DETECTORS_QUERY_PARAMS,
  SINGLE_DETECTOR_NOT_FOUND_MSG,
} from '../../../../pages/utils/constants';
import { getDetectorList } from '../../../../redux/reducers/ad';
import {
  prettifyErrorMessage,
  NO_PERMISSIONS_KEY_WORD,
} from '../../../../../server/utils/helpers';
import {
  EmptyAssociatedDetectorMessage,
  ConfirmUnlinkDetectorModal,
} from '../components';
import {
  ISavedAugmentVis,
  SavedAugmentVisLoader,
  getAugmentVisSavedObjs,
} from '../../../../../../../src/plugins/vis_augmenter/public';
import { ASSOCIATED_DETECTOR_ACTION } from '../utils/constants';
import { PLUGIN_AUGMENTATION_MAX_OBJECTS_SETTING } from '../../../../../public/expressions/constants';

interface ConfirmModalState {
  isOpen: boolean;
  action: ASSOCIATED_DETECTOR_ACTION;
  isListLoading: boolean;
  isRequestingToClose: boolean;
  affectedDetector: DetectorListItem;
}

function AssociatedDetectors({ embeddable, closeFlyout, setMode }) {
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
  const [associationLimitReached, setAssociationLimitReached] =
    useState<boolean>(false);
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

  // Establish savedObjectLoader for all operations on vis_augment saved objects
  const savedObjectLoader: SavedAugmentVisLoader =
    getSavedFeatureAnywhereLoader();

  const uiSettings = getUISettings();
  const notifications = getNotifications();
  let maxAssociatedCount = uiSettings.get(
    PLUGIN_AUGMENTATION_MAX_OBJECTS_SETTING
  );

  useEffect(() => {
    if (
      errorGettingDetectors &&
      !errorGettingDetectors.includes(SINGLE_DETECTOR_NOT_FOUND_MSG)
    ) {
      console.error(errorGettingDetectors);
      notifications.toasts.addDanger(
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

  // Handles all changes in the assoicated detectors such as unlinking or new detectors associated
  useEffect(() => {
    // Gets all augmented saved objects that are associated to the given visualization
    getAugmentVisSavedObjs(embeddable.vis.id, savedObjectLoader, uiSettings)
      .then((savedAugmentObjectsArr: any) => {
        if (savedAugmentObjectsArr != undefined) {
          if (maxAssociatedCount <= savedAugmentObjectsArr.length) {
            setAssociationLimitReached(true);
          } else {
            setAssociationLimitReached(false);
          }
          const curSelectedDetectors = getAssociatedDetectors(
            Object.values(allDetectors),
            savedAugmentObjectsArr
          );
          setSelectedDetectors(curSelectedDetectors);
          maxAssociatedCount = uiSettings.get(
            PLUGIN_AUGMENTATION_MAX_OBJECTS_SETTING
          );
          setIsLoadingFinalDetectors(false);
        }
      })
      .catch((error) => {
        notifications.toasts.addDanger(
          prettifyErrorMessage(`Unable to fetch associated detectors: ${error}`)
        );
      });
  }, [allDetectors]);

  // cross checks all the detectors that exist with all the savedAugment Objects to only display ones
  // that are associated to the current visualization
  const getAssociatedDetectors = (
    detectors: DetectorListItem[],
    savedAugmentForThisVisualization: ISavedAugmentVis[]
  ) => {
    // Map all detector IDs for all the found augmented vis objects
    const savedAugmentDetectorsSet = new Set(
      savedAugmentForThisVisualization.map((savedObject) =>
        get(savedObject, 'pluginResource.id', '')
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
    // Gets all augmented saved objects that are associated to the given visualization
    await getAugmentVisSavedObjs(
      embeddable.vis.id,
      savedObjectLoader,
      uiSettings
    ).then(async (savedAugmentForThisVisualization: any) => {
      if (savedAugmentForThisVisualization != undefined) {
        // find saved augment object matching detector we want to unlink
        // There should only be one detector and vis pairing
        const savedAugmentToUnlink = savedAugmentForThisVisualization.find(
          (savedObject) =>
            get(savedObject, 'pluginResource.id', '') === detectorToUnlink.id
        );
        await savedObjectLoader
          .delete(get(savedAugmentToUnlink, 'id', ''))
          .then(async (resp: any) => {
            notifications.toasts.addSuccess({
              title: `Association removed between the ${detectorToUnlink.name}
              and the ${embeddableTitle} visualization`,
              text: "The detector's anomalies do not appear on the visualization. Refresh your dashboard to update the visualization",
            });
          })
          .catch((error) => {
            notifications.toasts.addDanger(
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

  const handleUnlinkDetectorAction = (detector: DetectorListItem) => {
    setDetectorToUnlink(detector);
    setConfirmModalState({
      isOpen: true,
      action: ASSOCIATED_DETECTOR_ACTION.UNLINK,
      isListLoading: false,
      isRequestingToClose: false,
      affectedDetector: detector,
    });
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
        <EmptyAssociatedDetectorMessage
          isFilterApplied={true}
          embeddableTitle={embeddableTitle}
        />
      );
    } else {
      return (
        <EmptyAssociatedDetectorMessage
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
      <EuiFlyout
        style={{ maxWidth: '740px' }}
        ownFocus
        size="m"
        paddingSize="m"
        onClose={closeFlyout}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2 id="associated-detectors__title">
              Associated anomaly detectors
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        {associationLimitReached ? (
          <EuiCallOut
            title={`Limit reached. No more than ${maxAssociatedCount} objects can be associated with a visualization`}
            style={{ margin: '16px' }}
            size="s"
            color="warning"
            iconType="alert"
          >
            Adding more objects may affect cluster performance and prevent
            dashboards from rendering properly. Remove associations before
            adding new ones.
          </EuiCallOut>
        ) : null}
        <EuiFlyoutBody style={{ overflowY: 'auto' }}>
          {confirmModalState.isOpen ? (
            <ConfirmUnlinkDetectorModal
              detector={confirmModalState.affectedDetector}
              onUnlinkDetector={onUnlinkDetector}
              onHide={handleHideModal}
              onConfirm={handleConfirmModal}
              isListLoading={isLoading}
            />
          ) : null}
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem component="span">
              <EuiTitle size="xxs">
                <h3>Visualization: {embeddableTitle}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div>
                <EuiButton
                  data-test-subj="associateDetectorButton"
                  fill
                  disabled={associationLimitReached}
                  iconType="link"
                  onClick={() => {
                    setMode('existing');
                  }}
                >
                  Associate a detector
                </EuiButton>
              </div>
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
