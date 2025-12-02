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

import { get, isEmpty } from 'lodash';
import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { darkModeEnabled } from './opensearchDashboardsUtils';
import {
  ALERTING_PLUGIN_NAME,
  NAME_REGEX,
  INDEX_NAME_REGEX,
  MAX_FEATURE_NAME_SIZE,
  MAX_INDEX_NAME_SIZE,
} from './constants';
import { CoreStart } from '../../../../src/core/public';
import { CoreServicesContext } from '../components/CoreServices/CoreServices';
import datemath from '@elastic/datemath';
import moment from 'moment';
import { Detector } from '../models/interfaces';
import { CUSTOM_AD_RESULT_INDEX_PREFIX } from '../../server/utils/constants';
import { FormikProps } from 'formik';

export const validateFeatureName = (
  featureName: string
): string | undefined => {
  return validateName(featureName, 'feature');
};

export const validateDetectorName = (
  detectorName: string
): string | undefined => {
  return validateName(detectorName, 'detector');
};

export const validateForecasterName = (
  forecasterName: string
): string | undefined => {
  return validateName(forecasterName, 'forecaster');
};

export const validateName = (
  name: string,
  fieldName: string
): string | undefined => {
  if (isEmpty(name)) {
    return `You must enter a ${fieldName} name`;
  }
  if (name.length > MAX_FEATURE_NAME_SIZE) {
    return `Name is too big maximum limit is ${MAX_FEATURE_NAME_SIZE}`;
  }
  if (!NAME_REGEX.test(name)) {
    return `The name "${name}" contains invalid characters. Valid characters are a-z, A-Z, 0-9, -(hyphen) and _(underscore).`;
  }
};

export const validateCustomResultIndex = (name: string): string | undefined => {
  if (isEmpty(name)) {
    return `You must enter a index name`;
  }
  let resultIndexName = CUSTOM_AD_RESULT_INDEX_PREFIX + name;
  if (resultIndexName.length > MAX_INDEX_NAME_SIZE) {
    return `Index name is too long, maximum limit is ${MAX_INDEX_NAME_SIZE}`;
  }
  if (!INDEX_NAME_REGEX.test(resultIndexName)) {
    return 'Valid characters are a-z, 0-9, -(hyphen) and _(underscore)';
  }
};

/**
 * Determines if a form field should display an error state.
 * It returns true only if the field has been touched (interacted with) by the user
 * AND there is currently a validation error associated with that field.
 * This prevents showing errors for fields the user hasn't interacted with yet.
 *
 * @param name - The name (key) of the form field.
 * @param form - The Formik form object containing 'touched' and 'errors' states.
 * @returns {boolean} - True if the error should be shown, false otherwise.
 */
export const isInvalid = (name: string, form: any): boolean =>
  !!get(form.touched, name, false) && !!get(form.errors, name, false);

export const getError = (name: string, form: any) => get(form.errors, name);

export const requiredSelectField = (val: any): string | undefined => {
  return required(val, 'You must select a field');
};

export const required = (
  val: any,
  customErrorMessage?: string
): string | undefined => {
  // if val is number, skip check as number value already exists
  const message = !isEmpty(customErrorMessage)
    ? customErrorMessage
    : 'Required';
  return typeof val !== 'number' && !val ? message : undefined;
};

export const requiredNonEmptyArray = (
  val: any,
  customErrorMessage?: string
): string | undefined => {
  const message = !isEmpty(customErrorMessage)
    ? customErrorMessage
    : 'Required';
  return !val || val.length === 0 ? message : undefined;
};

export const requiredNonEmptyFieldSelected = (val: any): string | undefined => {
  return requiredNonEmptyArray(val, 'You must select a field');
};

export const validateCategoryField = (val: any): string | undefined => {
  return requiredNonEmptyArray(val, 'You must select a category field');
};

export const validatePositiveInteger = (value: any) => {
  if (!Number.isInteger(value) || value < 1)
    return 'Must be a positive integer';
};

export function validatePositiveDecimal(value: any) {
  // Allow empty, NaN, or non-number values without showing an error
  if (
    value === '' ||
    value === null ||
    isNaN(value) ||
    typeof value !== 'number'
  ) {
    return undefined; // No error for empty, NaN, or non-number values
  }

  // Validate that the value is a positive number greater than zero
  if (value <= 0) {
    return 'Must be a positive number greater than zero';
  }

  return undefined; // No error if the value is valid
}

export const validateEmptyOrPositiveInteger = (value: any) => {
  if (Number.isInteger(value) && value < 1) return 'Must be a positive integer';
};

export const validateNonNegativeInteger = (value: any) => {
  if (!Number.isInteger(value) || value < 0)
    return 'Must be a non-negative integer';
};

export const validateEmptyOrNonNegativeInteger = (value: any) => {
  if (Number.isInteger(value) && value < 0)
    return 'Must be a non-negative integer';
};

