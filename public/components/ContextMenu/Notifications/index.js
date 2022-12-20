import React from 'react';
import { EuiLink, EuiText, EuiSpacer, EuiPanel, EuiIcon, EuiFormRow } from '@elastic/eui';

export const Notifications = () => (
  <>
    <EuiFormRow label="Notifications">
      <EuiPanel color="subdued" hasBorder={false} hasShadow={false}>
        <EuiText size="xs">
          The anomalies will appear on the visualization when the anomaly grade is above 0.7 and anomaly confidence is below 0.7. 
          Additional notification can be configured. 
        </EuiText>
      </EuiPanel>
    </EuiFormRow>
    <EuiSpacer size="s" />
    <EuiPanel color="subdued" hasBorder={false} hasShadow={false}>
      <EuiText size="s">
        <EuiLink href="#">
          <EuiIcon type="plusInCircle" /> Add notifications
        </EuiLink>
      </EuiText>
    </EuiPanel>
  </>
);