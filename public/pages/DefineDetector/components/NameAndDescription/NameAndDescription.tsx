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

import { EuiFieldText, EuiTextArea } from '@elastic/eui';
import { Field, FieldProps } from 'formik';
import React from 'react';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { getError, isInvalid } from '../../../../utils/utils';
import { validateDetectorDesc } from './utils/validation';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { useState } from 'react';
import { getNotifications, getSavedObjectsClient } from '../../../../services';
import { ClusterSelector } from '../../../../../../../src/plugins/data_source_management/public';

interface NameAndDescriptionProps {
  onValidateDetectorName: (detectorName: string) => Promise<any>;
}


function NameAndDescription(props: NameAndDescriptionProps) {
  const [selectedDataSource, setSelectedDataSource] = useState<string>();

  const onSelectedDataSource = (e) => {
    const dataConnectionId = e[0] ? e[0].id : undefined;
    setSelectedDataSource(dataConnectionId);
    console.log(dataConnectionId);
  }
  return (
    <ContentPanel title="Detector details" titleSize="s">
      <Field name="name" validate={props.onValidateDetectorName}>
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            title="Name"
            hint="Specify a unique and descriptive name that is easy to recognize."
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
            helpText={`Detector name must contain 1-64 characters. Valid characters are
                a-z, A-Z, 0-9, -(hyphen), _(underscore) and .(period).`}
          >
            <EuiFieldText
              data-test-subj="detectorNameTextInput"
              name="detectorName"
              id="detectorName"
              placeholder="Enter detector name"
              isInvalid={isInvalid(field.name, form)}
              {...field}
            />
          </FormattedFormRow>
        )}
      </Field>
     
      <Field name="description" validate={validateDetectorDesc}>
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            formattedTitle={
              <p>
                Description <span className="optional">- optional</span>
              </p>
            }
            hint="Describe the purpose of the detector."
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            <EuiTextArea
              data-test-subj="detectorDescriptionTextInput"
              name="detectorDescription"
              id="detectorDescription"
              rows={3}
              placeholder="Describe the detector"
              {...field}
              isInvalid={isInvalid(field.name, form)}
            />
          </FormattedFormRow>
        )}
      </Field>
    </ContentPanel>
  );
}

export default NameAndDescription;
