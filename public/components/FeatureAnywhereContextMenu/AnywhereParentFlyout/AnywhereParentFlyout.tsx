import React, { useState } from 'react';
import './styles.scss';
import { get } from 'lodash';
import AddAnomalyDetector from '../CreateAnomalyDetector';

const AnywhereParentFlyout = ({ startingFlyout, ...props }) => {
  const { embeddable } = props;
  const indices: { label: string }[] = [
    { label: get(embeddable, 'vis.data.indexPattern.title', '') },
  ];
  const [mode, setMode] = useState(startingFlyout);
  const [selectedDetectorId, setSelectedDetectorId] = useState();

  const Flyout = {
    create: AddAnomalyDetector,
  }[mode];

  return (
    <Flyout
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