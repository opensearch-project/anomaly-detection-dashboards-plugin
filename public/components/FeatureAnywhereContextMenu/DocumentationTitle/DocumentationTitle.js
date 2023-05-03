/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiIcon, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@osd/i18n';

const DocumentationTitle = () => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <span data-ui="documentation-title-text">
        {i18n.translate(
          'dashboard.actions.adMenuItem.documentation.displayName',
          {
            defaultMessage: 'Documentation',
          }
        )}
      </span>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="popout" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export default DocumentationTitle;
