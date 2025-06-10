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

import { EuiCompressedComboBox } from '@elastic/eui';
import { Field, FieldProps, FormikProps } from 'formik';
import { debounce, get, isEmpty } from 'lodash';
import React, { Fragment, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { AppState } from '../../../../redux/reducers';
import { getPrioritizedIndices } from '../../../../redux/reducers/opensearch';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import {
  getDataSourceFromURL,
  sanitizeSearchText,
} from '../../../utils/helpers';
import { getError, isInvalid, required } from '../../../../utils/utils';
import { ForecasterDefinitionFormikValues } from '../../models/interfaces';
import { useLocation } from 'react-router-dom';
import { ConfigureFormikValues } from '../../../ForecastDetail/models/interface';

interface TimestampProps {
  formikProps: FormikProps<ForecasterDefinitionFormikValues> | FormikProps<ConfigureFormikValues>;
  isEditable?: boolean;
}

export function Timestamp(props: TimestampProps) {
  const { isEditable = true } = props;  // Default to true if not provided
  const dispatch = useDispatch();
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;
  const opensearchState = useSelector((state: AppState) => state.opensearch);
  const [queryText, setQueryText] = useState('');

  const handleSearchChange = debounce(async (searchValue: string) => {
    if (searchValue !== queryText) {
      const sanitizedQuery = sanitizeSearchText(searchValue);
      setQueryText(sanitizedQuery);
      await dispatch(getPrioritizedIndices(sanitizedQuery, dataSourceId));
    }
  }, 300);

  const dateFields = Array.from(
    get(opensearchState, 'dataTypes.date', []) as string[]
  );

  const dateNanoFields = Array.from(
    get(opensearchState, 'dataTypes.date_nanos', []) as string[]
  );

  const allDateFields = dateFields.concat(dateNanoFields);

  const timeStampFieldOptions = isEmpty(allDateFields)
    ? []
    : allDateFields.map((dateField) => ({ label: dateField }));

  return (
    //<ContentPanel
    //  title="Timestamp"
    //  titleSize="s"
    //  subTitle="Select the time field you want to use for the time filter."
    //>
    <Fragment>
      <Field name="timeField" validate={required}>
        {({ field, form }: FieldProps) => (
          <FormattedFormRow
            title="Time field"
            isInvalid={isInvalid(field.name, form)}
            error={getError(field.name, form)}
          >
            <EuiCompressedComboBox
              data-test-subj="timestampFilter"
              id="timeField"
              placeholder="Select a time field"
              options={timeStampFieldOptions}
              onSearchChange={handleSearchChange}
              isDisabled={!isEditable}
              onCreateOption={(createdOption: string) => {
                const normalizedOptions = createdOption.trim();
                if (!normalizedOptions) return;
                form.setFieldValue('timeField', normalizedOptions);
              }}
              onBlur={() => {
                form.setFieldTouched('timeField', true);
              }}
              onChange={(options) => {
                form.setFieldValue('timeField', get(options, '0.label'));
              }}
              selectedOptions={(field.value && [{ label: field.value }]) || []}
              singleSelection={{ asPlainText: true }}
              isClearable={false}
            />
          </FormattedFormRow>
        )}
      </Field>
    </Fragment>
  );
}
