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

import { ForecasterDefinitionFormikValues } from '../../DefineForecaster/models/interfaces';
import { ModelConfigurationFormikValues } from '../../ConfigureForecastModel/models/interfaces';

// Formik values used upon creation (includes all fields + those related to historical detector date range)
export interface CreateForecasterFormikValues
  extends ForecasterDefinitionFormikValues,
    ModelConfigurationFormikValues {}
