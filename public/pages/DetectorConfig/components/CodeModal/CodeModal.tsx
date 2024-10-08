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

import React, { Component } from 'react';

import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiCodeBlock,
  EuiText,
} from '@elastic/eui';

interface CodeModalProps {
  code: string;
  title: string;
  subtitle?: string;
  getModalVisibilityChange: () => boolean;
  closeModal: () => void;
}

export class CodeModal extends Component<CodeModalProps, {}> {
  constructor(props: CodeModalProps) {
    super(props);
  }

  render() {
    let modal;

    if (this.props.getModalVisibilityChange()) {
      modal = (
        <EuiOverlayMask>
          <EuiModal onClose={this.props.closeModal}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <div>
                  <EuiText size="s">
                    <h2>{this.props.title}</h2>
                  </EuiText>
                  {this.props.subtitle ? (
                    <p className="modelSubtitle">{this.props.subtitle}</p>
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
                {this.props.code}
              </EuiCodeBlock>
            </EuiModalBody>
          </EuiModal>
        </EuiOverlayMask>
      );
    }
    return <div>{modal}</div>;
  }
}
