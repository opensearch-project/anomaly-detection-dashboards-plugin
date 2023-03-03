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
  EuiFlexGroup
} from '@elastic/eui';

const ShingleSize = () => {

  return (
    <>
      <EuiPanel>
        <p>
          <small>
            Set the number of intervals to consider in a detection window for your model. 
            The anomaly detector expects the shingle size to be in the range of 1 and 60.
            The default shingle size is 8. We recommend that you don't choose 1 unless you have 
            two or more features. Smaller values might increase recall but also false positives.
            Larger values might be useful for ignoring noise in a signal. 
          </small>
        </p>
        <EuiFormRow label='Shingle size'>
          <EuiFieldText/>
        </EuiFormRow>
      </EuiPanel>
     
    </>
  );
}

export default ShingleSize;
