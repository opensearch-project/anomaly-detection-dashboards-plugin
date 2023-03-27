import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiIcon,
  EuiAccordion,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiCheckbox,
} from '@elastic/eui';
const DetectorDetails = () => {
  const intervalOptions = [
    { value: 'option_one', text: '10 minutes' },
    { value: 'option_two', text: '1 minutes' },
    { value: 'option_three', text: '5 minutes' },
  ];
  const [intervalValue, setIntervalalue] = useState(intervalOptions[0].value);
  const intervalOnChange = (e) => {
    setIntervalalue(e.target.value);
  };

  const delayOptions = [
    { value: 'option_one', text: '10 minutes' },
    { value: 'option_two', text: '1 minutes' },
    { value: 'option_three', text: '5 minutes' },
  ];
  const [delayValue, setDelayValue] = useState(delayOptions[0].value);
  const delayOnChange = (e) => {
    setDelayValue(e.target.value);
  };

  const [checked, setChecked] = useState(false);
  const onCustomerResultIndexCheckboxChange = (e) => {
    setChecked(e.target.checked);
  };

  return (
    <>
      <EuiPanel>
        <EuiFormRow label="Detector name">
          <EuiFieldText value="detector_name" />
        </EuiFormRow>
        <EuiFormRow label="Detector description">
          <EuiFieldText />
        </EuiFormRow>
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel>
        <EuiFormRow label="Detector interval">
          <EuiSelect
            id="detectorIntervalSelection"
            options={intervalOptions}
            value={intervalValue}
            onChange={(e) => intervalOnChange(e)}
          />
        </EuiFormRow>
        <EuiFormRow label="Window delay">
          <EuiSelect
            id="windowDelaySelection"
            options={delayOptions}
            value={delayValue}
            onChange={(e) => delayOnChange(e)}
          />
        </EuiFormRow>
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel>
        <EuiCheckbox
          id="customerResultIndexCheckbox"
          label="Enable custom result index"
          checked={checked}
          onChange={(e) => onCustomerResultIndexCheckboxChange(e)}
        />
      </EuiPanel>
    </>
  );
};

export default DetectorDetails;
