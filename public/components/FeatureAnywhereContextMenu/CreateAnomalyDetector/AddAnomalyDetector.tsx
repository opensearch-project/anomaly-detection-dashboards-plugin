/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiFormFieldset,
  EuiCheckableCard,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiSwitch,
  EuiButtonIcon,
  EuiFormRow,
  EuiFieldText,
  EuiCheckbox,
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiCallOut,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import './styles.scss';
import {
  createAugmentVisSavedObject,
  ISavedAugmentVis,
  VisLayerExpressionFn,
} from '../../../../../../src/plugins/vis_augmenter/public';
import { useDispatch, useSelector } from 'react-redux';
import { snakeCase, find, isEmpty, get } from 'lodash';
import { Field, FieldProps, Form, Formik, FormikHelpers } from 'formik';
import {
  createDetector,
  matchDetector,
  startDetector,
} from '../../../../public/redux/reducers/ad';
import { EmbeddablePanel } from '../../../../../../src/plugins/embeddable/public';
import './styles.scss';
import EnhancedAccordion from '../EnhancedAccordion';
import MinimalAccordion from '../MinimalAccordion';
import {
  FeatureAttributes,
  FEATURE_TYPE,
  UNITS,
} from '../../../../public/models/interfaces';
import { AppState } from '../../../../public/redux/reducers';
import {
  AGGREGATION_TYPES,
  FEATURE_TYPE_OPTIONS,
} from '../../../../public/pages/ConfigureModel/utils/constants';
import { DataFilterList } from '../../../../public/pages/DefineDetector/components/DataFilterList/DataFilterList';
import {
  isInvalid,
  validateDetectorName,
} from '../../../../public/utils/utils';
import { CUSTOM_AD_RESULT_INDEX_PREFIX } from '../../../../server/utils/constants';
import { Fragment } from 'react';
import { formikToSimpleAggregation } from '../../../../public/pages/ConfigureModel/utils/helpers';
import { FeaturesFormikValues } from '../../../../public/pages/ConfigureModel/models/interfaces';
import { AggregationSelector } from '../../../../public/pages/ConfigureModel/components/AggregationSelector';
import { CustomAggregation } from '../../../../public/pages/ConfigureModel/components/CustomAggregation';

