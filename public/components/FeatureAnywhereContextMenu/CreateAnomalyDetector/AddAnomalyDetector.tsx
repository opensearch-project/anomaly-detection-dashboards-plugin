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
  ISavedPluginResource,
  VisLayerExpressionFn,
  VisLayerTypes,
} from '../../../../../../src/plugins/vis_augmenter/public';
import { useDispatch } from 'react-redux';
import { isEmpty, get } from 'lodash';
import {
  Field,
  FieldArray,
  FieldArrayRenderProps,
  FieldProps,
  Formik,
} from 'formik';
import {
  createDetector,
  getDetectorCount,
  matchDetector,
  startDetector,
} from '../../../../public/redux/reducers/ad';
import { EmbeddableRenderer } from '../../../../../../src/plugins/embeddable/public';
import './styles.scss';
import EnhancedAccordion from '../EnhancedAccordion';
import MinimalAccordion from '../MinimalAccordion';
import { DataFilterList } from '../../../../public/pages/DefineDetector/components/DataFilterList/DataFilterList';
import {
  getError,
  getErrorMessage,
  isInvalid,
  validateDetectorName,
  validateNonNegativeInteger,
  validatePositiveInteger,
} from '../../../../public/utils/utils';
import {
  CUSTOM_AD_RESULT_INDEX_PREFIX,
  MAX_DETECTORS,
} from '../../../../server/utils/constants';
import {
  focusOnFirstWrongFeature,
  initialFeatureValue,
} from '../../../../public/pages/ConfigureModel/utils/helpers';
import {
  getIndices,
  getMappings,
} from '../../../../public/redux/reducers/opensearch';
import { formikToDetector } from '../../../../public/pages/ReviewAndCreate/utils/helpers';
import { FormattedFormRow } from '../../../../public/components/FormattedFormRow/FormattedFormRow';
import { FeatureAccordion } from '../../../../public/pages/ConfigureModel/components/FeatureAccordion';
import {
  AD_DOCS_LINK,
  AD_HIGH_CARDINALITY_LINK,
  MAX_FEATURE_NUM,
} from '../../../../public/utils/constants';
import { getNotifications } from '../../../../public/services';
import { prettifyErrorMessage } from '../../../../server/utils/helpers';
import {
  ORIGIN_PLUGIN_VIS_LAYER,
  OVERLAY_ANOMALIES,
  VIS_LAYER_PLUGIN_TYPE,
} from '../../../../public/expressions/constants';
import { formikToDetectorName, visFeatureListToFormik } from './helpers';

