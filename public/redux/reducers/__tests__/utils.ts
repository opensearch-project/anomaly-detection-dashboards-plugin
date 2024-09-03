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

import chance from 'chance';
import { isEmpty, snakeCase, random } from 'lodash';
import {
  Detector,
  FeatureAttributes,
  FEATURE_TYPE,
  UiMetaData,
  UNITS,
  Monitor,
} from '../../../models/interfaces';
import moment from 'moment';
import { DETECTOR_STATE } from '../../../../server/utils/constants';
import { DEFAULT_SHINGLE_SIZE } from '../../../utils/constants';
import {
  ImputationMethod,
  ImputationOption,
  Rule,
  Action,
  Condition,
  ThresholdType,
  Operator,
} from '../../../models/types';

const detectorFaker = new chance('seed');

export const getRandomFeature = (needsId: boolean): FeatureAttributes => {
  const featureName = detectorFaker.country();
  const feature = {
    featureName,
    featureEnabled: detectorFaker.bool(),
    importance: 2,
    aggregationQuery: {
      [snakeCase(featureName)]: {
        max: {
          field: 'any',
        },
      },
    },
  };
  if (needsId) {
    return { featureId: detectorFaker.guid().slice(0, 20), ...feature };
  } else {
    return feature;
  }
};

const randomQuery = () => {
  return {
    bool: {
      filter: [
        {
          exists: {
            field: 'host',
            boost: 1.0,
          },
        },
      ],
      adjust_pure_negative: true,
      boost: 1.0,
    },
  };
};

export const getUIMetadata = (features: FeatureAttributes[]) => {
  const metaFeatures = features.reduce(
    (acc, feature) => ({
      ...acc,
      [feature.featureName]: {
        aggregationBy: detectorFaker.pickone(['max', 'min', 'sum', 'avg']),
        aggregationOf: feature.featureName,
        featureType: FEATURE_TYPE.SIMPLE,
      },
    }),
    {}
  );
  return {
    features: metaFeatures,
    filters: [],
  } as UiMetaData;
};

export const getRandomDetector = (
  isCreate: boolean = true,
  customResultIndex: string = ''
): Detector => {
  const features = new Array(detectorFaker.natural({ min: 1, max: 5 }))
    .fill(null)
    .map(() => getRandomFeature(isCreate ? false : true));
  return {
    id: isCreate ? detectorFaker.guid().slice(0, 20) : '',
    primaryTerm: isCreate ? 0 : detectorFaker.integer({ min: 1 }),
    seqNo: isCreate ? 0 : detectorFaker.integer({ min: 1 }),
    name: detectorFaker.word({ length: 10 }),
    description: detectorFaker.paragraph({ sentences: 1 }),
    timeField: '@timestamp',
    indices: ['logstash-*'],
    featureAttributes: features,
    filterQuery: randomQuery(),
    uiMetadata: getUIMetadata(features),
    detectionInterval: {
      period: {
        interval: detectorFaker.integer({ min: 1, max: 10 }),
        unit: UNITS.MINUTES,
      },
    },
    windowDelay: {
      period: {
        interval: detectorFaker.integer({ min: 1, max: 10 }),
        unit: UNITS.MINUTES,
      },
    },
    lastUpdateTime: 1586823218000,
    enabled: true,
    enabledTime: 1586823218000,
    disabledTime: moment(1586823218000).subtract(1, 'days').valueOf(),
    curState: DETECTOR_STATE.INIT,
    stateError: '',
    shingleSize: DEFAULT_SHINGLE_SIZE,
    resultIndex: isEmpty(customResultIndex) ? undefined : customResultIndex,
    resultIndexMinAge: 7,
    resultIndexMinSize: 51200,
    resultIndexTtl: 60,
    imputationOption: randomImputationOption(features),
    rules: randomRules(features)
  };
};