function AddAnomalyDetector({
  embeddable,
  closeFlyout,
  core,
  services,
  mode,
  setMode,
  index,
}) {
  const dispatch = useDispatch();
  const isLoading = useSelector((state: AppState) => state.ad.requesting);

  const [isShowVis, setIsShowVis] = useState(false);
  const [accordionsOpen, setAccordionsOpen] = useState({});
  const [detectorNameFromVis, setDetectorNameFromVis] = useState(
    formikToDetectorName(embeddable.vis.title)
  );
  const [intervalValue, setIntervalalue] = useState(10);
  const [delayValue, setDelayValue] = useState(1);

  const [enabled, setEnabled] = useState<boolean>(false);

  const title = embeddable.getTitle();

  const onAccordionToggle = (key) => {
    const newAccordionsOpen = { ...accordionsOpen };
    newAccordionsOpen[key] = !accordionsOpen[key];
    setAccordionsOpen(newAccordionsOpen);
  };
  const onDetectorNameChange = (e, field) => {
    field.onChange(e);
    setDetectorNameFromVis(e.target.value);
  };
  const onIntervalChange = (e, field) => {
    field.onChange(e);
    setIntervalalue(e.target.value);
  };
  const onDelayChange = (e, field) => {
    field.onChange(e);
    setDelayValue(e.target.value);
  };

  const aggList = embeddable.vis.data.aggs.aggs.filter(
    (feature) => feature.schema == 'metric'
  );

  const featureList = aggList.filter(
    (feature, index) => index < (aggList.length < 5 ? aggList.length : 5)
  );
  // console.log('featureList: ', JSON.stringify(featureList));

  // console.log("feature list size: " + featureList.length)
  // console.log("feature name: " + featureList[0].data.label)

  const [shingleSizeValue, setShingleSizeValue] = useState(8);

  const shingleSizeOnChange = (e) => {
    setShingleSizeValue(e.target.value);
  };

  const getFeatureNameFromParams = (id) => {
    let name = find(embeddable.vis.params.seriesParams, function (param) {
      if (param.data.id === id) {
        return true;
      }
    });
    return name.data.label;
  };

  let defaultFeatureList = [];
  featureList.map((feature) =>
    defaultFeatureList.push({
      id: feature.id,
      featureName: getFeatureNameFromParams(feature.id),
      field: feature.params.field.name,
      aggMethod: feature.type.title,
    })
  );

  const [feautreListToRender, setFeatureListToRender] =
    useState(defaultFeatureList);

  const handleDeleteFeature = (id) => {
    setFeatureListToRender(
      feautreListToRender.filter((feature) => feature.id !== id)
    );
  };

  const handleAddFeature = () => {
    let uuid = Math.floor(100000 + Math.random() * 900000);
    const emptyFeatureComponenet = {
      id: uuid,
      featureName: 'feature_' + uuid,
      field: 'byte',
      aggMethod: 'avg',
    };
    setFeatureListToRender([...feautreListToRender, emptyFeatureComponenet]);
  };

  const handleSubmit = (values) => {
    console.log('submit');
    try {
      dispatch(createDetector(values)).then(async (response) => {
        console.log('detector id here: ' + response.response.id);
        dispatch(startDetector(response.response.id)).then(
          (startDetectorResponse) => {
            core.notifications.toasts.addSuccess(
              `Detector created: ${values.name}`
            );
          }
        );
        enum VisLayerTypes {
          PointInTimeEvents = 'PointInTimeEvents',
        }
        const fn = {
          type: VisLayerTypes.PointInTimeEvents,
          name: 'overlay_anomalies',
          args: {
            detectorId: response.response.id,
          },
        } as VisLayerExpressionFn;

        const savedObjectToCreate = {
          title: embeddable.vis.title,
          pluginResourceId: response.response.id,
          visId: embeddable.vis.id,
          savedObjectType: 'visualization',
          visLayerExpressionFn: fn,
        } as ISavedAugmentVis;

        const savedObject = await createAugmentVisSavedObject(
          savedObjectToCreate
        );

        const saveObjectResponse = await savedObject.save({});
        console.log('response: ' + JSON.stringify(saveObjectResponse));
      });
      closeFlyout();
    } catch (e) {
      console.log('errrrrror: ' + e);
    } finally {
    }
  };

  const initialDetectorValue = {
    name: detectorNameFromVis,
    indices: formikToIndicesArray(embeddable.vis.data.aggs.indexPattern.title),
    timeField: embeddable.vis.data.indexPattern.timeFieldName,
    detectionInterval: {
      period: { interval: intervalValue, unit: UNITS.MINUTES },
    },
    windowDelay: {
      period: { interval: delayValue, unit: UNITS.MINUTES },
    },
    shingleSize: shingleSizeValue,
    featureAttributes: formikToFeatureAttributes(featureList),
    filterQuery: { match_all: {} },
    description: '',
    resultIndex: undefined,
    filters: [],
    featureList: featureListToFormik(featureList),
  };

  function formikToDetectorName(title) {
    const detectorName =
      title +
      '_anomaly_detector_' +
      Math.floor(100000 + Math.random() * 900000);
    detectorName.replace(/ /g, '_');
    return detectorName;
  }

  function formikToIndicesArray(indexString) {
    return [indexString];
  }

  function formikToFeatureAttributes(values) {
    //@ts-ignore
    return values.map(function (value) {
      return {
        featureId: value.id,
        featureName: getFeatureNameFromParams(value.id),
        featureEnabled: true,
        importance: 1,
        aggregationQuery: formikToAggregation(value),
      };
    });
  }

  function formikToAggregation(value) {
    return {
      [snakeCase(getFeatureNameFromParams(value.id))]: {
        avg: { field: value.params.field.name },
      },
    };
  }

  function featureListToFormik(featureList): FeaturesFormikValues[] {
    return featureList.map((feature) => {
      return {
        featureId: feature.id,
        featureName: getFeatureNameFromParams(feature.id),
        featureEnabled: true,
        featureType: FEATURE_TYPE.SIMPLE,
        aggregationBy: 'avg',
        aggregationOf: [{ label: feature.params.field.name }],
        aggregationQuery: formikToAggregation(feature),
      };
    });
  }

  // const handleValidateName = async (detectorName: string) => {
  //   if (isEmpty(detectorName)) {
  //     return 'Detector name cannot be empty';
  //   } else {
  //     const error = validateDetectorName(detectorName);
  //     if (error) {
  //       return error;
  //     }
  //     const resp = await dispatch(matchDetector(detectorName));
  //     const match = get(resp, 'response.match', false);
  //     if (!match) {
  //       return undefined;
  //     }
  //     //If more than one detectors found, duplicate exists.
  //     if (match) {
  //       return 'Duplicate detector name';
  //     }
  //   }
  // };

  //console.log('initialDetectorValue: ', JSON.stringify(initialDetectorValue));

  return (
    <div className="add-anomaly-detector">
      <Formik
        initialValues={initialDetectorValue}
        onSubmit={handleSubmit}
        validateOnChange={false}
      >
        {(formikProps) => (
          <Form>
            <EuiFlyoutHeader hasBorder>
              <EuiTitle>
                <h2 id="add-anomaly-detector__title">Add anomaly detector</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <div className="add-anomaly-detector__scroll">
                <EuiFormFieldset
                  legend={{
                    display: 'hidden',
                    children: (
                      <EuiTitle>
                        <span>
                          Options to create a new detector or associate an
                          existing detector
                        </span>
                      </EuiTitle>
                    ),
                  }}
                  className="add-anomaly-detector__modes"
                >
                  {[
                    {
                      id: 'add-anomaly-detector__create',
                      label: 'Create new detector',
                      value: 'create',
                    },
                    {
                      id: 'add-anomaly-detector__existing',
                      label: 'Associate existing detector',
                      value: 'existing',
                    },
                  ].map((option) => (
                    <EuiCheckableCard
                      {...{
                        ...option,
                        key: option.id,
                        name: option.id,
                        checked: option.value === mode,
                        onChange: () => setMode(option.value),
                      }}
                    />
                  ))}
                </EuiFormFieldset>
                <EuiSpacer size="m" />
                {mode === 'create' && (
                  <div className="create-new">
                    <EuiText size="xs">
                      <p>
                        Create and configure an anomaly detector to
                        automatically detect anomalies in your data and to view
                        real-time results on the visualization.{' '}
                        <a
                          href="https://opensearch.org/docs/latest/observing-your-data/ad/index/"
                          target="_blank"
                        >
                          Learn more <EuiIcon type="popout" />
                        </a>
                      </p>
                    </EuiText>
                    <EuiSpacer size="m" />
                    <div className="create-new__title-and-toggle">
                      <EuiTitle size="xxs">
                        <h4>
                          <EuiIcon
                            type="visLine"
                            className="create-new__title-icon"
                          />
                          {title}
                        </h4>
                      </EuiTitle>
                      <EuiSwitch
                        label="Show visualization"
                        checked={isShowVis}
                        onChange={() => setIsShowVis(!isShowVis)}
                      />
                    </div>
                    <div
                      className={`create-new__vis ${
                        !isShowVis && 'create-new__vis--hidden'
                      }`}
                    >
                      <EuiSpacer size="s" />
                      <EmbeddablePanel
                        embeddable={embeddable}
                        getActions={() => Promise.resolve([])}
                        inspector={{ isAvailable: () => false }}
                        hideHeader
                        isRetained
                        isBorderless
                      />
                    </div>
                    <EuiSpacer size="l" />
                    <EuiTitle size="s">
                      <h3>Detector details</h3>
                    </EuiTitle>
                    <EuiSpacer size="m" />
                    {/* {!index && <EuiLoadingSpinner size="l" />} */}
                    {/* Do not initialize until index is available */}

                    <EnhancedAccordion
                      id="detectorDetails"
                      title={detectorNameFromVis}
                      initialIsOpen={false}
                      isOpen={accordionsOpen.detectorDetails}
                      onToggle={() => onAccordionToggle('detectorDetails')}
                      subTitle={
                        <EuiText size="m">
                          <p>
                            Detector interval: {intervalValue} minutes; Window
                            delay: {delayValue} minute
                          </p>
                        </EuiText>
                      }
                    >
                      <Field name="name">
                        {({ field, form }: FieldProps) => (
                          <EuiFormRow label="Detector name">
                            <EuiFieldText
                              data-test-subj="detectorNameTextInputFlyout"
                              isInvalid={isInvalid(field.name, form)}
                              {...field}
                              onChange={(e) => onDetectorNameChange(e, field)}
                            />
                          </EuiFormRow>
                        )}
                      </Field>

                      <Field name="detectionInterval">
                        {({ field, form }: FieldProps) => (
                          <EuiFormRow label="Detector interval">
                            <EuiFlexGroup gutterSize="s" alignItems="center">
                              <EuiFlexItem grow={false}>
                                <EuiFieldNumber
                                  data-test-subj="detectionIntervalFlyout"
                                  min={1}
                                  {...field}
                                  onChange={(e) => onIntervalChange(e, field)}
                                />
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiText>
                                  <p className="minutes">minutes</p>
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFormRow>
                        )}
                      </Field>

                      <Field name="windowDelay">
                        {({ field, form }: FieldProps) => (
                          <EuiFormRow label="Window delay">
                            <EuiFlexGroup gutterSize="s" alignItems="center">
                              <EuiFlexItem grow={false}>
                                <EuiFieldNumber
                                  name="detectorDelay"
                                  id="detectorDelay"
                                  data-test-subj="detectorDelay"
                                  {...field}
                                  min={1}
                                  onChange={(e) => onDelayChange(e, field)}
                                />
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiText>
                                  <p className="minutes">minutes</p>
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFormRow>
                        )}
                      </Field>
                    </EnhancedAccordion>

                    <EuiSpacer size="m" />

                    <EnhancedAccordion
                      id="advancedConfiguration"
                      title="Advanced Configuration"
                      isOpen={accordionsOpen.advancedConfiguration}
                      onToggle={() =>
                        onAccordionToggle('advancedConfiguration')
                      }
                      initialIsOpen={false}
                    >
                      <EuiSpacer size="s" />
                      <MinimalAccordion
                        id="dataFilter"
                        title="Data Filter"
                        subTitle="Choose a data source subset to focus the data stream and reduce data noise."
                        initialIsOpen={false}
                      >
                        <EuiSpacer size="s" />
                        <EuiText size="xs">
                          <p>Source: {embeddable.vis.params.index_pattern}</p>
                        </EuiText>
                        <EuiSpacer size="s" />
                        <DataFilterList formikProps={formikProps} />
                      </MinimalAccordion>

                      <MinimalAccordion
                        id="shingleSize"
                        title="Shingle size"
                        subTitle="Set number of intervals in the model's detection window."
                        initialIsOpen={false}
                        isUsingDivider={true}
                      >
                        <EuiSpacer size="m" />
                        <EuiText size="xs">
                          <p>
                            The anomaly detector expects the single size to be
                            between 1 and 60. The default shingle size is 8. We
                            recommend that you don't choose 1 unless you have 2
                            or more features. Smaller values might increase
                            recall but also false positives. Larger values might
                            be useful for ignoring noise in a signal.
                            <a
                              href="https://opensearch.org/docs/latest/observing-your-data/ad/index/"
                              target="_blank"
                            >
                              Learn more <EuiIcon type="popout" />
                            </a>
                          </p>
                        </EuiText>
                        <EuiSpacer size="s" />

                        <EuiFieldNumber
                          value={shingleSizeValue}
                          onChange={(e) => shingleSizeOnChange(e)}
                          aria-label="intervals"
                        />
                      </MinimalAccordion>

                      <MinimalAccordion
                        id="customResultIndex"
                        title="Custom result index"
                        subTitle="Store detector results to our own index."
                        initialIsOpen={false}
                        isUsingDivider={true}
                      >
                        <Field name="resultIndex">
                          {({ field, form }: FieldProps) => (
                            <EuiFlexGroup direction="column">
                              <EuiFlexItem>
                                <EuiCheckbox
                                  id={'resultIndexCheckbox'}
                                  label="Enable custom result index"
                                  onChange={() => {
                                    if (enabled) {
                                      form.setFieldValue('resultIndex', '');
                                    }
                                    setEnabled(!enabled);
                                  }}
                                />
                              </EuiFlexItem>

                              {enabled ? (
                                <EuiFlexItem>
                                  <EuiCallOut
                                    data-test-subj="cannotEditResultIndexCallout"
                                    title="You can't change the custom result index after you create the detector. You can manage the result index with the Index Management plugin."
                                    color="warning"
                                    iconType="alert"
                                    size="s"
                                  ></EuiCallOut>
                                </EuiFlexItem>
                              ) : null}

                              {enabled ? (
                                <EuiFlexItem>
                                  <EuiFormRow
                                    label="Field"
                                    isInvalid={isInvalid(field.name, form)}
                                    helpText={`Custom result index name must contain less than 255 characters including the prefix "opensearch-ad-plugin-result-". Valid characters are a-z, 0-9, -(hyphen) and _(underscore).`}
                                  >
                                    <EuiFieldText
                                      id="resultIndex"
                                      placeholder="Enter result index name"
                                      prepend={CUSTOM_AD_RESULT_INDEX_PREFIX}
                                      {...field}
                                    />
                                  </EuiFormRow>
                                </EuiFlexItem>
                              ) : null}
                            </EuiFlexGroup>
                          )}
                        </Field>
                      </MinimalAccordion>

                      <MinimalAccordion
                        id="categoricalFields"
                        title="Categorical fields"
                        subTitle="Split a single time series into multiple time series based on categorical fields."
                        initialIsOpen={false}
                        isUsingDivider={true}
                      >
                        <EuiText size="s">
                          <p>
                            The dashboard does not support high-cardinality
                            detectors.
                            <a
                              href="https://opensearch.org/docs/latest/observing-your-data/ad/index/"
                              target="_blank"
                            >
                              Learn more <EuiIcon type="popout" />
                            </a>
                          </p>
                        </EuiText>
                      </MinimalAccordion>
                    </EnhancedAccordion>

                    <EuiSpacer size="l" />
                    <EuiTitle size="s">
                      <h3>Model Features </h3>
                    </EuiTitle>
                    <EuiSpacer size="m" />

                    <EnhancedAccordion
                      id="modelFeatures"
                      title="Features"
                      isOpen={accordionsOpen.modelFeatures}
                      onToggle={() => onAccordionToggle('modelFeatures')}
                      initialIsOpen={true}
                    >
                      <EuiSpacer size="s" />

                      {feautreListToRender.map((feature, index) => {
                        return (
                          <MinimalAccordion
                            id={feature.id}
                            title={feature.featureName}
                            subTitle={`Field: ${feature.field}, Aggregation method: ${feature.aggMethod}`}
                            initialIsOpen={false}
                            isUsingDivider={index == 0 ? false : true}
                            extraAction={
                              <EuiButtonIcon
                                iconType="trash"
                                color="text"
                                aria-label={`Delete ${feature.featureName}`}
                                onClick={() => handleDeleteFeature(feature.id)}
                              />
                            }
                          >
                            <EuiFormRow label="Feature name">
                              <EuiFieldText value={feature.featureName} />
                            </EuiFormRow>

                            <Field>
                              {({ field, form }: FieldProps) => (
                                <Fragment>
                                  <EuiFormRow
                                    label="Find anomalies based on"
                                    // isInvalid={isInvalid(field.name, form)}
                                    // error={getError(field.name, form)}
                                  >
                                    <EuiSelect
                                      {...field}
                                      options={FEATURE_TYPE_OPTIONS}
                                      onChange={(e) => {
                                        console.log(
                                          'change',
                                          JSON.stringify(field)
                                        );
                                        // formikProps.handleChange(e);
                                        // if (e.currentTarget.value === FEATURE_TYPE.CUSTOM) {
                                        //   const aggregationQuery = {
                                        //     [feature.featureName]: {
                                        //       [feature.aggMethod]: { field: feature.field },
                                        //     },
                                        //   };
                                        //   form.setFieldValue(
                                        //     `featureList.${index}.aggregationQuery`,
                                        //     JSON.stringify(aggregationQuery, null, 4)
                                        //   );
                                        // }
                                      }}
                                    />
                                  </EuiFormRow>
                                  {field.value.featureList[index]
                                    .featureType === FEATURE_TYPE.SIMPLE && (
                                    <AggregationSelector index={index} />
                                  )}
                                  {field.value.featureList[index]
                                    .featureType === FEATURE_TYPE.CUSTOM && (
                                    <CustomAggregation index={index} />
                                  )}
                                </Fragment>
                              )}
                            </Field>
                          </MinimalAccordion>
                        );
                      })}
                    </EnhancedAccordion>
                    <EuiSpacer size="m" />
                    <EuiPanel paddingSize="none">
                      <EuiButtonEmpty
                        className="featureButton"
                        onClick={() => handleAddFeature()}
                        iconType="plusInCircle"
                      >
                        Add feature
                      </EuiButtonEmpty>
                    </EuiPanel>
                    <EuiSpacer size="m" />
                  </div>
                )}
              </div>
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={closeFlyout}>Cancel</EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill={true}
                    data-test-subj="adAnywhereCreateDetectorButton"
                    isLoading={formikProps.isSubmitting}
                    onClick={() => {
                      console.log('formikProps: ', JSON.stringify(formikProps));
                      formikProps.handleSubmit();
                    }}
                  >
                    {mode === 'existing' ? 'Associate' : 'Create'} detector
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default AddAnomalyDetector;