/**
 * Validates that a value is a multiple of another value (used for frequency validation).
 *
 * Parameters are typed as `unknown` because this function is called by Formik with
 * whatever data exists in the form state. Even though the logical type might be `number`,
 * Formik sends empty strings (`''`) until a user types something, so we must normalize
 * the input before running any numeric validation checks.
 *
 * @param rawValue - The value to validate (from Formik form state)
 * @param rawMultiple - The multiple to check against (from Formik form state)
 * @returns Error message if validation fails, undefined if valid
 */
export const validateMultipleOf = (
  rawValue: unknown,
  rawMultiple: unknown
): string | undefined => {
  // Treat "", null, undefined as “not provided”
  if (rawValue === '' || rawValue === null || rawValue === undefined)
    return undefined;

  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 'Must be a number';

  const positiveIntegerError = validatePositiveInteger(value);
  if (positiveIntegerError) return positiveIntegerError;

  const multiple = Number(rawMultiple);
  if (
    !Number.isFinite(multiple) ||
    multiple <= 0 ||
    !Number.isInteger(multiple)
  )
    return undefined;

  return value % multiple === 0
    ? undefined
    : `Value "${value}" is not a multiple of interval (${multiple} minutes)`;
};

export const getErrorMessage = (err: any, defaultMessage: string) => {
  if (typeof err === 'string') return err;
  if (err && err.message) return err.message;
  return defaultMessage;
};

/**
 * When there's no local cluster, it's expected that some
 * bootstrap calls may fail with "No Living connections". 
 * Do not turn those into generic detector error toasts.
 */
export const isNoLivingConnectionsError = (error: any): boolean => {
  return typeof error === 'string' && error.includes('No Living connections');
};

const getPluginRootPath = (url: string, pluginName: string) => {
  return url.slice(0, url.indexOf(pluginName) + pluginName.length);
};

export const getAlertingCreateMonitorLink = (
  detectorId: string,
  detectorName: string,
  detectorInterval: number,
  unit: string,
  resultIndex?: string
): string => {
  try {
    const core = React.useContext(CoreServicesContext) as CoreStart;
    const navLinks = get(core, 'chrome.navLinks', undefined);
    const url = `${navLinks.get(ALERTING_PLUGIN_NAME)?.url}`;
    const alertingRootUrl = getPluginRootPath(url, ALERTING_PLUGIN_NAME);
    return !resultIndex
      ? `${alertingRootUrl}#/create-monitor?searchType=ad&adId=${detectorId}&name=${detectorName}&interval=${
          2 * detectorInterval
        }&unit=${unit}`
      : `${alertingRootUrl}#/create-monitor?searchType=ad&adId=${detectorId}&name=${detectorName}&interval=${
          2 * detectorInterval
        }&unit=${unit}&adResultIndex=${resultIndex}`;
  } catch (e) {
    console.error('unable to get the alerting URL', e);
    return '';
  }
};

export const getAlertingMonitorListLink = (): string => {
  try {
    const core = React.useContext(CoreServicesContext) as CoreStart;
    const navLinks = get(core, 'chrome.navLinks', undefined);
    const url = `${navLinks.get(ALERTING_PLUGIN_NAME).url}`;
    const alertingRootUrl = getPluginRootPath(url, ALERTING_PLUGIN_NAME);
    return `${alertingRootUrl}#/monitors`;
  } catch (e) {
    console.error('unable to get the alerting URL', e);
    return '';
  }
};

export interface Listener {
  onSuccess(): void;
  onException(): void;
}

const detectorCountFontColor = () =>
  darkModeEnabled() ? '#98A2B3' : '#535966';

export const getTitleWithCount = (title: string, count: number | string) => {
  return (
    <EuiTitle size={'s'} className={''}>
      <h3
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <p>{title}&nbsp;</p>
        <p style={{ color: detectorCountFontColor() }}>{`(${count})`}</p>
      </h3>
    </EuiTitle>
  );
};

export function convertTimestampToString(timestamp: number | string) {
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return moment(timestamp).format('MM/DD/YYYY hh:mm A');
}

export function convertTimestampToNumber(timestamp: number | string) {
  if (typeof timestamp === 'string') {
    return datemath.parse(timestamp)?.valueOf();
  }
  return timestamp;
}

export function getHistoricalRangeString(detector: Detector) {
  if (!detector?.detectionDateRange) {
    return '-';
  } else {
    const startTimeAsNumber = convertTimestampToNumber(
      get(detector, 'detectionDateRange.startTime', 0)
    );
    const endTimeAsNumber = convertTimestampToNumber(
      get(detector, 'detectionDateRange.endTime', 0)
    );

    return (
      moment(startTimeAsNumber).format('MMM DD, YYYY @ hh:mm A') +
      ' - ' +
      moment(endTimeAsNumber).format('MMM DD, YYYY @ hh:mm A')
    );
  }
}

export const validateHistory = (value: any) => {
  if (value === undefined || value === null || value === '') {
    return 'A value is required.';
  }
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < 40) {
    return 'Must be an integer of at least 40.';
  }
  return undefined;
};
