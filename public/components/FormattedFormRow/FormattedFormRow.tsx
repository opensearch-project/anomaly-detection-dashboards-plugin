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
import { EuiCompressedFormRow, EuiText, EuiLink, EuiIcon, EuiToolTip } from '@elastic/eui';

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
  linkToolTip?: boolean;
};

export const FormattedFormRow = (props: FormattedFormRowProps) => {
  const hints = props.hint
    ? (Array.isArray(props.hint) ? props.hint : [props.hint]).map((hint, i) => (
        <EuiText key={i} className="sublabel" style={{ maxWidth: '400px' }}>
          {hint}
          {props.hintLink && (
            <>
              {' '}
              <EuiLink href={props.hintLink} target="_blank">
                Learn more
              </EuiLink>
            </>
          )}
        </EuiText>
      ))
    : null;

  const { formattedTitle, ...euiFormRowProps } = props;

  return (
    <EuiCompressedFormRow
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
    </EuiCompressedFormRow>
  );
};
