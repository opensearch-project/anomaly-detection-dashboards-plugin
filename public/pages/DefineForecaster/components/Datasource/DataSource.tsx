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

import { EuiCompressedComboBox, EuiCallOut, EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { Field, FieldProps, FormikProps, useFormikContext } from 'formik';
import { debounce, get } from 'lodash';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CatIndex,
  ClusterInfo,
  IndexAlias,
} from '../../../../../server/models/types';
import { AppState } from '../../../../redux/reducers';
import {
  getClustersInfo,
  getIndicesAndAliases,
  getMappings,
  getPrioritizedIndices,
} from '../../../../redux/reducers/opensearch';
import { getError, isInvalid } from '../../../../utils/utils';
import { IndexOption } from './IndexOption';
import {
  getDataSourceFromURL,
  getLocalCluster,
  getVisibleForecasterOptions,
  sanitizeSearchText,
} from '../../../utils/helpers';
import { validateIndex } from '../../../utils/validate';
import { DataFilterList } from '../DataFilterList/DataFilterList';
import { FormattedFormRow } from '../../../../components/FormattedFormRow/FormattedFormRow';
import { ForecasterDefinitionFormikValues } from '../../models/interfaces';
import { ModelConfigurationFormikValues } from '../../../ConfigureForecastModel/models/interfaces';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../../ConfigureForecastModel/utils/constants';
import { useLocation } from 'react-router-dom';
import _ from 'lodash';
import { FORECASTER_DOCS_LINK } from '../../../../utils/constants';
import { Timestamp } from '../Timestamp/Timestamp';
import { ConfigureFormikValues } from '../../../ForecastDetail/models/interface';
import { ClusterOption, } from '../../utils/helpers';
import { getForecastClusterInfoLabel } from '../../../utils/helpers';

interface DataSourceProps {
  formikProps: FormikProps<ForecasterDefinitionFormikValues> | FormikProps<ConfigureFormikValues>;
  isEdit: boolean; // whether we are editing a forecaster
  isEditable?: boolean; // whether the fields are editable (e.g., during creation, the fields are editable)
  setModelConfigValues?(initialValues: ModelConfigurationFormikValues): void;
  setNewIndexSelected?(isNew: boolean): void;
}

