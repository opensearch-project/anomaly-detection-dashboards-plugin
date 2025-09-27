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
  EuiCompressedFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { Field, FieldProps, useFormikContext } from 'formik';
import React, { Fragment } from 'react';
import {
  isInvalid,
  getError,
  validatePositiveInteger,
  validateMultipleOf,
  validateEmptyOrPositiveInteger,
  validateEmptyOrNonNegativeInteger,
} from '../../../../utils/utils';
import { AD_DOCS_LINK } from '../../../../utils/constants';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';

export const Settings = () => {
  const formik = useFormikContext();
  const numberFieldWidth = 140;

  // Custom validation function that has access to form values
  const validateFrequency = (value: any) => {
    return validateMultipleOf(value, formik.values.interval);
  };

  return (
    <Fragment>
      <Field name="interval" validate={validatePositiveInteger}>
        {({ field, form }: FieldProps) => {
          // Keep frequency in sync when the interval changes (only when they started equal).
          // This reduces UX friction for users who don't care to tweak frequency while editing interval.
          const handleIntervalChange = (
            event: React.ChangeEvent<HTMLInputElement>
          ) => {
            const raw = event.target.value;
            const nextInterval = raw === '' ? '' : Number(raw);

            // remember the values before we mutate anything
            const prevInterval = field.value;
            const prevFrequency = form.values.frequency;

            // push the new interval into Formik
            form.setFieldValue(field.name, nextInterval);

            // if frequency was just mirroring interval, keep it in lockstep
            const prevIntervalNumber = Number(prevInterval);
            const prevFrequencyNumber = Number(prevFrequency);
            const wasSynced =
              !Number.isNaN(prevIntervalNumber) &&
              prevIntervalNumber === prevFrequencyNumber;

            if (wasSynced) {
              form.setFieldValue('frequency', nextInterval);
            }
          };

          return (
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: '70%' }}>
                <FormattedFormRow
                  fullWidth
                  title="Interval"
                  hint={[
                    `Interval sets the time window for summarizing and modeling data (e.g., 5 min to 1 hr), where too small creates noise, higher cost, and overreaction to fluctuations, while too large smooths out anomalies and delays detection.`,
                  ]}
                  hintLink={`${AD_DOCS_LINK}`}
                  isInvalid={isInvalid(field.name, form)}
                  error={getError(field.name, form)}
                >
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiCompressedFieldNumber
                        name="detectionInterval"
                        id="detectionInterval"
                        placeholder="Interval"
                        data-test-subj="detectionInterval"
                        min={1}
                        style={{ width: numberFieldWidth }}
                        {...field}
                        onChange={handleIntervalChange}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText>
                        <p className="minutes">minutes</p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </FormattedFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
      </Field>

      <Field name="frequency" validate={validateFrequency}>
        {({ field, form }: FieldProps) => (
          <EuiFlexGroup style={{ marginTop: '16px' }}>
            <EuiFlexItem style={{ maxWidth: '70%' }}>
              <FormattedFormRow
                fullWidth
                title="Frequency"
                hint={[
                  `Frequency sets how often the detector queries and scores data—i.e., how often alerts may fire. It must be a multiple of the interval and defaults to the same value. Choosing a longer frequency than the interval can improve efficiency by batching short intervals when ultra-fast alerting isn’t required (e.g., monitoring daily counts of anomalies across detectors) and is also useful for infrequent or batch log ingestion where data arrives irregularly or in bulk (e.g., a single daily ingestion spanning the entire day).`,
                ]}
                hintLink={`${AD_DOCS_LINK}`}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiCompressedFieldNumber
                      name="frequency"
                      id="frequency"
                      placeholder="Frequency"
                      data-test-subj="frequency"
                      min={1}
                      style={{ width: numberFieldWidth }}
                      {...field}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText>
                      <p className="minutes">minutes</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormattedFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </Field>

      <Field name="windowDelay" validate={validateEmptyOrNonNegativeInteger}>
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            fullWidth
            title="Window delay"
            hint="Specify a window of delay for a detector to fetch data, if you need to account for extra processing time."
            hintLink={`${AD_DOCS_LINK}`}
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
            style={{ marginTop: '16px' }}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiCompressedFieldNumber
                  name="windowDelay"
                  id="windowDelay"
                  placeholder="Window delay"
                  data-test-subj="windowDelay"
                  style={{ width: numberFieldWidth }}
                  {...field}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <p className="minutes">minutes</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </FormattedFormRow>
        )}
      </Field>

      <Field name="history" validate={validateEmptyOrPositiveInteger}>
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            fullWidth
            title="History"
            hint="How far back the model looks for training data. This determines the amount of historical data used to train the anomaly detection model. Minimum history is 40 intervals, maximum is 10,000 intervals, and the default is 40."
            hintLink={`${AD_DOCS_LINK}`}
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
            style={{ marginTop: '16px' }}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiCompressedFieldNumber
                  name="history"
                  id="history"
                  placeholder="History"
                  data-test-subj="history"
                  min={40}
                  max={10000}
                  style={{ width: numberFieldWidth }}
                  {...field}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <p className="minutes">intervals</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </FormattedFormRow>
        )}
      </Field>
    </Fragment>
  );
};
