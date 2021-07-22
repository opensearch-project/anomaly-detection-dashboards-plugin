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

/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import React, { ReactElement, ReactNode } from 'react';
import { EuiFormRow, EuiText, EuiLink, EuiIcon } from '@elastic/eui';

type FormattedFormRowProps = {
  title?: string;
  formattedTitle?: ReactNode;
  children: ReactElement;
  hint?: string | string[];
  isInvalid?: boolean;
  error?: ReactNode | ReactNode[];
  fullWidth?: boolean;
  helpText?: string;
  hintLink?: string;
};

export const FormattedFormRow = (props: FormattedFormRowProps) => {
  let hints;
  if (props.hint) {
    const hintTexts = Array.isArray(props.hint) ? props.hint : [props.hint];
    hints = hintTexts.map((hint, i) => {
      return (
        <EuiText key={i} className="sublabel" style={{ maxWidth: '400px' }}>
          {hint}
          {props.hintLink ? ' ' : null}
          {props.hintLink ? (
            <EuiLink href={props.hintLink} target="_blank">
              Learn more <EuiIcon size="s" type="popout" />
            </EuiLink>
          ) : null}
        </EuiText>
      );
    });
  }

  const { formattedTitle, ...euiFormRowProps } = props;

  return (
    <EuiFormRow
      label={
        <div style={{ lineHeight: '8px' }}>
          {formattedTitle ? formattedTitle : <p>{props.title}</p>}
          <br />
          {hints}
        </div>
      }
      {...euiFormRowProps}
    >
      {props.children}
    </EuiFormRow>
  );
};