export function DataSource(props: DataSourceProps) {
  const { isEdit, isEditable = true, } = props;
  const dispatch = useDispatch();
  const location = useLocation();
  const MDSQueryParams = getDataSourceFromURL(location);
  const dataSourceId = MDSQueryParams.dataSourceId;
  const [indexNames, setIndexNames] = useState<{ label: string }[]>(
    props.formikProps.values.index
  );
  const [queryText, setQueryText] = useState('');
  const opensearchState = useSelector((state: AppState) => state.opensearch);
  const { setFieldValue } = useFormikContext();
  const [localClusterName, setLocalClusterName] = useState('');
  // Get the current form state and setter from Formik context

  useEffect(() => {
    const getInitialClusters = async () => {
      await dispatch(getClustersInfo(dataSourceId));
      handleClusterUpdate(opensearchState.clusters);
    };
    getInitialClusters();
  }, [dataSourceId]);

  const getIndicesAndAliasesBasedOnCluster = async (
    clusters: ClusterOption[],
    localClusterExists: boolean
  ) => {
    //Convert list of clusters to a string for searching
    const clustersString = getClustersStringForSearchQuery(clusters);
    await dispatch(
      getIndicesAndAliases(
        queryText,
        dataSourceId,
        clustersString,
        localClusterExists
      )
    );
    setFieldValue('index', props.formikProps.values.index);
    setFieldValue('timeField', props.formikProps.values.timeField);
    setFieldValue('filters', props.formikProps.values.filters);
  };

  useEffect(() => {
    // Ensure that indices are updated when clusters change
    if (props.formikProps.values.clusters) {
      const selectedClusters: ClusterOption[] =
        props.formikProps.values.clusters;
      if (selectedClusters && selectedClusters.length > 0) {
        const localClusterExists: boolean = selectedClusters.some(
          (cluster) => cluster.localcluster === 'true'
        );
        if (
          selectedClusters.length === 1 &&
          selectedClusters[0].localcluster === 'true'
        ) {
          getIndicesAndAliasesBasedOnCluster([], localClusterExists);
          setLocalClusterName(selectedClusters[0].cluster);
        } else {
          getIndicesAndAliasesBasedOnCluster(
            selectedClusters,
            localClusterExists
          );
        }
      }
    }
  }, [props.formikProps.values.clusters]);

  const handleClusterUpdate = (clusters: ClusterInfo[]) => {
    if (!clusters || clusters.length === 0) return;

    const visibleClusters: ClusterOption[] | undefined = props.formikProps.values.clusters ? props.formikProps.values.clusters :  getVisibleClusterOptions(getLocalCluster(clusters));
    
    setFieldValue('clusters', visibleClusters || []);
  };

  useEffect(() => {
    handleClusterUpdate(opensearchState.clusters);
  }, [opensearchState.clusters]);

  const getClustersStringForSearchQuery = (clusters: ClusterOption[]) => {
    let clustersString = '';
    if (clusters.length > 0) {
      clustersString = clusters
        .filter((cluster) => cluster.localcluster == 'false')
        .map((cluster) => cluster.cluster)
        .join(',');
    }
    return clustersString;
  };

  useEffect(() => {
    setIndexNames(props.formikProps.values.index);
  }, [props.formikProps.values.index]);

  const handleSearchChange = debounce(async (searchValue: string) => {
    if (searchValue !== queryText) {
      const sanitizedQuery = sanitizeSearchText(searchValue);
      setQueryText(sanitizedQuery);
      if (props.formikProps.values.clusters) {
        const selectedClusters: ClusterOption[] =
          props.formikProps.values.clusters;
        const clustersString =
          getClustersStringForSearchQuery(selectedClusters);
        await dispatch(
          getPrioritizedIndices(sanitizedQuery, dataSourceId, clustersString)
        );
      } else {
        await dispatch(getPrioritizedIndices(sanitizedQuery, dataSourceId, ''));
      }
    }
  }, 300);

  const handleIndexNameChange = (selectedOptions: any, oldOptions: { label: string }[] = props.formikProps.values.index) => {
    const indexNames = selectedOptions;
    setIndexNames(indexNames);
    if (indexNames.length > 0) {
      const indices: string[] = indexNames.map(
        (index: { label: string }) => index.label
      );
      dispatch(getMappings(indices, dataSourceId));
    }
    if (isSelectedOptionIndexRemoved(selectedOptions, oldOptions)) {
      if (props.setNewIndexSelected) {
        props.setNewIndexSelected(true);
      }
    } else {
      if (props.setNewIndexSelected) {
        props.setNewIndexSelected(false);
      }
    }
  };

  const isSelectedOptionIndexRemoved = (
    newSelectedOptions: { label: string }[] = indexNames,
    oldSelectedOptions: { label: string }[] = props.formikProps.values.index
  ) => {
      if (_.isEmpty(oldSelectedOptions) && _.isEmpty(newSelectedOptions)) {
        return false;
      }
    const newSelectedOptionsSet = new Set(newSelectedOptions);
    const indexRemoved: boolean =
    oldSelectedOptions.some((value) => !newSelectedOptionsSet.has(value));
    return indexRemoved;
  };

  const getVisibleClusterOptions = (
    clusters: ClusterInfo[]
  ): ClusterOption[] => {
    if (clusters.length > 0) {
      const visibleClusters = clusters.map((value) => ({
        label: getForecastClusterInfoLabel(value),
        cluster: value.name,
        localcluster: value.localCluster.toString(),
      }));
      // Using _.orderBy to sort clusters with local clusters first
      const sortedClusterOptions = _.orderBy(
        visibleClusters,
        [(option) => option.label.endsWith('(Local)'), 'label'],
        ['desc', 'asc']
      );
      return sortedClusterOptions;
    } else {
      return [];
    }
  };

  const visibleClusters = get(opensearchState, 'clusters', []) as ClusterInfo[];
  const visibleIndices = get(opensearchState, 'indices', []) as CatIndex[];
  const visibleAliases = get(opensearchState, 'aliases', []) as IndexAlias[];
  return (
    <Fragment>
      {props.isEdit && isSelectedOptionIndexRemoved() ? (
        <div>
          <EuiCallOut
            title="Modifying the selected index resets your forecaster configuration."
            color="warning"
            iconType="alert"
            size="s"
          />
          <EuiSpacer />
        </div>
      ) : null}
      <EuiText>
        <h4>Data source</h4>
      </EuiText>
      <EuiText size="s" color="subdued">
        <p>
          Select the clusters and focus the relevant data with filters.{' '}
          <EuiLink href={`${FORECASTER_DOCS_LINK}`} target="_blank" external>
            Learn more
          </EuiLink>
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {visibleClusters.length > 1 && (
        <Field name="clusters">
          {({ field, form }: FieldProps) => {
            return (
              <FormattedFormRow
                title="Cross-cluster"
                hint="Select a local cluster or remote clusters from cross-cluster connections."
                isInvalid={isInvalid(field.name, form)}
                error={getError(field.name, form)}
              >
                <EuiCompressedComboBox
                  data-test-subj="clustersFilter"
                  id="clusters"
                  placeholder="Find clusters"
                  async
                  singleSelection={false}
                  options={getVisibleClusterOptions(visibleClusters)}
                  isLoading={opensearchState.requesting}
                  selectedOptions={field.value}
                  isClearable={false}
                  isDisabled={!isEditable}
                  onBlur={() => {
                    form.setFieldTouched('clusters', true);
                  }}
                  onChange={(options) => {
                    form.setFieldValue('clusters', options);
                  }}
                />
              </FormattedFormRow>
            );
          }}
        </Field>
      )}
      <Field name="index" validate={validateIndex}>
        {({ field, form }: FieldProps) => {
          return (
            <FormattedFormRow
              title="Index or wildcard pattern"
              //hint="Choose an index, index pattern or alias as the data source."
              isInvalid={isInvalid(field.name, form)}
              error={getError(field.name, form)}
              //helpText="You can use a wildcard (*) in your index pattern."
            >
              <EuiCompressedComboBox
                data-test-subj="indicesFilter"
                id="index"
                placeholder="Select index or wildcard pattern"
                async
                isLoading={opensearchState.requesting}
                options={getVisibleForecasterOptions(
                  visibleIndices,
                  visibleAliases,
                  localClusterName
                )}
                onSearchChange={handleSearchChange}
                isDisabled={!isEditable}
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
                  if (
                    props.setModelConfigValues &&
                    isSelectedOptionIndexRemoved(options, field.value)
                  ) {
                    props.setModelConfigValues(
                      INITIAL_MODEL_CONFIGURATION_VALUES
                    );
                  }
                  handleIndexNameChange(options, field.value);
                }}
                selectedOptions={field.value}
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
        isEditable={isEditable}
      />
      <EuiSpacer />
      <Timestamp 
        formikProps={props.formikProps}
        isEditable={isEditable}
      />
    </Fragment>
  );
}
