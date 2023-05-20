/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Fragment } from 'react';
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
import { useDispatch } from 'react-redux';
import { snakeCase, find, isEmpty, get } from 'lodash';
import {
  Field,
  FieldArray,
  FieldArrayRenderProps,
  FieldProps,
  Form,
  Formik,
  FormikHelpers,
} from 'formik';
import {
  createDetector,
  startDetector,
} from '../../../../public/redux/reducers/ad';
import { EmbeddablePanel } from '../../../../../../src/plugins/embeddable/public';
import './styles.scss';
import EnhancedAccordion from '../EnhancedAccordion';
import MinimalAccordion from '../MinimalAccordion';
import {
  FEATURE_TYPE,
  UNITS,
  Detector,
} from '../../../../public/models/interfaces';
import { DataFilterList } from '../../../../public/pages/DefineDetector/components/DataFilterList/DataFilterList';
import {
  convertTimestampToNumber,
  getError,
  isInvalid,
  validateDetectorName,
  validateFeatureName,
  validatePositiveInteger,
} from '../../../../public/utils/utils';
import { CUSTOM_AD_RESULT_INDEX_PREFIX } from '../../../../server/utils/constants';
import {
  focusOnFirstWrongFeature,
  initialFeatureValue,
} from '../../../../public/pages/ConfigureModel/utils/helpers';
import { FeaturesFormikValues } from '../../../../public/pages/ConfigureModel/models/interfaces';
import {
  getIndices,
  getMappings,
} from '../../../../public/redux/reducers/opensearch';
import {
  featuresToUIMetadata,
  formikToFeatureAttributes,
  formikToFilterQuery,
} from '../../../../public/pages/ReviewAndCreate/utils/helpers';
import { FormattedFormRow } from '../../../../public/components/FormattedFormRow/FormattedFormRow';
import { FeatureAccordion } from '../../../../public/pages/ConfigureModel/components/FeatureAccordion';
import {
  AD_DOCS_LINK,
  MAX_FEATURE_NUM,
} from '../../../../public/utils/constants';

