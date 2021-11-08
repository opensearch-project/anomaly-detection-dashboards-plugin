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
