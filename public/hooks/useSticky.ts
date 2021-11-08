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


import { useState, useEffect, useRef } from 'react';

export const useSticky = (ref: any, offset: number): boolean => {
  const [isSticky, setSticky] = useState(false);
  const previousState = useRef<boolean>(false);
  let timeout = 0;
  useEffect(() => {
    previousState.current = isSticky;
  });
  useEffect(() => {
    window.addEventListener('scroll', () => {
      if (timeout) {
        window.cancelAnimationFrame(timeout);
      }
      timeout = window.requestAnimationFrame(handleScroll);
    });
    return () => {
      window.cancelAnimationFrame(timeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  const handleScroll = () => {
    const currentSticky =
      ref &&
      ref.current &&
      ref.current.getBoundingClientRect().top + offset - window.pageYOffset <=
        0;
    if (ref.current && previousState.current !== currentSticky) {
      setSticky(currentSticky);
    }
  };

  return isSticky;
};