function AddAnomalyDetector({ embeddable, closeFlyout, mode, setMode }) {
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
    (feature, index) =>
      index <
      (aggList.length < MAX_FEATURE_NUM ? aggList.length : MAX_FEATURE_NUM)
  );

  const notifications = getNotifications();
  const handleValidationAndSubmit = (formikProps) => {
    if (!isEmpty(formikProps.errors)) {
      focusOnFirstWrongFeature(formikProps.errors, formikProps.setFieldTouched);
      notifications.toasts.addDanger('One or more input fields is invalid');
    } else {
      handleSubmit(formikProps);
    }
  };

  const handleSubmit = (formikProps) => {
    formikProps.setSubmitting(true);
    try {
      const detectorToCreate = formikToDetector(formikProps.values);
      dispatch(createDetector(detectorToCreate))
        .then(async (response) => {
          notifications.toasts.addSuccess(
            `Detector created: ${formikProps.values.name}`
          );
          dispatch(startDetector(response.response.id))
            .then((startDetectorResponse) => {
              notifications.toasts.addSuccess(
                `Successfully started the real-time detector`
              );
            })
            .catch((err: any) => {
              notifications.toasts.addDanger(
                prettifyErrorMessage(
                  getErrorMessage(
                    err,
                    'There was a problem starting the real-time detector'
                  )
                )
              );
            });

          const fn = {
            type: VisLayerTypes.PointInTimeEvents,
            name: OVERLAY_ANOMALIES,
            args: {
              detectorId: response.response.id,
            },
          } as VisLayerExpressionFn;

          const pluginResource = {
            type: VIS_LAYER_PLUGIN_TYPE,
            id: response.response.id,
          } as ISavedPluginResource;

          const savedObjectToCreate = {
            title: embeddable.vis.title,
            originPlugin: ORIGIN_PLUGIN_VIS_LAYER,
            pluginResource: pluginResource,
            visId: embeddable.vis.id,
            savedObjectType: 'visualization',
            visLayerExpressionFn: fn,
          } as ISavedAugmentVis;

          // TODO: catch saved object failure
          const savedObject = await createAugmentVisSavedObject(
            savedObjectToCreate
          );

          const saveObjectResponse = await savedObject.save({});
        })
        .catch((err: any) => {
          dispatch(getDetectorCount()).then((response: any) => {
            const totalDetectors = get(response, 'response.count', 0);
            if (totalDetectors === MAX_DETECTORS) {
              notifications.toasts.addDanger(
                'Cannot create detector - limit of ' +
                  MAX_DETECTORS +
                  ' detectors reached'
              );
            } else {
              notifications.toasts.addDanger(
                prettifyErrorMessage(
                  getErrorMessage(
                    err,
                    'There was a problem creating the detector'
                  )
                )
              );
            }
          });
        });
      closeFlyout();
    } catch (e) {
    } finally {
      formikProps.setSubmitting(false);
    }
  };

  const validateVisDetectorName = async (detectorName: string) => {
    if (isEmpty(detectorName)) {
      return 'Detector name cannot be empty';
    } else {
      const error = validateDetectorName(detectorName);
      if (error) {
        return error;
      }
      const resp = await dispatch(matchDetector(detectorName));
      const match = get(resp, 'response.match', false);
      if (!match) {
        return undefined;
      }
      //If more than one detectors found, duplicate exists.
      if (match) {
        return 'Duplicate detector name';
      }
    }
  };

  const initialDetectorValue = {
    name: detectorNameFromVis,
    index: [{ label: embeddable.vis.data.aggs.indexPattern.title }],
    timeField: embeddable.vis.data.indexPattern.timeFieldName,
    interval: intervalValue,
    windowDelay: delayValue,
    shingleSize: 8,
    filterQuery: { match_all: {} },
    description: '',
    resultIndex: undefined,
    filters: [],
    featureList: visFeatureListToFormik(
      featureList,
      embeddable.vis.params.seriesParams
    ),
    categoryFieldEnabled: false,
    realTime: true,
    historical: false,
  };

  return (
    <div className="add-anomaly-detector">
      <Formik
        initialValues={initialDetectorValue}
        onSubmit={handleSubmit}
        validateOnChange={true}
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
                        <a href={AD_DOCS_LINK} target="_blank">
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
                      <EmbeddableRenderer embeddable={embeddable} />
                    </div>
                    <EuiSpacer size="l" />
                    <EuiTitle size="s">
                      <h3>Detector details</h3>
                    </EuiTitle>
                    <EuiSpacer size="m" />

                    <EnhancedAccordion
                      id="detectorDetails"
                      title={detectorNameFromVis}
                      isOpen={accordionsOpen.detectorDetails}
                      onToggle={() => onAccordionToggle('detectorDetails')}
                      subTitle={
                        <EuiText size="m">
                          <p>
                            Detector interval: {intervalValue} minutes; Window
                            delay: {delayValue} minutes
                          </p>
                        </EuiText>
                      }
                    >
                      <Field name="name" validate={validateVisDetectorName}>
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

                      <EuiSpacer size="s" />
                      <Field name="interval" validate={validatePositiveInteger}>
                        {({ field, form }: FieldProps) => (
                          <EuiFlexGroup>
                            <EuiFlexItem style={{ maxWidth: '70%' }}>
                              <FormattedFormRow
                                fullWidth
                                title="Detector interval"
                                isInvalid={isInvalid(field.name, form)}
                                error={getError(field.name, form)}
                              >
                                <EuiFlexGroup
                                  gutterSize="s"
                                  alignItems="center"
                                >
                                  <EuiFlexItem grow={false}>
                                    <EuiFieldNumber
                                      id="detectionInterval"
                                      placeholder="Detector interval"
                                      data-test-subj="detectionInterval"
                                      min={1}
                                      {...field}
                                      onChange={(e) =>
                                        onIntervalChange(e, field)
                                      }
                                    />
                                  </EuiFlexItem>
                                  <EuiFlexItem>
                                    <EuiText>
                                      <p className="minutes">minutes</p>
                                    </EuiText>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                              </FormattedFormRow>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        )}
                      </Field>

                      <EuiSpacer size="s" />
                      <Field
                        name="windowDelay"
                        validate={validateNonNegativeInteger}
                      >
                        {({ field, form }: FieldProps) => (
                          <FormattedFormRow
                            fullWidth
                            title="Window delay"
                            isInvalid={isInvalid(field.name, form)}
                            error={getError(field.name, form)}
                          >
                            <EuiFlexGroup gutterSize="s" alignItems="center">
                              <EuiFlexItem grow={false}>
                                <EuiFieldNumber
                                  id="windowDelay"
                                  placeholder="Window delay"
                                  data-test-subj="windowDelay"
                                  {...field}
                                  onChange={(e) => onDelayChange(e, field)}
                                />
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiText>
                                  <p className="minutes">minutes</p>
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </FormattedFormRow>
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
                              hintLink={AD_DOCS_LINK}
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
                        isUsingDivider={true}
                      >
                        <EuiText size="s">
                          <p>
                            The dashboard does not support high-cardinality
                            detectors.
                            <a href={AD_HIGH_CARDINALITY_LINK} target="_blank">
                              Learn more <EuiIcon type="popout" />
                            </a>
                          </p>
                        </EuiText>
                      </MinimalAccordion>
                    </EnhancedAccordion>

                    <EuiSpacer size="l" />
                    <EuiTitle size="s">
                      <h3>Model Features</h3>
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
                  <EuiButton
                    fill={true}
                    data-test-subj="adAnywhereCreateDetectorButton"
                    isLoading={formikProps.isSubmitting}
                    onClick={() => {
                      handleValidationAndSubmit(formikProps);
                    }}
                  >
                    Create Detector
                  </EuiButton>
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
