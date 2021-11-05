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


import { useState, useEffect, useCallback } from 'react';

export const useDelayedLoader = (isLoading: boolean): boolean => {
  const [loaderState, setLoader] = useState(false);
  const [timer, setTimer] = useState(0);

  //Display actually loader latency looks lower
  const handleDisplayLoader = useCallback(() => {
    setLoader(true);
  }, []);

  // Setting up the loader to be visible only when network is too slow
  const handleSetTimer = useCallback(() => {
    const timer = window.setTimeout(handleDisplayLoader, 1000);
    setTimer(timer);
  }, []);

  useEffect(
    () => {
      if (isLoading) {
        handleSetTimer();
      } else {
        clearTimeout(timer);
        setLoader(false);
      }
      //Cleanup incase component unmounts
      return () => {
        clearTimeout(timer);
      };
    },
    [isLoading]
  );
  return loaderState;
};
