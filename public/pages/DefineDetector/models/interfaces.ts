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

import { UIFilter } from '../../../models/interfaces';

// Formik values used when creating/editing the detector definition
export interface DetectorDefinitionFormikValues {
  name: string;
  description: string;
  index: { label: string }[];
  resultIndex?: string;
  filters: UIFilter[];
  filterQuery: string;
  timeField: string;
  interval: number;
  windowDelay: number;
}
