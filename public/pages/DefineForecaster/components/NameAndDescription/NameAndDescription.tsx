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

import { EuiCompressedFieldText, EuiCompressedTextArea, EuiSpacer, EuiText } from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React, { Fragment } from 'react';
import { getError, isInvalid } from '../../../../utils/utils';
import { validateForecasterDesc } from './utils/validation';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';

interface NameAndDescriptionProps {
  onValidateForecasterName: (forecasterName: string) => Promise<any>;
  omitTitle?: boolean;
  isEditable?: boolean;
}

function NameAndDescription({ onValidateForecasterName, omitTitle = false, isEditable = true }: NameAndDescriptionProps) {
  console.log('isEditable', isEditable);
  return (
    <Fragment>
      {!omitTitle && (
        <>
          <EuiText>
            <h4>Details</h4>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      {/* FIXME: Add hint text to emphasize that forecaster name must be unique across the system */}
      <Field 
        name="name" 
        validate={isEditable ? onValidateForecasterName : undefined}  // Only validate if editable
      >
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            title="Name"
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
            helpText={`Specify a unique name. Must contain 1-64 characters. Valid characters are
                a-z, A-Z, 0-9, -(hyphen), _(underscore) and .(period).`}
          >
            {/* FIXME: even though readOnly is more desirable, but to be consistent with other components 
                who don't have readOnly mode, keep disabled instead */}
            <EuiCompressedFieldText
              data-test-subj="forecasterNameTextInput"
              name="forecasterName"
              id="forecasterName"
              placeholder="Enter forecaster name"
              isInvalid={isInvalid(field.name, form)}
              disabled={!isEditable}
              {...field}
              // Ensure value is always a defined string to prevent React warning about
              // switching between controlled/uncontrolled input. Empty string fallback
              // is required because undefined/null values can cause this switch.
              value={field.value || ''}
            />
          </FormattedFormRow>
        )}
      </Field>

      <Field 
        name="description" 
        validate={isEditable ? validateForecasterDesc : undefined}  // Only validate if editable
      >
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            formattedTitle={
              <p>
                Description <span className="optional">- optional</span>
              </p>
            }
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            {/* FIXME: even though readOnly is more desirable, but to be consistent with other components 
                who don't have readOnly mode, keep disabled instead */}
            <EuiCompressedTextArea
              data-test-subj="forecasterDescriptionTextInput"
              name="forecasterDescription"
              id="forecasterDescription"
              rows={3}
              placeholder="Describe the forecaster"
              disabled={!isEditable}
              {...field}
              isInvalid={isInvalid(field.name, form)}
            />
          </FormattedFormRow>
        )}
      </Field>
    </Fragment>
  );
}

export default NameAndDescription;
