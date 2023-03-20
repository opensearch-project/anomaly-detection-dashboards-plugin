import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiHorizontalRule,
  EuiTextColor,
  EuiPanel,
  EuiIcon,
  EuiAccordion,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';

const Features = () => {
  const aggMethodOptions = [
    { value: 'avg', text: 'AVG' },
    { value: 'sum', text: 'SUM' },
  ];
  const [aggMethodValue, setAggMethodValue] = useState(
    aggMethodOptions[0].value
  );
  const aggMethodOnChange = (e) => {
    setAggMethodValue(e.target.value);
  };

  return (
    <>
      <EuiPanel>
        <EuiFormRow label="feature_name_1">
          <EuiFlexGroup alignItems={'flexStart'} gutterSize={'m'}>
            <EuiFlexItem grow={1}>
              <small>Find anomalies based on</small>

              <EuiFieldText value="field value" />
            </EuiFlexItem>

            <EuiFlexItem grow={1}>
              <small>Aggregation method</small>
              <EuiSelect
                id="aggreationMethod"
                options={aggMethodOptions}
                value={aggMethodValue}
                onChange={(e) => aggMethodOnChange(e)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiHorizontalRule margin="s" />
        <EuiFormRow label="feature_name_2">
          <EuiFlexGroup alignItems={'flexStart'} gutterSize={'m'}>
            <EuiFlexItem grow={1}>
              <small>Find anomalies based on</small>

              <EuiFieldText value="field value" />
            </EuiFlexItem>

            <EuiFlexItem grow={1}>
              <small>Aggregation method</small>
              <EuiSelect
                id="aggreationMethod"
                options={aggMethodOptions}
                value={aggMethodValue}
                onChange={(e) => aggMethodOnChange(e)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        {/* <EuiFormRow>
          <EuiIcon type="alert" />
            <p><EuiTextColor color="danger">Selected aggration method is incompatible</EuiTextColor></p>
        </EuiFormRow> */}
      </EuiPanel>
    </>
  );
};

export default Features;
