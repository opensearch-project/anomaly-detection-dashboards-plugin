/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { get } from 'lodash';
import AssociatedDetectors from '../AssociatedDetectors/containers/AssociatedDetectors';
import { getEmbeddable } from '../../../../public/services';
import AddAnomalyDetector from '../CreateAnomalyDetector';
import { FLYOUT_MODES } from './constants';

const AnywhereParentFlyout = ({ startingFlyout, ...props }) => {
  const embeddable = getEmbeddable().getEmbeddableFactory;
  const indices: { label: string }[] = [
    { label: get(embeddable, 'vis.data.indexPattern.title', '') },
  ];

  const [mode, setMode] = useState(startingFlyout);
  const [selectedDetector, setSelectedDetector] = useState(undefined);

  const AnywhereFlyout = {
    [FLYOUT_MODES.create]: AddAnomalyDetector,
    [FLYOUT_MODES.associated]: AssociatedDetectors,
    [FLYOUT_MODES.existing]: AddAnomalyDetector,
  }[mode];

  return (
    <AnywhereFlyout
      {...{
        ...props,
        setMode,
        mode,
        indices,
        selectedDetector,
        setSelectedDetector,
      }}
    />
  );
};

export default AnywhereParentFlyout;
