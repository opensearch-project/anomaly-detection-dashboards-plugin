import React, { useState } from 'react';
import './styles.scss';
import AssociatedDetectors from '../AssociatedDetectors/containers/AssociatedDetectors';

const Container = ({ startingFlyout, ...props }) => {
  const { embeddable } = props;
  const index = [{ label: embeddable?.vis?.data?.indexPattern?.title }];
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
        index,
        selectedDetectorId,
        setSelectedDetectorId,
      }}
    />
  );
};

export default Container;
