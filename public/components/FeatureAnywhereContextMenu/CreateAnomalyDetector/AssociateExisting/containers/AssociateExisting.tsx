/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiComboBox,
  EuiLoadingSpinner,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { get } from 'lodash';
import { CoreServicesContext } from '../../../../../components/CoreServices/CoreServices';
import { CoreStart } from '../../../../../../../../src/core/public';
import { AppState } from '../../../../../redux/reducers';
import { DetectorListItem } from '../../../../../models/interfaces';
import {
  GET_ALL_DETECTORS_QUERY_PARAMS,
  SINGLE_DETECTOR_NOT_FOUND_MSG,
} from '../../../../../pages/utils/constants';
import {
  NO_PERMISSIONS_KEY_WORD,
  prettifyErrorMessage,
} from '../../../../../../server/utils/helpers';
import { getDetectorList } from '../../../../../redux/reducers/ad';
import {
  getSavedFeatureAnywhereLoader,
  getUISettings,
} from '../../../../../services';
import {
  ISavedAugmentVis,
  SavedAugmentVisLoader,
  getAugmentVisSavedObjs,
} from '../../../../../../../../src/plugins/vis_augmenter/public';
import { stateToColorMap } from '../../../../../pages/utils/constants';
import {
  BASE_DOCS_LINK,
  PLUGIN_NAME,
} from '../../../../../../public/utils/constants';
import { renderTime } from '../../../../../../public/pages/DetectorsList/utils/tableUtils';

interface AssociateExistingProps {
  embeddableVisId: string;
  selectedDetector: DetectorListItem | undefined;
  setSelectedDetector(detector: DetectorListItem | undefined): void;
}

export function AssociateExisting(
  associateExistingProps: AssociateExistingProps
) {
  const core = React.useContext(CoreServicesContext) as CoreStart;
  const dispatch = useDispatch();
  const allDetectors = useSelector((state: AppState) => state.ad.detectorList);
  const isRequestingFromES = useSelector(
    (state: AppState) => state.ad.requesting
  );
  const uiSettings = getUISettings();
  const [isLoadingFinalDetectors, setIsLoadingFinalDetectors] =
    useState<boolean>(true);
  const isLoading = isRequestingFromES || isLoadingFinalDetectors;
  const errorGettingDetectors = useSelector(
    (state: AppState) => state.ad.errorMessage
  );
  const [
    existingDetectorsAvailableToAssociate,
    setExistingDetectorsAvailableToAssociate,
  ] = useState([] as DetectorListItem[]);

  // Establish savedObjectLoader for all operations on vis augmented saved objects
  const savedObjectLoader: SavedAugmentVisLoader =
    getSavedFeatureAnywhereLoader();

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

  // Handle all changes in the assoicated detectors such as unlinking or new detectors associated
  useEffect(() => {
    // Gets all augmented saved objects for the given visualization
    getAugmentVisSavedObjs(
      associateExistingProps.embeddableVisId,
      savedObjectLoader,
      uiSettings
    ).then((savedAugmentObjectsArr: any) => {
      if (savedAugmentObjectsArr != undefined) {
        const curDetectorsToDisplayOnList =
          getExistingDetectorsAvailableToAssociate(
            Object.values(allDetectors),
            savedAugmentObjectsArr
          );
        setExistingDetectorsAvailableToAssociate(curDetectorsToDisplayOnList);
        setIsLoadingFinalDetectors(false);
      }
    });
  }, [allDetectors]);

  // cross checks all the detectors that exist with all the savedAugment Objects to only display ones
  // that are associated to the current visualization
  const getExistingDetectorsAvailableToAssociate = (
    detectors: DetectorListItem[],
    savedAugmentForThisVisualization: ISavedAugmentVis[]
  ) => {
    // Map all detector IDs for all the found augmented vis objects
    const savedAugmentDetectorsSet = new Set(
      savedAugmentForThisVisualization.map((savedObject) =>
        get(savedObject, 'pluginResource.id', '')
      )
    );

    // detectors here is all detectors
    // for each detector in all detectors return that detector if that detector ID isnt in the set
    // filter out any detectors that aren't on the set of detectors IDs from the augmented vis objects.
    const detectorsToDisplay = detectors.filter((detector) => {
      if (
        !savedAugmentDetectorsSet.has(detector.id) &&
        detector.detectorType === 'SINGLE_ENTITY'
      ) {
        return detector;
      }
    });
    return detectorsToDisplay;
  };

  useEffect(() => {
    getDetectors();
  }, []);

  const getDetectors = async () => {
    dispatch(getDetectorList(GET_ALL_DETECTORS_QUERY_PARAMS));
  };

  const selectedOptions = useMemo(() => {
    if (
      !existingDetectorsAvailableToAssociate ||
      !associateExistingProps.selectedDetector
    ) {
      return [];
    }

    const detector = (existingDetectorsAvailableToAssociate || []).find(
      (detector) =>
        detector.id === get(associateExistingProps.selectedDetector, 'id', '')
    );
    return detector ? [{ label: detector.name }] : [];
  }, [
    associateExistingProps.selectedDetector,
    existingDetectorsAvailableToAssociate,
  ]);

  const detector = associateExistingProps.selectedDetector;

  const options = useMemo(() => {
    if (!existingDetectorsAvailableToAssociate) {
      return [];
    }

    return existingDetectorsAvailableToAssociate.map((detector) => ({
      label: detector.name,
    }));
  }, [existingDetectorsAvailableToAssociate]);

  return (
    <div className="associate-existing">
      <EuiText size="xs">
        <p>
          View existing anomaly detectors across your system and add the
          detector(s) to a dashboard and visualization.{' '}
          <a href={`${BASE_DOCS_LINK}/ad`} target="_blank">
            Learn more <EuiIcon type="popout" />
          </a>
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiTitle size="s">
        <h3>Select detector to associate</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued" style={{ paddingBottom: '3px' }}>
        Eligible detectors don't include high-cardinality detectors.
      </EuiText>
      {existingDetectorsAvailableToAssociate ? (
        <EuiComboBox
          isLoading={isLoading}
          id="associate-existing__select"
          options={options}
          selectedOptions={selectedOptions}
          onChange={(selectedOptions) => {
            let detector = undefined as DetectorListItem | undefined;

            if (selectedOptions && selectedOptions.length) {
              const match = existingDetectorsAvailableToAssociate.find(
                (detector) => detector.name === selectedOptions[0].label
              );
              detector = match;
            }
            associateExistingProps.setSelectedDetector(detector);
          }}
          aria-label="Select an anomaly detector to associate"
          isClearable
          singleSelection
          placeholder="Search for an anomaly detector"
        />
      ) : (
        <EuiLoadingSpinner size="l" />
      )}
      <EuiSpacer size="xl" />
      {detector && (
        <>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
            <EuiFlexItem>
              <EuiText>
                <h4>{detector.name}</h4>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiHealth color={stateToColorMap.get(detector.curState)}>
                Running since {renderTime(detector.enabledTime)}
              </EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink href={`${PLUGIN_NAME}#/detectors/${detector.id}`}>
                View detector page
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          <ul className="associate-existing__detector-details">
            {[
              ['Indices', (detector) => detector.indices],
              [
                'Anomalies last 24 hours',
                (detector) => detector.totalAnomalies,
              ],
              [
                'Last real-time occurrence',
                (detector) => renderTime(detector.lastActiveAnomaly),
              ],
            ].map(([label, getValue]) => (
              <li key={label}>
                <EuiText>
                  <strong>{label}</strong>: {getValue(detector)}
                </EuiText>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default AssociateExisting;