function AddAnomalyDetector({
  embeddable,
  closeFlyout,
  notification,
  services,
  mode,
  setMode,
  index,
  selectedDetectorId,
  setSelectedDetectorId,
}) {
  const dispatch = useDispatch();
  const [queryText, setQueryText] = useState('');
  useEffect(() => {
    const getInitialIndices = async () => {
      await dispatch(getIndices(queryText));
    };
    getInitialIndices();
    dispatch(getMappings(embeddable.vis.data.aggs.indexPattern.title));
  }, []);

  const [isShowVis, setIsShowVis] = useState(false);
  const [accordionsOpen, setAccordionsOpen] = useState({ modelFeatures: true });
  const [detectorNameFromVis, setDetectorNameFromVis] = useState(
    formikToDetectorName(embeddable.vis.title)
  );
  const [intervalValue, setIntervalalue] = useState(10);
  const [delayValue, setDelayValue] = useState(1);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [shingleSizeValue, setShingleSizeValue] = useState(8);

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

  const getFeatureNameFromParams = (id) => {
    let name = find(embeddable.vis.params.seriesParams, function (param) {
      if (param.data.id === id) {
        return true;
      }
    });

    return name.data.label.replace(/[^a-zA-Z0-9-_]/g, '_');
  };

  const handleValidationAndSubmit = (formikProps) => {
    if (!isEmpty(formikProps.errors)) {
      focusOnFirstWrongFeature(formikProps.errors, formikProps.setFieldTouched);
      notification.toasts.addDanger('One or more input fields is invalid');
    } else {
      handleSubmit(formikProps.values);
    }
  };

  const handleSubmit = (values, formikHelpers) => {
    try {
      const detectorToCreate = formikValueToDetector(values);
      dispatch(createDetector(detectorToCreate)).then(async (response) => {
        dispatch(startDetector(response.response.id)).then(
          (startDetectorResponse) => {
            notification.toasts.addSuccess(`Detector created: ${values.name}`);
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
      });
      closeFlyout();
    } catch (e) {
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  function formikValueToDetector(values): Detector {
    const detectionDateRange = values.historical
      ? {
          startTime: convertTimestampToNumber(values.startTime),
          endTime: convertTimestampToNumber(values.endTime),
        }
      : undefined;
    var resultIndex = values.resultIndex;
    if (resultIndex && resultIndex.trim().length > 0) {
      resultIndex = CUSTOM_AD_RESULT_INDEX_PREFIX + resultIndex;
    }
    let detectorBody = {
      name: values.name,
      description: values.description,
      indices: values.indices,
      resultIndex: resultIndex,
      filterQuery: formikToFilterQuery(values),
      uiMetadata: {
        features: {
          ...featuresToUIMetadata(featureListToUIMetadata(values.featureList)),
        },
        filters: get(values, 'filters', []),
      },
      featureAttributes: formikToFeatureAttributes(values.featureList),
      timeField: values.timeField,
      detectionInterval: values.detectionInterval,
      windowDelay: values.windowDelay,
      shingleSize: values.shingleSize,
      categoryField: !isEmpty(values?.categoryField)
        ? values.categoryField
        : undefined,
    } as Detector;
    // Optionally add detection date range
    if (detectionDateRange) {
      detectorBody = {
        ...detectorBody,
        //@ts-ignore
        detectionDateRange: detectionDateRange,
      };
    }

    return detectorBody;
  }

  function featureListToUIMetadata(featureList) {
    return featureList.map(function (value) {
      const oneFeature = {
        featureId: value.featureId,
        featureName: value.featureName,
        featureType: value.featureType,
        featureEnable: true,
        importance: 1,
        aggregationBy: value.aggregationBy,
        aggregationQuery:
          value.featureType === 'simple_aggs'
            ? '{}'
            : formikToUIMetadataAggregation(
                value.featureId,
                value.aggregationBy,
                value.aggregationOf[0].label
              ),
        newFeature: true,
        aggregationOf: formikToAggregationOf(value),
      };

      return oneFeature;
    });
  }

  const initialDetectorValue = {
    name: detectorNameFromVis,
    indices: [embeddable.vis.data.aggs.indexPattern.title],
    timeField: embeddable.vis.data.indexPattern.timeFieldName,
    detectionInterval: {
      period: { interval: intervalValue, unit: UNITS.MINUTES },
    },
    windowDelay: {
      period: { interval: delayValue, unit: UNITS.MINUTES },
    },
    shingleSize: shingleSizeValue,
    filterQuery: { match_all: {} },
    description: '',
    resultIndex: undefined,
    filters: [],
    featureList: featureListToFormik(featureList),
    categoryFieldEnabled: false,
    realTime: true,
    historical: false,
  };

  const handleAssociate = async (detectorId: string) => {
    console.log('inside handleAssociate');
    enum VisLayerTypes {
      PointInTimeEvents = 'PointInTimeEvents',
    }

    const fn = {
      type: VisLayerTypes.PointInTimeEvents,
      name: 'overlay_anomalies',
      args: {
        detectorId: detectorId,
      },
    } as VisLayerExpressionFn;

    const savedObjectToCreate = {
      title: 'test-title',
      pluginResourceId: detectorId,
      visId: embeddable.vis.id,
      visLayerExpressionFn: fn,
    } as ISavedAugmentVis;

    const savedObject = await createAugmentVisSavedObject(savedObjectToCreate);

    const response = await savedObject.save({});
    closeFlyout();
  };

  function formikToDetectorName(title) {
    const detectorName =
      title +
      '_anomaly_detector_' +
      Math.floor(100000 + Math.random() * 900000);
    detectorName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return detectorName;
  }

  function formikToAggregationOf(value) {
    return [
      {
        label: value.aggregationOf[0].label,
        type: 'number',
      },
    ];
  }

  function formikToUIMetadataAggregation(featureId, aggMethod, fieldName) {
    const returnVal = {
      [snakeCase(getFeatureNameFromParams(featureId))]: {
        [aggMethod]: { field: fieldName },
      },
    };
    return returnVal;
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

  return (
    <div className="add-anomaly-detector">
      <Formik
        initialValues={initialDetectorValue}
        onSubmit={handleSubmit}
        validateOnChange={false}
      >
        {(formikProps) => (
          <>
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
                      <Field name="name" validate={validateDetectorName}>
                        {({ field, form }: FieldProps) => (
                          <FormattedFormRow
                            title="Name"
                            isInvalid={isInvalid(field.name, form)}
                            error={getError(field.name, form)}
                          >
                            <EuiFieldText
                              data-test-subj="detectorNameTextInputFlyout"
                              isInvalid={isInvalid(field.name, form)}
                              {...field}
                              onChange={(e) => onDetectorNameChange(e, field)}
                            />
                          </FormattedFormRow>
                        )}
                      </Field>

                      <Field name="detectionInterval.period.interval">
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

                      <Field name="windowDelay.period.interval">
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
                          <p>
                            Source:{' '}
                            {embeddable.vis.data.aggs.indexPattern.title}
                          </p>
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
                        <Field
                          name="shingleSize"
                          validate={validatePositiveInteger}
                        >
                          {({ field, form }: FieldProps) => (
                            <FormattedFormRow
                              title="Shingle size"
                              hint={[
                                `Set the number of intervals to consider in a detection
                                window for your model. The anomaly detector expects the
                                shingle size to be in the range of 1 and 60. The default
                                shingle size is 8. We recommend that you don’t choose 1
                                unless you have two or more features. Smaller values might
                                increase recall but also false positives. Larger values
                                might be useful for ignoring noise in a signal.`,
                              ]}
                              hintLink={`${AD_DOCS_LINK}/ad`}
                              isInvalid={isInvalid(field.name, form)}
                              error={getError(field.name, form)}
                            >
                              <EuiFlexGroup gutterSize="s" alignItems="center">
                                <EuiFlexItem grow={false}>
                                  <EuiFieldNumber
                                    id="shingleSize"
                                    placeholder="Shingle size"
                                    data-test-subj="shingleSize"
                                    {...field}
                                  />
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  <EuiText>
                                    <p className="minutes">intervals</p>
                                  </EuiText>
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </FormattedFormRow>
                          )}
                        </Field>
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
                                  checked={enabled}
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
                    >
                      <EuiSpacer size="s" />

                      <FieldArray name="featureList">
                        {({
                          push,
                          remove,
                          form: { values },
                        }: FieldArrayRenderProps) => {
                          return (
                            <Fragment>
                              {values.featureList.map(
                                (feature: any, index: number) => (
                                  <FeatureAccordion
                                    onDelete={() => {
                                      remove(index);
                                    }}
                                    index={index}
                                    feature={feature}
                                    handleChange={formikProps.handleChange}
                                    displayMode="flyout"
                                  />
                                )
                              )}
                              <EuiPanel paddingSize="none">
                                <EuiButton
                                  className="featureButton"
                                  data-test-subj="addFeature"
                                  isDisabled={
                                    values.featureList.length >= MAX_FEATURE_NUM
                                  }
                                  onClick={() => {
                                    push(initialFeatureValue());
                                  }}
                                >
                                  Add another feature
                                </EuiButton>
                              </EuiPanel>
                              <EuiSpacer size="s" />
                              <EuiText className="content-panel-subTitle">
                                <p>
                                  You can add up to{' '}
                                  {Math.max(
                                    MAX_FEATURE_NUM - values.featureList.length,
                                    0
                                  )}{' '}
                                  more features.
                                </p>
                              </EuiText>
                            </Fragment>
                          );
                        }}
                      </FieldArray>
                    </EnhancedAccordion>
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
                  {mode === 'existing' ? (
                    <EuiButton
                      fill={true}
                      data-test-subj="adAnywhereCreateDetectorButton"
                      isLoading={formikProps.isSubmitting}
                      onClick={() => handleAssociate(selectedDetectorId)}
                    >
                      associate detector
                    </EuiButton>
                  ) : (
                    <EuiButton
                      fill={true}
                      data-test-subj="adAnywhereCreateDetectorButton"
                      isLoading={formikProps.isSubmitting}
                      //onClick={formikProps.handleSubmit}
                      onClick={() => {
                        handleValidationAndSubmit(formikProps);
                      }}
                    >
                      create detector
                    </EuiButton>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </>
        )}
      </Formik>
    </div>
  );
}

export default AddAnomalyDetector;
