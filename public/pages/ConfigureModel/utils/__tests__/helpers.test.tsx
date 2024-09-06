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
import { modelConfigurationToFormik, rulesToFormik } from '../helpers';
import { SparseDataOptionValue } from '../constants';
import { ImputationMethod } from '../../../../models/types';

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
  test('should return correct values if detector is not null', () => {
    const randomDetector = getRandomDetector();
    const adFormikValues = modelConfigurationToFormik(randomDetector);

    const imputationOption = randomDetector.imputationOption;
    if (imputationOption) {
      const method = imputationOption.method;
      if (ImputationMethod.FIXED_VALUES === method) {
        expect(adFormikValues.imputationOption?.imputationMethod).toEqual(
          SparseDataOptionValue.CUSTOM_VALUE
        );
        expect(randomDetector.imputationOption?.defaultFill).toBeDefined();
        expect(
          randomDetector.imputationOption?.defaultFill?.length
        ).toBeGreaterThan(0);

        const formikCustom = adFormikValues.imputationOption?.custom_value;
        expect(formikCustom).toBeDefined();

        const defaultFill = randomDetector.imputationOption?.defaultFill || [];

        defaultFill.forEach(({ featureName, data }) => {
          const matchingFormikValue = formikCustom?.find(
            (item) => item.featureName === featureName
          );

          // Assert that a matching value was found
          expect(matchingFormikValue).toBeDefined();

          // Assert that the data matches
          expect(matchingFormikValue?.data).toEqual(data);
        });
      } else {
        if (ImputationMethod.ZERO === method) {
          expect(adFormikValues.imputationOption?.imputationMethod).toEqual(
            SparseDataOptionValue.SET_TO_ZERO
          );
        } else {
          expect(adFormikValues.imputationOption?.imputationMethod).toEqual(
            SparseDataOptionValue.PREVIOUS_VALUE
          );
        }
        expect(adFormikValues.imputationOption?.custom_value).toEqual(
          undefined
        );
      }
    } else {
      expect(adFormikValues.imputationOption?.custom_value).toEqual(undefined);
      expect(adFormikValues.imputationOption?.imputationMethod).toEqual(
        SparseDataOptionValue.IGNORE
      );
    }
  });
  test('should return correct rules', () => {
    const randomDetector = getRandomDetector(); // Generate a random detector object for testing
    const adFormikValues = modelConfigurationToFormik(randomDetector); // Convert detector to Formik values

    const rules = randomDetector.rules; // Get the rules from the detector

    if (rules) {
      // If rules exist, convert them to formik format using rulesToFormik
      const expectedFormikRules = rulesToFormik(rules); // Convert rules to Formik-compatible format

      // Compare the converted rules with the suppressionRules in Formik values
      expect(adFormikValues.suppressionRules).toEqual(expectedFormikRules);
    } else {
      // If no rules exist, suppressionRules should be undefined
      expect(adFormikValues.suppressionRules).toEqual([]);
    }
  });
});
