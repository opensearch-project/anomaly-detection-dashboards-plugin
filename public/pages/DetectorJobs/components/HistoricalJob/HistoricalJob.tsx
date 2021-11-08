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
  EuiFlexGroup,
  EuiCheckbox,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { Field, FieldProps, FormikProps } from 'formik';
import { get } from 'lodash';
import React, { useState } from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { DetectorJobsFormikValues } from '../../models/interfaces';
import { HISTORICAL_DATE_RANGE_COMMON_OPTIONS } from '../../utils/constants';
import { BASE_DOCS_LINK } from '../../../../utils/constants';
import {
  isInvalid,
  getError,
  convertTimestampToString,
} from '../../../../utils/utils';

interface HistoricalJobProps {
  formikProps: FormikProps<DetectorJobsFormikValues>;
  setHistorical(historical: boolean): void;
}
export function HistoricalJob(props: HistoricalJobProps) {
  const [enabled, setEnabled] = useState<boolean>(
    get(props, 'formikProps.values.historical', true)
  );

  return (
    <ContentPanel
      title="Historical analysis detection"
      titleSize="s"
      subTitle={
        <EuiText
          className="content-panel-subTitle"
          style={{ lineHeight: 'normal' }}
        >
          Historical analysis detection lets you analyze and apply machine
          learning models over long historical data windows (weeks or months).
          You can identify anomaly patterns, seasonality, and trends.{' '}
          <EuiLink href={`${BASE_DOCS_LINK}/ad`} target="_blank">
            Learn more <EuiIcon size="s" type="popout" />
          </EuiLink>
        </EuiText>
      }
    >
      <Field name="historical">
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiCheckbox
                id={'historicalCheckbox'}
                label="Run historical analysis detection"
                checked={enabled}
                onChange={() => {
                  if (!enabled) {
                    props.setHistorical(true);
                  }
                  if (enabled) {
                    props.setHistorical(false);
                  }
                  setEnabled(!enabled);
                }}
              />
            </EuiFlexItem>
            {enabled ? (
              <EuiFlexItem>
                <FormattedFormRow
                  title="Historical analysis date range"
                  helpText="Select a date range for your historical analysis (you may adjust later)."
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                >
                  <EuiSuperDatePicker
                    //isLoading={props.isLoading}
                    start={convertTimestampToString(form.values.startTime)}
                    end={convertTimestampToString(form.values.endTime)}
                    onTimeChange={({
                      start,
                      end,
                      isInvalid,
                      isQuickSelection,
                    }) => {
                      form.setFieldValue('startTime', start);
                      form.setFieldValue('endTime', end);
                    }}
                    isPaused={true}
                    showUpdateButton={false}
                    commonlyUsedRanges={HISTORICAL_DATE_RANGE_COMMON_OPTIONS}
                  />
                </FormattedFormRow>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        )}
      </Field>
    </ContentPanel>
  );
}
