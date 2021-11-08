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

import React from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiCodeBlock,
} from '@elastic/eui';

interface CodeModalProps {
  code: string;
  title: string;
  subtitle?: string;
  closeModal: () => void;
}

export const CodeModal = (props: CodeModalProps) => {
  return (
    <EuiOverlayMask>
      <EuiModal onClose={props.closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <div>
              <p>{props.title}</p>
              {props.subtitle ? (
                <p className="modelSubtitle">{props.subtitle}</p>
              ) : (
                {}
              )}
            </div>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiCodeBlock
            language="json"
            paddingSize="s"
            overflowHeight={300}
            isCopyable
          >
            {props.code}
          </EuiCodeBlock>
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
};
