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

import React, { useState } from 'react';
import { get } from 'lodash';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiOverlayMask
} from '@elastic/eui';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { SuppressionRulesModal } from './SuppressionRulesModal';

interface AdditionalSettingsProps {
  shingleSize: number;
  categoryField: string[];
  imputationMethod: string;
  customValues: string[];
  suppressionRules: string[];
}

export function AdditionalSettings(props: AdditionalSettingsProps) {
  const renderCustomValues = (customValues: string[]) => (
    <div>
      {customValues.length > 0 ? (
        customValues.map((value, index) => <p key={index}>{value}</p>)
      ) : (
        <p>-</p>
      )}
    </div>
  );

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<string[]>([]);

  const closeModal = () => setIsModalVisible(false);

  const showRulesInModal = (rules: string[]) => {
    setModalContent(rules);
    setIsModalVisible(true);
  };

  const renderSuppressionRules = (suppressionRules: string[]) => (
    <div>
      {suppressionRules.length > 0 ? (
        <EuiButtonEmpty size="s" onClick={() => showRulesInModal(suppressionRules)}>
          {suppressionRules.length} rules
        </EuiButtonEmpty>
      ) : (
        <p>-</p>
      )}
    </div>
  );

  const tableItems = [
    {
      categoryField: get(props, 'categoryField.0', '-'),
      shingleSize: props.shingleSize,
      imputationMethod: props.imputationMethod,
      customValues: props.customValues,
      suppresionRules: props.suppressionRules,
    },
  ];
  const tableColumns = [
    { name: 'Category field', field: 'categoryField' },
    { name: 'Shingle size', field: 'shingleSize' },
    { name: 'Imputation method', field: 'imputationMethod' },
    { name: 'Custom values',
      field: 'customValues',
      render: (customValues: string[]) => renderCustomValues(customValues), // Use a custom render function
    },
    { name: 'Suppression rules',
      field: 'suppresionRules',
      render: (suppressionRules: string[]) => renderSuppressionRules(suppressionRules), // Use a custom render function
    },
  ];
  return (
    <ContentPanel title="Additional settings" titleSize="s">
    <EuiBasicTable
      className="header-single-value-euiBasicTable"
      items={tableItems}
      columns={tableColumns}
    />
    {isModalVisible && (
        <EuiOverlayMask>
          <SuppressionRulesModal onClose={closeModal} rules={modalContent} />
        </EuiOverlayMask>
      )}
    </ContentPanel>
  );
}