export const getRandomMonitor = (
  detectorId: string,
  enabled: boolean = true
): Monitor => {
  return {
    id: detectorFaker.guid().slice(0, 20),
    name: detectorFaker.word({ length: 10 }),
    enabled: enabled,
    enabledTime: moment(1586823218000).subtract(1, 'days').valueOf(),
    schedule: {
      period: {
        interval: detectorFaker.integer({ min: 1, max: 10 }),
        unit: UNITS.MINUTES,
      },
    },
    inputs: [
      {
        search: {
          indices: ['.opendistro-anomaly-results*'],
          query: {
            size: 1,
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      data_end_time: {
                        from: '{{period_end}}||-2m',
                        to: '{{period_end}}',
                        include_lower: true,
                        include_upper: true,
                        boost: 1.0,
                      },
                    },
                  },
                  {
                    term: {
                      detector_id: {
                        value: detectorId,
                        boost: 1.0,
                      },
                    },
                  },
                ],
                adjust_pure_negative: true,
                boost: 1.0,
              },
            },
            sort: [
              {
                anomaly_grade: {
                  order: 'desc',
                },
              },
              {
                confidence: {
                  order: 'desc',
                },
              },
            ],
            aggregations: {
              max_anomaly_grade: {
                max: {
                  field: 'anomaly_grade',
                },
              },
            },
          },
        },
      },
    ],
    triggers: [], //We don't need triggger for AD testing
    lastUpdateTime: moment(1586823218000).subtract(1, 'days').valueOf(),
  };
};

export const randomFixedValue = (features: FeatureAttributes[]): Array<{ featureName: string; data: number }> => {
  const randomValues: Array<{ featureName: string; data: number }> = [];

  if (!features) {
    return randomValues;
  }

  features.forEach((feature) => {
    if (feature.featureEnabled) {
      const randomValue = Math.random() * 100; // generate a random value, e.g., between 0 and 100
      randomValues.push({ featureName: feature.featureName, data: randomValue });
    }
  });

  return randomValues;
};


export const randomImputationOption = (features: FeatureAttributes[]): ImputationOption | undefined => {
  const randomFixedValueMap = randomFixedValue(features);

  const options: ImputationOption[] = [];

  if (Object.keys(randomFixedValueMap).length !== 0) {
    options.push({
      method: ImputationMethod.FIXED_VALUES,
      defaultFill: randomFixedValueMap,
    });
  }

  options.push({ method: ImputationMethod.ZERO });
  options.push({ method: ImputationMethod.PREVIOUS });

  // Select a random option. random in lodash is inclusive of both min and max
  const randomIndex = random(0, options.length);
  if (options.length == randomIndex) {
    return undefined;
  }
  return options[randomIndex];
};

// Helper function to get a random item from an array
function getRandomItem<T>(items: T[]): T {
  return items[random(0, items.length - 1)];
}

// Helper function to generate a random value (for simplicity, let's use a range of 0 to 100)
function getRandomValue(): number {
  return random(0, 100, true); // Generates a random float between 0 and 100
}

export const randomRules = (features: FeatureAttributes[]): Rule[] | undefined => {
  // If there are no features, return undefined
  if (features.length === 0) {
    return undefined;
  }

  const rules: Rule[] = [];

  // Generate a random number of rules (between 1 and 3 for testing)
  const numberOfRules = random(1, 3);

  for (let i = 0; i < numberOfRules; i++) {
    // Random action
    const action = Action.IGNORE_ANOMALY;

    // Generate a random number of conditions (between 1 and 2 for testing)
    const numberOfConditions = random(1, 2);
    const conditions: Condition[] = [];

    for (let j = 0; j < numberOfConditions; j++) {
      const featureName = getRandomItem(features.map((f) => f.featureName));
      const thresholdType = getRandomItem(Object.values(ThresholdType));
      const operator = getRandomItem(Object.values(Operator));
      const value = getRandomValue();

      conditions.push({
        featureName,
        thresholdType,
        operator,
        value,
      });
    }

    // Create the rule with the generated action and conditions
    rules.push({
      action,
      conditions,
    });
  }

  // Randomly decide whether to return undefined or the generated rules
  const shouldReturnUndefined = random(0, 1) === 0;
  return shouldReturnUndefined ? undefined : rules;
};
