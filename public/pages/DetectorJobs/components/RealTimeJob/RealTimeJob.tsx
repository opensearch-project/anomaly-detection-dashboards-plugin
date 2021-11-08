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

import {
  EuiText,
  EuiLink,
  EuiIcon,
  EuiFlexItem,
  EuiCheckbox,
} from '@elastic/eui';
import { Field, FieldProps, FormikProps } from 'formik';
import { get } from 'lodash';
import React, { useState } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { DetectorJobsFormikValues } from '../../models/interfaces';
import { BASE_DOCS_LINK } from '../../../../utils/constants';

interface RealTimeJobProps {
  formikProps: FormikProps<DetectorJobsFormikValues>;
  setRealTime(realTime: boolean): void;
}
export function RealTimeJob(props: RealTimeJobProps) {
  const [enabled, setEnabled] = useState<boolean>(
    get(props, 'formikProps.values.realTime', true)
  );

  return (
    <ContentPanel
      title="Real-time detection"
      titleSize="s"
      subTitle={
        <EuiText
          className="content-panel-subTitle"
          style={{ lineHeight: 'normal' }}
        >
          Real-time detection lets you find anomalies in your data in near
          real-time. To receive accurate and real-time anomalies, the detector
          needs to start and collect sufficient data to include your latest
          changes. The earlier the detector starts running, the sooner the
          real-time anomalies will be available.{' '}
          <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
            Learn more <EuiIcon size="s" type="popout" />
          </EuiLink>
        </EuiText>
      }
    >
      <Field name="realTime" validate={() => {}}>
        {({ field, form }: FieldProps) => (
          <EuiFlexItem>
            <EuiCheckbox
              id={'realTimeCheckbox'}
              label="Start real-time detector automatically (recommended)"
              checked={enabled}
              onChange={() => {
                if (!enabled) {
                  props.setRealTime(true);
                }
                if (enabled) {
                  props.setRealTime(false);
                }
                setEnabled(!enabled);
              }}
            />
          </EuiFlexItem>
        )}
      </Field>
    </ContentPanel>
  );
}
