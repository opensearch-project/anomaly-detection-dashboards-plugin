import React, { useState } from 'react';
import './styles.scss';
import AddAnomalyDetector from '../CreateAnomalyDetector';

const Container = ({ startingFlyout, ...props }) => {
  const { embeddable } = props;
  console.log({ embeddable });
  const index = [{ label: embeddable?.vis?.data?.indexPattern?.title }];
  const [mode, setMode] = useState(startingFlyout);

  const Flyout = {
    create: AddAnomalyDetector,
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
