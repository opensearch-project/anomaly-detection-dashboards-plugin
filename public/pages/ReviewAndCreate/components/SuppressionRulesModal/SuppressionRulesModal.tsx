import React from 'react';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle, EuiText, EuiSpacer } from '@elastic/eui';

interface SuppressionRulesModalProps {
  rules: string[];
  onClose: () => void;
}

export const SuppressionRulesModal: React.FC<SuppressionRulesModalProps> = ({ rules, onClose }) => {
  return (
    <EuiModal onClose={onClose} style={{ maxWidth: 600 }} role="dialog">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h2>Suppression Rules</h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          {rules.map((rule, index) => (
            <EuiText key={index} size="s">
              {rule}
            </EuiText>
          ))}
        </EuiText>
        <EuiSpacer size="m" />
      </EuiModalBody>
    </EuiModal>
  );
};
