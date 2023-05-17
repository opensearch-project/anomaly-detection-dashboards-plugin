/* 
 * Copyright OpenSearch Contributors 
 * SPDX-License-Identifier: Apache-2.0 
 */
import React, { useState } from 'react';
import { get } from 'lodash';
import AddAnomalyDetector from '../CreateAnomalyDetector';

const AnywhereParentFlyout = ({ startingFlyout, ...props }) => {
  const { embeddable } = props;
  const indices: { label: string }[] = [
    { label: get(embeddable, 'vis.data.indexPattern.title', '') },
  ];
  const [mode, setMode] = useState(startingFlyout);
  const [selectedDetectorId, setSelectedDetectorId] = useState();

  const AnywhereFlyout = {
    create: AddAnomalyDetector,
  }[mode];

  return (
    <AnywhereFlyout
      {...{
        ...props,
        setMode,
        mode,
        indices,
        selectedDetectorId,
        setSelectedDetectorId,
      }}
  />
  );
};

export default AnywhereParentFlyout;