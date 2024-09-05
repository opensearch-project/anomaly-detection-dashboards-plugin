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

import { get, isEmpty } from 'lodash';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Detector } from '../../../models/interfaces';
import { AppState } from '../../../redux/reducers';
import { getDetector } from '../../../redux/reducers/ad';
import { getMappings } from '../../../redux/reducers/opensearch';

// A hook which gets required info in order to display a detector on OpenSearch Dashboards.
// 1. Get detector
// 2. Gets index mapping
export const useFetchDetectorInfo = (
  detectorId: string,
  dataSourceId: string
): {
  detector: Detector;
  hasError: boolean;
  isLoadingDetector: boolean;
  errorMessage: string;
} => {
  const dispatch = useDispatch();
  const detector = useSelector(
    (state: AppState) => state.ad.detectors[detectorId]
  );
  const hasError = useSelector((state: AppState) => state.ad.errorMessage);
  const isDetectorRequesting = useSelector(
    (state: AppState) => state.ad.requesting
  );
  const isIndicesRequesting = useSelector(
    (state: AppState) => state.opensearch.requesting
  );
  const selectedIndices = useMemo(() => get(detector, 'indices', []), [detector]);
  useEffect(() => {
    const fetchDetector = async () => {
      if (!detector) {
        await dispatch(getDetector(detectorId, dataSourceId));
      }
      if (selectedIndices && selectedIndices.length > 0) {
        await dispatch(getMappings(selectedIndices, dataSourceId));
      }
    };
    if (detectorId) {
      fetchDetector();
    }
  }, [detectorId, selectedIndices]);
  return {
    detector: detector || {},
    hasError: !isEmpty(hasError) && isEmpty(detector),
    isLoadingDetector: isDetectorRequesting || isIndicesRequesting,
    errorMessage: hasError,
  };
};
