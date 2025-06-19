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

import { useEffect, useState } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiText,
  EuiTitle,
  EuiCompressedFieldNumber,
  EuiSpacer,
  EuiCompressedSelect,
  EuiSmallButtonIcon,
  EuiCompressedFieldText,
  EuiToolTip,
  EuiIcon,
  EuiBadge,
} from '@elastic/eui';
import { Field, FieldProps, FieldArray } from 'formik';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import {
  FORECASTER_DOCS_LINK,
  FIELD_MAX_WIDTH,
  INPUT_SLIDER_WIDTH,
} from '../../../../utils/constants';
import {
  isInvalid,
  getError,
  validatePositiveInteger,
  validatePositiveDecimal,
  validateEmptyOrPositiveInteger,
} from '../../../../utils/utils';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { SparseDataOptionValue } from '../../utils/constants';
import '../../index.scss';
import React, { ReactElement } from 'react';
import { toNumberOrEmpty } from '../../utils/helpers';

interface AdvancedSettingsProps {
  isEditable?: boolean;
}

export function AdvancedSettings({ isEditable = true }: AdvancedSettingsProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  return (
    <ContentPanel
      title={
        <EuiFlexGroup direction="row" style={{ margin: '0px' }} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={showAdvancedSettings ? 'arrowDown' : 'arrowRight'}
              onClick={() => {
                setShowAdvancedSettings(!showAdvancedSettings);
              }}
              style={{ cursor: isEditable ? 'pointer' : 'not-allowed' }}
            />
          </EuiFlexItem>
          <EuiTitle size="s">
            <h2>Advanced model parameters</h2>
          </EuiTitle>
        </EuiFlexGroup>
      }
      hideBody={!showAdvancedSettings}
      bodyStyles={{ marginTop: '-16px' }}
    >
      {showAdvancedSettings ? <EuiSpacer size="m" /> : null}
      {showAdvancedSettings ? (
        <>
          {/* --------------------- Shingle size --------------------- */}
          <Field name="shingleSize" validate={validateEmptyOrPositiveInteger}>
            {({ field, form }: FieldProps) => (
              <FormattedFormRow
                fullWidth
                title="Shingle size"
                hint={[
                  `Set the number of past forecast intervals that strongly
                  influence the next forecast. The forecaster expects the
                  shingle size to be in the range of 4 and 128. Related to seasonality.
                  Use a smaller value when your data changes quickly or lacks
                  strong cyclical patterns. Use a larger value when your data
                  exhibits longer or more pronounced seasonal cycles.
                  When adjusting default shingle size, consider generating
                  a recommended horizon based on that shingle size.
                  The forecaster expects the shingle size to be in the range of 4 and 128.
                  The default shingle size is 8.`,
                ]}
                hintLink={FORECASTER_DOCS_LINK}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                {/* Wrap the number input + badge in a single FlexGroup */}
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="center"
                  style={{ maxWidth: FIELD_MAX_WIDTH }}
                >
                  <EuiFlexItem grow={false}>
                    <div style={{ width: INPUT_SLIDER_WIDTH }}>
                      <EuiCompressedFieldNumber
                        id="shingleSize"
                        placeholder="Shingle size"
                        data-test-subj="shingleSize"
                        min={4}
                        max={128}
                        style={{ width: '100%' }}
                        name={field.name}
                        value={field.value || ''}
                        disabled={!isEditable}
                        onChange={(e) => {
                          form.setFieldValue(field.name, toNumberOrEmpty(e.target.value));
                        }}
                      />
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default" className="unit-badge">
                      intervals
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormattedFormRow>
            )}
          </Field>

          {/* ----------------- Suggested seasonality ----------------- */}
          <Field name="suggestedSeasonality" validate={validateEmptyOrPositiveInteger}>
            {({ field, form }: FieldProps) => (
              <FormattedFormRow
                fullWidth
                title="Suggested seasonality"
                hint={[
                  `The consistent seasonal variation of the data (in intervals).
                  The forecaster expects the suggested seasonality to be in the range of 8 and 256.`,
                ]}
                hintLink={FORECASTER_DOCS_LINK}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="center"
                  style={{ maxWidth: FIELD_MAX_WIDTH }}
                >
                  <EuiFlexItem grow={false}>
                    <div style={{ width: INPUT_SLIDER_WIDTH }}>
                      <EuiCompressedFieldNumber
                        id="suggestedSeasonality"
                        data-test-subj="suggestedSeasonality"
                        min={8}
                        max={256}
                        style={{ width: '100%' }}
                        name={field.name}
                        value={field.value || ''}
                        disabled={!isEditable}
                        onChange={(e) => {
                          form.setFieldValue(field.name, toNumberOrEmpty(e.target.value));
                        }}
                      />
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default" className="unit-badge">
                      intervals
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormattedFormRow>
            )}
          </Field>

          {/* ------------------- Recency emphasis ------------------- */}
          <Field name="recencyEmphasis" validate={validateEmptyOrPositiveInteger}>
            {({ field, form }: FieldProps) => (
              <FormattedFormRow
                fullWidth
                title="Recency emphasis"
                // In JSX, whitespace between elements is ignored, so we need to explicitly add spaces
                // using {' '} to ensure proper spacing between text and code elements
                hint={[
                  <span key="recencyHintText">
                    <strong>Recency emphasis</strong> is like the "window size" in a classic
                    moving average, except that it <em>gradually</em> stops considering older
                    data rather than dropping it all at once. In a fixed moving average of
                    size{' '}<code>W</code>, each data point stays in the sample for exactly
                    {' '}<code>W</code> steps, then is removed entirely. By contrast, a higher 
                    recency emphasis <em>on average</em> retains a data point in the sample 
                    for more steps, but with an <strong>exponential decay</strong>—recent data 
                    gets the most weight, and older data slowly fades rather than abruptly 
                    dropping.
                    <br />
                    <br />
                    Mathematically, the "lifetime" of each data point (how many steps it stays
                    influential) follows an approximate exponential distribution. The
                    <em>recency emphasis</em> value is the mean of that distribution, i.e., the
                    average number of steps a point remains in the sample. A bigger emphasis
                    makes forecasts react more slowly to recent changes (like having a larger
                    window size), while a smaller emphasis adapts faster but risks overreacting
                    to short-term noise. The default is <strong>2560</strong>, and you must have
                    at least <strong>1</strong>.
                  </span>,
                ]}
                hintLink={FORECASTER_DOCS_LINK}
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="center"
                  style={{ maxWidth: FIELD_MAX_WIDTH }}
                >
                  <EuiFlexItem grow={false}>
                    <div style={{ width: INPUT_SLIDER_WIDTH }}>
                      <EuiCompressedFieldNumber
                        id="recencyEmphasis"
                        data-test-subj="recencyEmphasis"
                        min={1}
                        style={{ width: '100%' }}
                        name={field.name}
                        value={field.value || ''}
                        disabled={!isEditable}
                        onChange={(e) => {
                          form.setFieldValue(field.name, toNumberOrEmpty(e.target.value));
                        }}
                      />
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default" className="unit-badge">
                      intervals
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </FormattedFormRow>
            )}
          </Field>

        </>
      ) : null}
    </ContentPanel>
  );
}
