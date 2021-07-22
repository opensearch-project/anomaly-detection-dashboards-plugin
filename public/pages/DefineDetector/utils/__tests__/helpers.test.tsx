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

/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { INITIAL_DETECTOR_DEFINITION_VALUES } from '../../utils/constants';
import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import {
  detectorDefinitionToFormik,
  filtersToFormik,
} from '../../utils/helpers';
import { Detector } from '../../../../models/interfaces';

describe('detectorDefinitionToFormik', () => {
  test('should return initialValues if detector is null', () => {
    const randomDetector = {} as Detector;
    const adFormikValues = detectorDefinitionToFormik(randomDetector);
    expect(adFormikValues).toEqual(INITIAL_DETECTOR_DEFINITION_VALUES);
  });
  test('should return correct values if detector is not null', () => {
    const randomDetector = getRandomDetector();
    const adFormikValues = detectorDefinitionToFormik(randomDetector);
    expect(adFormikValues).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      filters: randomDetector.uiMetadata.filters,
      filterQuery: JSON.stringify(randomDetector.filterQuery || {}, null, 4),
      index: [{ label: randomDetector.indices[0] }], // Currently we support only one index
      timeField: randomDetector.timeField,
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
    });
  });
  test('should return if detector does not have metadata', () => {
    const randomDetector = getRandomDetector();
    //@ts-ignore
    randomDetector.uiMetadata = undefined;
    const adFormikValues = detectorDefinitionToFormik(randomDetector);
    expect(adFormikValues).toEqual({
      name: randomDetector.name,
      description: randomDetector.description,
      filterQuery: JSON.stringify(randomDetector.filterQuery || {}, null, 4),
      filters: filtersToFormik(randomDetector),
      index: [{ label: randomDetector.indices[0] }], // Currently we support only one index
      timeField: randomDetector.timeField,
      interval: randomDetector.detectionInterval.period.interval,
      windowDelay: randomDetector.windowDelay.period.interval,
    });
  });
});
