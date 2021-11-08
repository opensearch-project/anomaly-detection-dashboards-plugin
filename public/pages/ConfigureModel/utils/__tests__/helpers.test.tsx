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

import { getRandomDetector } from '../../../../redux/reducers/__tests__/utils';
import { prepareDetector } from '../../utils/helpers';
import { FEATURE_TYPE } from '../../../../models/interfaces';
import { FeaturesFormikValues } from '../../models/interfaces';

describe('featuresToFormik', () => {
  test('should able to add new feature', () => {
    const randomDetector = getRandomDetector(false);
    const newFeature: FeaturesFormikValues = {
      featureId: 'test-feature-id',
      aggregationBy: 'sum',
      aggregationOf: [{ label: 'bytes' }],
      featureEnabled: true,
      featureName: 'New feature',
      featureType: FEATURE_TYPE.SIMPLE,
      aggregationQuery: '',
    };
    const randomPositiveInt = Math.ceil(Math.random() * 100);
    const apiRequest = prepareDetector(
      [newFeature],
      randomPositiveInt,
      randomDetector,
      false
    );
    // expect(apiRequest.featureAttributes).toEqual([
    //   {
    //     featureId: newFeature.featureId,
    //     featureName: newFeature.featureName,
    //     featureEnabled: newFeature.featureEnabled,
    //     importance: 1,
    //     aggregationQuery: { new_feature: { sum: { field: 'bytes' } } },
    //   },
    //   ...randomDetector.featureAttributes,
    // ]);
  });
  // test('should able to edit feature', () => {
  //   const randomDetector = getRandomDetector(false);
  //   const featureToEdit = randomDetector.featureAttributes[0];
  //   const newFeature: FeaturesFormikValues = {
  //     aggregationBy: 'sum',
  //     aggregationOf: [{ label: 'bytes' }],
  //     enabled: true,
  //     featureName: 'New feature',
  //     featureType: FEATURE_TYPE.SIMPLE,
  //     customAggregation: '',
  //   };
  //   const apiRequest = prepareDetector(
  //     newFeature,
  //     randomDetector,
  //     featureToEdit.featureId || ''
  //   );
  //   expect(apiRequest.featureAttributes).toEqual([
  //     {
  //       featureId: featureToEdit.featureId,
  //       featureName: newFeature.featureName,
  //       featureEnabled: newFeature.enabled,
  //       importance: 1,
  //       aggregationQuery: { new_feature: { sum: { field: 'bytes' } } },
  //     },
  //     ...randomDetector.featureAttributes.slice(1),
  //   ]);
  // });
});
