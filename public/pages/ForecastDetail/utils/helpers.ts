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

import { createImputationFormikValues } from "../../ConfigureForecastModel/utils/helpers";
import { Forecaster, UNITS } from "../../../models/interfaces";
import { ConfigureFormikValues, DetailsFormikValues } from "../models/interface";
import { get, isEmpty } from "lodash";
import { DEFAULT_SHINGLE_SIZE } from "../../../utils/constants";
import { featuresToFormik, filtersToFormik, formikToFeatureAttributes, featuresToUIMetadata, } from "../../DefineForecaster/utils/helpers";
import { ClusterInfo } from "../../../../server/models/types";
import { getLocalCluster, getClusterLabel } from "../../utils/helpers";
import { CUSTOM_FORECASTER_RESULT_INDEX_PREFIX } from "../../../../server/utils/constants";
import { SparseDataOptionValue } from "../../../pages/ConfigureForecastModel/utils/constants";

export function detailsToFormik(
  forecaster: Forecaster
): DetailsFormikValues {
  return {
    name: forecaster.name,
    description: forecaster.description,
    resultIndex: forecaster.resultIndex,
    resultIndexMinAge: get(forecaster, 'resultIndexMinAge', undefined),
    resultIndexMinSize: get(forecaster, 'resultIndexMinSize', undefined),
    resultIndexTtl: get(forecaster, 'resultIndexTtl', undefined),
    flattenCustomResultIndex: get(forecaster, 'flattenCustomResultIndex', false),
  };
}

export function configureToFormik(
  forecaster: Forecaster,
  allClusters: ClusterInfo[]
): ConfigureFormikValues {
  console.log('forecaster', forecaster);
  const imputationFormikValues = createImputationFormikValues(forecaster);

  // Extract indices and handle undefined case
  const indices = forecaster?.indices || [];

  // If allClusters is defined, extract clusters; otherwise, set clusters to undefined
  let extractedClusters;
  if (allClusters) {
    const localCluster = getLocalCluster(allClusters);
    const localClusterName = localCluster?.[0]?.name;

    extractedClusters = indices
      .map(index => {
        const [clusterPrefix] = index.split(':');
        // If index contains a cluster prefix (has ':'), use it; otherwise use localClusterName or fallback to 'local'
        const clusterName = index.includes(':') ? clusterPrefix : (localClusterName || 'local');

        const isLocal = Boolean(localClusterName && clusterName === localClusterName);

        return {
          label: getClusterLabel(isLocal, clusterName),
          cluster: clusterName,
          localcluster: isLocal ? 'true' : 'false'
        };
      })
      // Remove duplicates based on the "cluster" field while preserving the first occurrence
      .filter((option, index, self) =>
        index === self.findIndex(o => o.cluster === option.cluster)
      );
  } else {
    extractedClusters = undefined;
  }

  console.log('extractedClusters', extractedClusters);

  return {
    // index: [...indices.map(indexObj => indexObj.label)],
    index: [...indices.map(index => ({ label: index }))],
    clusters: extractedClusters,
    filters: filtersToFormik(forecaster),
    filterQuery: JSON.stringify(
      get(forecaster, 'filterQuery', { match_all: {} }),
      null,
      4
    ),
    timeField: forecaster.timeField,
    featureList: featuresToFormik(forecaster),
    categoryFieldEnabled: !isEmpty(get(forecaster, 'categoryField', [])),
    categoryField: get(forecaster, 'categoryField', []),
    shingleSize: get(forecaster, 'shingleSize', DEFAULT_SHINGLE_SIZE),
    imputationOption: imputationFormikValues,
    interval: get(forecaster, 'forecastInterval.period.interval', 10),
    windowDelay: get(forecaster, 'windowDelay.period.interval', 0),
    suggestedSeasonality: get(forecaster, 'suggestedSeasonality', undefined),
    recencyEmphasis: get(forecaster, 'recencyEmphasis', undefined),
    horizon: get(forecaster, 'horizon', undefined),
    history: get(forecaster, 'history', undefined),
  };
}

export function formikToForecaster(
  configureValues: ConfigureFormikValues,
  detailsValues: DetailsFormikValues,
  forecaster: Forecaster
): Forecaster {
  console.log('configureValues', configureValues);
  console.log('detailsValues', detailsValues);
  console.log('categoryFieldEnabled:', configureValues.categoryFieldEnabled);
  console.log('categoryField:', configureValues.categoryField);
  
  let forecasterBody = {
    ...forecaster,
    // Details values
    name: detailsValues.name,
    description: detailsValues.description,
    // Handle resultIndex with the following logic:
    // 1. If empty string (''), set to undefined
    // 2. If has value, check if it already starts with the prefix
    //    - If yes, use as is
    //    - If no, prepend the prefix
    // 3. If null/undefined, pass through unchanged
    resultIndex: detailsValues.resultIndex === '' 
      ? undefined 
      : detailsValues.resultIndex 
        ? detailsValues.resultIndex.startsWith(CUSTOM_FORECASTER_RESULT_INDEX_PREFIX)
          ? detailsValues.resultIndex
          : CUSTOM_FORECASTER_RESULT_INDEX_PREFIX + detailsValues.resultIndex
        : detailsValues.resultIndex,

    // Configure values
    indices: configureValues.index.map(indexObj => indexObj.label),
    filterQuery: JSON.parse(configureValues.filterQuery),
    uiMetadata: {
      features: featuresToUIMetadata(configureValues.featureList),
      filters: configureValues.filters,
    },
    featureAttributes: formikToFeatureAttributes(configureValues.featureList),
    timeField: configureValues.timeField,
    forecastInterval: {
      period: { interval: configureValues.interval, unit: UNITS.MINUTES },
    },
    windowDelay: {
      period: { interval: configureValues.windowDelay, unit: UNITS.MINUTES },
    },
    categoryField: configureValues.categoryFieldEnabled ? configureValues.categoryField : [],
    shingleSize: configureValues.shingleSize,
    // backend does not recognize SparseDataOptionValue.IGNORE, so we need to set it to undefined
    imputationOption: configureValues.imputationOption?.imputationMethod === SparseDataOptionValue.IGNORE ? undefined : configureValues.imputationOption,
    suggestedSeasonality: configureValues.suggestedSeasonality,
    recencyEmphasis: configureValues.recencyEmphasis,
    resultIndexMinAge: detailsValues.resultIndexMinAge,
    resultIndexMinSize: detailsValues.resultIndexMinSize,
    resultIndexTtl: detailsValues.resultIndexTtl,
    flattenCustomResultIndex: detailsValues.flattenCustomResultIndex,
    horizon: configureValues.horizon,
    history: configureValues.history,
  } as Forecaster;
  console.log('forecasterBody', forecasterBody);

  return forecasterBody;
}
