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

import { EuiComboBox, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { Field, FieldProps, FormikProps } from 'formik';
import { debounce, get } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CatIndex, IndexAlias } from '../../../../../server/models/types';
import ContentPanel from '../../../../components/ContentPanel/ContentPanel';
import { AppState } from '../../../../redux/reducers';
import {
  getIndices,
  getMappings,
  getPrioritizedIndices,
} from '../../../../redux/reducers/opensearch';
import { getError, isInvalid } from '../../../../utils/utils';
import { IndexOption } from './IndexOption';
import { getVisibleOptions, sanitizeSearchText } from '../../../utils/helpers';
import { validateIndex } from '../../../utils/validate';
import { DataFilterList } from '../DataFilterList/DataFilterList';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { DetectorDefinitionFormikValues } from '../../models/interfaces';
import { ModelConfigurationFormikValues } from '../../../ConfigureModel/models/interfaces';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../../ConfigureModel/utils/constants';
import { FILTER_TYPES } from '../../../../models/interfaces';

interface DataSourceProps {
  formikProps: FormikProps<DetectorDefinitionFormikValues>;
  origIndex: string;
  isEdit: boolean;
  setModelConfigValues?(initialValues: ModelConfigurationFormikValues): void;
  setNewIndexSelected?(isNew: boolean): void;
  oldFilterType: FILTER_TYPES;
  oldFilterQuery: any;
}

export function DataSource(props: DataSourceProps) {
  const dispatch = useDispatch();
  const [indexName, setIndexName] = useState<string>(
    props.formikProps.values.index[0]?.label
  );
  const [queryText, setQueryText] = useState('');
  const opensearchState = useSelector((state: AppState) => state.opensearch);
  useEffect(() => {
    const getInitialIndices = async () => {
      await dispatch(getIndices(queryText));
    };
    getInitialIndices();
  }, []);

  useEffect(() => {
    setIndexName(props.formikProps.values.index[0]?.label);
  }, [props.formikProps]);

  const handleSearchChange = debounce(async (searchValue: string) => {
    if (searchValue !== queryText) {
      const sanitizedQuery = sanitizeSearchText(searchValue);
      setQueryText(sanitizedQuery);
      await dispatch(getPrioritizedIndices(sanitizedQuery));
    }
  }, 300);

  const handleIndexNameChange = (selectedOptions: any) => {
    const indexName = get(selectedOptions, '0.label', '');
    setIndexName(indexName);
    if (indexName !== '') {
      dispatch(getMappings(indexName));
    }
    if (indexName !== props.origIndex) {
      if (props.setNewIndexSelected) {
        props.setNewIndexSelected(true);
      }
    } else {
      if (props.setNewIndexSelected) {
        props.setNewIndexSelected(false);
      }
    }
  };

  const isDifferentIndex = () => {
    return props.isEdit && indexName !== props.origIndex;
  };

  const visibleIndices = get(opensearchState, 'indices', []) as CatIndex[];
  const visibleAliases = get(opensearchState, 'aliases', []) as IndexAlias[];

  return (
    <ContentPanel title="Data Source" titleSize="s">
      {props.isEdit && isDifferentIndex() ? (
        <div>
          <EuiCallOut
            title="Modifying the selected index resets your detector configuration."
            color="warning"
            iconType="alert"
            size="s"
          />
          <EuiSpacer />
        </div>
      ) : null}
      <Field name="index" validate={validateIndex}>
        {({ field, form }: FieldProps) => {
          return (
            <FormattedFormRow
              title="Index"
              hint="Choose an index or index pattern as the data source."
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
              helpText="You can use a wildcard (*) in your index pattern."
            >
              <EuiComboBox
                id="index"
                placeholder="Find indices"
                async
                isLoading={opensearchState.requesting}
                options={getVisibleOptions(visibleIndices, visibleAliases)}
                onSearchChange={handleSearchChange}
                onCreateOption={(createdOption: string) => {
                  const normalizedOptions = createdOption.trim();
                  if (!normalizedOptions) return;
                  const customOption = [{ label: normalizedOptions }];
                  form.setFieldValue('index', customOption);
                  handleIndexNameChange(customOption);
                }}
                onBlur={() => {
                  form.setFieldTouched('index', true);
                }}
                onChange={(options) => {
                  form.setFieldValue('index', options);
                  form.setFieldValue('timeField', undefined);
                  form.setFieldValue('filters', []);
                  if (props.setModelConfigValues) {
                    props.setModelConfigValues(
                      INITIAL_MODEL_CONFIGURATION_VALUES
                    );
                  }
                  handleIndexNameChange(options);
                }}
                selectedOptions={field.value}
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                renderOption={(option, searchValue, className) => (
                  <IndexOption
                    option={option}
                    searchValue={searchValue}
                    contentClassName={className}
                  />
                )}
              />
            </FormattedFormRow>
          );
        }}
      </Field>
      <DataFilterList
        formikProps={props.formikProps}
        oldFilterType={props.oldFilterType}
        oldFilterQuery={props.oldFilterQuery}
      />
    </ContentPanel>
  );
}
