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

import { UIFilter } from "public/models/interfaces";
import { ImputationFormikValues } from "../../ConfigureForecastModel/models/interfaces";
import { FeaturesFormikValues } from "../../DefineForecaster/models/interfaces";
import { ClusterOption } from "../../DefineForecaster/utils/helpers";

// Formik values used when editing the model configuration
export interface DetailsFormikValues {
    name: string;
    description: string;
    resultIndex?: string;
    resultIndexMinAge?: number | string;
    resultIndexMinSize?: number | string;
    resultIndexTtl?: number | string;
    flattenCustomResultIndex?: boolean;
}

export interface ConfigureFormikValues {
    index: { label: string }[];
    filters: UIFilter[];
    filterQuery: string;
    timeField: string;
    clusters?: ClusterOption[];
    featureList: FeaturesFormikValues[];
    categoryFieldEnabled: boolean;
    categoryField: string[];
    shingleSize: number;
    imputationOption?: ImputationFormikValues;
    interval: number | undefined;
    windowDelay: number | undefined;
    suggestedSeasonality?: number;
    recencyEmphasis?: number;
    horizon?: number;
    history?: number;
}
