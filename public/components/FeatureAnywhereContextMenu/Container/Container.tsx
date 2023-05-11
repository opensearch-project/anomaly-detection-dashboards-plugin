import React, { useState } from 'react';
import './styles.scss';
import AssociatedDetectors from '../AssociatedDetectors/containers/AssociatedDetectors';
import { get } from 'lodash';

const Container = ({ startingFlyout, ...props }) => {
  const { embeddable } = props;
  const indices: { label: string }[] = [
    { label: get(embeddable, 'vis.data.indexPattern.title', '') },
  ];
  const [mode, setMode] = useState(startingFlyout);
  const [selectedDetectorId, setSelectedDetectorId] = useState();

  const Flyout = {
    associated: AssociatedDetectors,
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

export default Container;
