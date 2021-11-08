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

//@ts-ignore
import { EuiHealth, EuiHighlight } from '@elastic/eui';
import React from 'react';
import {
  customSuccessColor,
  customWarningColor,
  customDangerColor,
  customSubduedColor,
} from '../../../utils/constants';

type IndexOptionProps = {
  option: any;
  searchValue: string;
  contentClassName: string;
};

const healthToColor = {
  green: customSuccessColor,
  yellow: customWarningColor,
  red: customDangerColor,
  undefined: customSubduedColor,
} as { [key: string]: string };

function IndexOption({
  option,
  searchValue,
  contentClassName,
}: IndexOptionProps) {
  const { health, label, index } = option;
  const isAlias = !!index;

  const color = healthToColor[health];
  return (
    <EuiHealth color={color}>
      <span className={contentClassName}>
        <EuiHighlight search={searchValue}>{label}</EuiHighlight>
        {isAlias && (
          <span>
            &nbsp;(
            {index})
          </span>
        )}
      </span>
    </EuiHealth>
  );
}

export { IndexOption };
