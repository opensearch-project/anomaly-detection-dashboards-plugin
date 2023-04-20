import React, { useState } from 'react';
import CreateAnomalyDetector from '../CreateAnomalyDetector';
import { useIndex } from '../../../utils/contextMenu/indexes';
import './styles.scss';

const Container = ({ startingFlyout, ...props }) => {
  const { embeddable } = props;
  console.log({ embeddable });
  const index = useIndex(embeddable);
  const [mode, setMode] = useState(startingFlyout);

  const Flyout = {
    create: CreateAnomalyDetector,
  }[mode];

  return (
    <Flyout
      {...{
        ...props,
        setMode,
        mode,
        index,
      }}
    />
  );
};

export default Container;
