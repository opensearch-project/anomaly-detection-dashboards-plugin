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

import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Field, FieldProps, FormikProps } from 'formik';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiCompressedFieldNumber,
  EuiRange,
  EuiText,
  EuiPanel,
} from '@elastic/eui';
import {
  isInvalid,
  getError,
  validatePositiveInteger,
  validateNonNegativeInteger,
  validateHistory,
} from '../../../../utils/utils';
import { FORECASTER_DOCS_LINK, FIELD_MAX_WIDTH, INPUT_SLIDER_WIDTH } from '../../../../utils/constants';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import '../../index.scss';
import { toNumberOrEmpty } from '../../utils/helpers';

interface SettingsProps {
  isEditable?: boolean;
}

export const Settings = ({ isEditable = true }: SettingsProps) => {
  return (
    <Fragment>
      {/* FORECASTING INTERVAL */}
      <Field name="interval" validate={validatePositiveInteger}>
        {({ field, form }: FieldProps<number>) => {
          const value = field.value ?? '';
          return (
            <FormattedFormRow
              fullWidth
              title="Forecasting interval"
              hint={['How often the forecast runs to generate next value.']}
              hintLink={FORECASTER_DOCS_LINK}
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
              // FIXME: We are going to lift the 1 hour interval restriction.
              helpText="The interval must be at least one minute."
            >
              <EuiFlexGroup
                gutterSize="none"
                alignItems="center"
                style={{ maxWidth: FIELD_MAX_WIDTH }}
              >
                <EuiFlexItem grow={false}>
                  <div style={{ width: INPUT_SLIDER_WIDTH }}>
                    <EuiCompressedFieldNumber
                      name={field.name}
                      id={field.name}
                      value={value}
                      style={{ width: '100%' }}
                      disabled={!isEditable}
                      onChange={(e) => {
                        form.setFieldValue(field.name, toNumberOrEmpty(e.target.value));
                      }}
                    />
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="default" className="unit-badge">
                    minutes
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </FormattedFormRow>
          );
        }}
      </Field>

      <EuiSpacer size="l" />

      {/* WINDOW DELAY */}
      <Field name="windowDelay" validate={validateNonNegativeInteger}>
        {({ field, form }: FieldProps<number>) => {
          const value = field.value ?? '';
          return (
            <FormattedFormRow
              fullWidth
              title="Window delay"
              hint="Specify a window of delay for a forecaster to fetch data, if you need to account for extra processing time."
              hintLink={FORECASTER_DOCS_LINK}
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
            >
              <EuiFlexGroup
                gutterSize="none"
                alignItems="center"
                style={{ maxWidth: FIELD_MAX_WIDTH }}
              >
                {/* grow={false} in both the numeric field and unitprevents horizontal expansion,
                 keeping the numeric field at its natural width and allows the unit badge to sit directly next to it.
                 Otherwise, there is a gap between the numeric field and the unit badge. */}
                <EuiFlexItem grow={false}>
                  <div style={{ width: INPUT_SLIDER_WIDTH }}>
                    <EuiCompressedFieldNumber
                      name={field.name}
                      id={field.name}
                      value={value}
                      style={{ width: '100%' }}
                      disabled={!isEditable}
                      onChange={(e) => {
                        form.setFieldValue(field.name, toNumberOrEmpty(e.target.value));
                      }}
                    />
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="default" className="unit-badge">
                    minutes
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </FormattedFormRow>
          );
        }}
      </Field>

      <EuiSpacer size="l" />

      <Field name="horizon" validate={validatePositiveInteger}>
        {({ field, form }: FieldProps<number>) => {
          const [showHorizonDetails, setShowHorizonDetails] = useState(false);

          const interval = (form as FormikProps<any>).values.interval;
          const horizon = field.value ?? 0;
          const value = field.value ?? '';

          // Ref to the SLIDER area; if a click happens outside this ref, we close the slider
          const sliderPanelRef = useRef<HTMLDivElement>(null);

          // UseEffect that only attaches the "outside click" listener when the slider is open
          useEffect(() => {
            if (!showHorizonDetails) return;

            function handleOutsideClick(e: MouseEvent) {
              // If the click is not inside sliderPanelRef => close slider
              if (
                sliderPanelRef.current &&
                !sliderPanelRef.current.contains(e.target as Node)
              ) {
                setShowHorizonDetails(false);
              }
            }

            // Note we use capture = true to catch the event early. Could also omit if it works.
            document.addEventListener('mousedown', handleOutsideClick, true);
            return () => {
              document.removeEventListener('mousedown', handleOutsideClick, true);
            };
          }, [showHorizonDetails]);

          // 2) If user moves slider => update field
          function onSliderChange(newVal: number) {
            form.setFieldValue(field.name, newVal);
          }

          // For help text
          function getHorizonHelpText(h: number, i: number) {
            if (!i || !h) return 'A valid horizon is between 1 and 180.';
            const totalMinutes = h * i;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return (
              `${h} intervals = ${hours} hour${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} minute${minutes === 1 ? '' : 's'}` : ''
              } if the forecasting interval is ${i} minutes. A valid horizon is between 1 and 180.`
            );
          }

          return (
            <FormattedFormRow
              fullWidth
              title="Horizon"
              hint={['How far the forecast extends into the future.']}
              hintLink={FORECASTER_DOCS_LINK}
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
              helpText={
                !showHorizonDetails
                  ? 'Click the number field for more options.'
                  : getHorizonHelpText(horizon, interval)
              }
            >
              {/* 
          Constrain the entire row for consistency with other fields. 
          The numeric field + badge is outside the slider ref. 
        */}
              <div style={{ maxWidth: FIELD_MAX_WIDTH }}>
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false}>
                    {/* 3) onMouseDown to open the slider, with e.stopPropagation() */}
                    <div style={{ width: INPUT_SLIDER_WIDTH }}>
                      <EuiCompressedFieldNumber
                        min={1}
                        max={180}
                        id={field.name}
                        value={value}
                        style={{ width: '100%' }}
                        disabled={!isEditable}
                        // Use onMouseDown so we can stopPropagation
                        onMouseDown={(e) => {
                          // Prevent this click from bubbling to outside-click handler
                          e.stopPropagation();
                          setShowHorizonDetails(true);
                        }}
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

                {/* 
            Conditionally render the slider in a ref-wrapped div 
               so that clicks inside don't close the slider. 
          */}
                {showHorizonDetails && (
                  <>
                    <EuiSpacer size="s" />
                    <div ref={sliderPanelRef}>
                      <EuiPanel hasBorder hasShadow={false} paddingSize="m" style={{ width: INPUT_SLIDER_WIDTH }}>
                        <EuiRange
                          style={{ width: '100%' }}
                          min={1}
                          max={180}
                          step={1}
                          value={String(horizon)}
                          onChange={(e) => onSliderChange(Number(e.currentTarget.value))}
                          showLabels
                          showRange
                          levels={[
                            { min: 1, max: 40, color: 'success' },
                            { min: 40, max: 180, color: 'warning' },
                          ]}
                          aria-label="Horizon slider"
                        />
                        <EuiSpacer size="xs" />
                        <EuiText size="xs" color="subdued">
                          Recommended horizon is up to 40 intervals.
                        </EuiText>
                      </EuiPanel>
                    </div>
                  </>
                )}
              </div>
            </FormattedFormRow>
          );
        }}
      </Field>

      <EuiSpacer size="l" />

      {/* HISTORY */}
      <Field name="history" validate={validateHistory}>
        {({ field, form }: FieldProps<number>) => {
          const interval = (form as FormikProps<any>).values.interval;
          const value = field.value ?? '';

          function getHistoryHelpText(history: number, intv: number) {
            if (!intv || !history) return 'Minimum history: 40 intervals.';
            const totalMinutes = history * intv;
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            return `${history} intervals = ${hours} hour${
              hours === 1 ? '' : 's'
            }${
              mins ? ` ${mins} minute${mins === 1 ? '' : 's'}` : ''
            } if the forecasting interval is ${intv} minutes. Minimum history: 40 intervals.`;
          }

          return (
            <FormattedFormRow
              fullWidth
              title="History"
              hint={['How far back the model looks for training data.']}
              hintLink={FORECASTER_DOCS_LINK}
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
              helpText={getHistoryHelpText(field.value, interval)}
            >
              {/* gutterSize="none" ensures there's no default spacing between flex items */}
              <EuiFlexGroup
                gutterSize="none"
                alignItems="center"
                style={{ maxWidth: FIELD_MAX_WIDTH }}
              >
                
                <EuiFlexItem grow={false}>
                  <div style={{ width: INPUT_SLIDER_WIDTH }}>
                    <EuiCompressedFieldNumber
                      min={40}
                      max={10000}
                      name={field.name}
                      id={field.name}
                      value={value}
                      disabled={!isEditable}
                    style={{ width: '100%' }}
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
          );
        }}
      </Field>
    </Fragment>
  );
};
