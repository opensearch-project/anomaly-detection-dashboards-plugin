/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useState} from 'react';
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
  EuiButtonEmpty
} from '@elastic/eui';
import './styles.scss';
import {
  createAugmentVisSavedObject,
  ISavedAugmentVis,
  VisLayerExpressionFn,
} from '../../../../../../src/plugins/vis_augmenter/public';
import { useDispatch, useSelector } from 'react-redux';
import { snakeCase, find } from 'lodash';
import { Field, FieldProps, Form, Formik, FormikHelpers } from 'formik';
import { createDetector, startDetector } from '../../../../public/redux/reducers/ad';
import { EmbeddablePanel } from '../../../../../../src/plugins/embeddable/public';
import './styles.scss';
import EnhancedAccordion from '../EnhancedAccordion';
import MinimalAccordion from '../MinimalAccordion';
import { Detector, UNITS } from '../../../../public/models/interfaces';
import { AppState } from '../../../../public/redux/reducers';
import { AGGREGATION_TYPES } from '../../../../public/pages/ConfigureModel/utils/constants';
import { DataFilterList } from '../../../../public/pages/DefineDetector/components/DataFilterList/DataFilterList';

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
  const [detectorNameFromVis, setDetectorNameFromVis] = useState(formikToDetectorName(embeddable.vis.title))
  const [intervalValue, setIntervalalue] = useState(10);
  const [delayValue, setDelayValue] = useState(1);

  const onAccordionToggle = (key) => {
    const newAccordionsOpen = { ...accordionsOpen };
    newAccordionsOpen[key] = !accordionsOpen[key];
    setAccordionsOpen(newAccordionsOpen);
  };

  const title = embeddable.getTitle();

  const intervalOnChange = (e) => {
    setIntervalalue(e.target.value);
  };
  
  const delayOnChange = (e) => {
    setDelayValue(e.target.value);
  };

  const aggList = embeddable.vis.data.aggs.aggs.filter((feature) => feature.schema == "metric");

  const featureList = aggList.filter((feature, index) => index < (aggList.length < 5 ? aggList.length : 5));
  console.log("featureList: ", JSON.stringify(featureList))

  // console.log("feature list size: " + featureList.length)
  // console.log("feature name: " + featureList[0].data.label)

  const anomaliesOptions = [
    { value: 'option_one', text: 'Field value' },
    { value: 'option_two', text: 'Custom expression' },
  ];
  const [anomaliesValue, setAnomaliesValue] = useState(anomaliesOptions[0].value);
  const anomaliesOnChange = (e) => {
    setAnomaliesValue(e.target.value);
  };

  const AGGREGATION_TYPES = [
    { value: 'sum', text: 'sum()' },
  ];
  
  const [aggMethodValue, setAggMethodValue] = useState();
  const aggMethodOnChange = (e) => {
    setAggMethodValue(e.target.value);
  };

  const [shingleSizeValue, setShingleSizeValue] = useState(8);

  const shingleSizeOnChange = (e) => {
    setShingleSizeValue(e.target.value);
  };

  const [checked, setChecked] = useState(false);
  const onCustomerResultIndexCheckboxChange = (e) => {
    setChecked(e.target.checked);
  };

  const getFeatureNameFromParams = (id) => {
    let name = find(embeddable.vis.params.seriesParams, function (param) {
      if (param.data.id === id) {
        return true
      }
    })
    return name.data.label
  }

  let defaultFeatureList = []
  featureList.map((feature) => (
    defaultFeatureList.push({
      id: feature.id,
      featureName: getFeatureNameFromParams(feature.id),
      field: feature.params.field.name,
      aggMethod: feature.type.title
    })
  )) 

  const [feautreListToRender, setFeatureListToRender] = useState(defaultFeatureList)

  const handleDeleteFeature = (id) => {
    setFeatureListToRender(feautreListToRender.filter(feature => feature.id !== id))
  }

  const handleAddFeature =() => {
    let uuid = Math.floor(100000 + Math.random() * 900000);
    const emptyFeatureComponenet = {
      id: uuid,
      featureName: 'feature_' + uuid,
      field: 'byte',
      aggMethod: 'avg'
    }
    setFeatureListToRender([...feautreListToRender, emptyFeatureComponenet])
  }


  const handleSubmit = () => {
    try {
      dispatch(createDetector(initialDetectorValue)).then(async (response) => {
        console.log("detector id here: " + response.response.id)
        dispatch(startDetector(response.response.id)).then((startDetectorResponse) => {
          core.notifications.toasts.addSuccess(
            `Detector created: ${initialDetectorValue.name}`
          );
        })
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
    
        const savedObject = await createAugmentVisSavedObject(savedObjectToCreate);
    
        const saveObjectResponse = await savedObject.save({});
        console.log('response: ' + JSON.stringify(saveObjectResponse));
      })
      closeFlyout();
    } catch (e) {
        console.log("errrrrror: " + e)
    } finally {
    }
  }

  const initialDetectorValue = {
    name: detectorNameFromVis,
    indices:  formikToIndicesArray(embeddable.vis.data.aggs.indexPattern.title),
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
  }

  function formikToDetectorName(title) {
    const detectorName = title + "_anomaly_detector_" + Math.floor(100000 + Math.random() * 900000);
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
        aggregationQuery: formikToAggregation(value)
      };
    });
  }

  function formikToAggregation(value) {
    return {
      [snakeCase(getFeatureNameFromParams(value.id))]: {
        sum: { field: value.params.field.name },
      },
    }
  }

  console.log("initialDetectorValue: ", JSON.stringify(initialDetectorValue))
    

  return (
    <div className="add-anomaly-detector">
      <Formik 
        initialValues={initialDetectorValue}
        onSubmit={handleSubmit}
        validateOnChange={false}>
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
                          <span>Options to create a new detector or associate an existing detector</span>
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
                          Create and configure an anomaly detector to automatically detect anomalies in your data and 
                          to view real-time results on the visualization. {' '}
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
                            <EuiIcon type="visLine" className="create-new__title-icon" />
                            {title}
                          </h4>
                        </EuiTitle>
                        <EuiSwitch
                          label="Show visualization"
                          checked={isShowVis}
                          onChange={() => setIsShowVis(!isShowVis)}
                        />
                      </div>
                      <div className={`create-new__vis ${!isShowVis && 'create-new__vis--hidden'}`}>
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
                        id='detectorDetails'
                        title={detectorNameFromVis}
                        initialIsOpen={false}
                        isOpen={accordionsOpen.detectorDetails}
                        onToggle={() => onAccordionToggle('detectorDetails')}
                        subTitle={
                          <EuiText size="m">
                            <p>
                              Detector interval: {intervalValue} minutes; Window delay: {delayValue} minute
                            </p>
                          </EuiText>
                        }>

                        <EuiFormRow label="Detector name">
                          <EuiFieldText 
                            value={detectorNameFromVis}
                            onChange={(e) => setDetectorNameFromVis(e.target.value)} />
                        </EuiFormRow>
                        
                      
                        <EuiFormRow label="Detector interval">
                          <EuiFlexGroup gutterSize="s" alignItems="center">
                            <EuiFlexItem grow={false}>
                              <EuiFieldNumber
                                name="detectorInterval"
                                id="detectorInterval"
                                data-test-subj="detectionInterval"
                                min={1}
                                value={intervalValue}
                                onChange={(e) => intervalOnChange(e)}
                              />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiText>
                                <p className="minutes">minutes</p>
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFormRow>


                        <EuiFormRow label="Window delay">
                          <EuiFlexGroup gutterSize="s" alignItems="center">
                              <EuiFlexItem grow={false}>
                                <EuiFieldNumber
                                  name="detectorDelay"
                                  id="detectorDelay"
                                  data-test-subj="detectorDelay"
                                  min={1}
                                  value={delayValue}
                                  onChange={(e) => delayOnChange(e)}
                                />
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiText>
                                  <p className="minutes">minutes</p>
                                </EuiText>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFormRow>
                      </EnhancedAccordion>
                
                      <EuiSpacer size="m" />
                      
                      <EnhancedAccordion
                        id='advancedConfiguration'
                        title="Advanced Configuration"
                        isOpen={accordionsOpen.advancedConfiguration}
                        onToggle={() => onAccordionToggle('advancedConfiguration')}
                        initialIsOpen={false}>
                
                        <EuiSpacer size="s" />
                        <MinimalAccordion 
                          id='dataFilter' 
                          title="Data Filter" 
                          subTitle="Choose a data source subset to focus the data stream and reduce data noise."
                          initialIsOpen={false}>
                          
                          <EuiSpacer size="s" />
                          <EuiText size="xs">
                            <p>
                              Source: {embeddable.vis.params.index_pattern}
                            </p>
                          </EuiText>
                          <EuiSpacer size="s" />
                          <EuiButtonEmpty
                            size="xs"
                            onClick={() => {

                            }}>
                            + Add data filter
                          </EuiButtonEmpty>
                          {/* <DataFilterList
                            formikProps={formikProps}
                          /> */}
                        </MinimalAccordion>
                
                        <MinimalAccordion 
                          id='shingleSize' 
                          title="Shingle size" 
                          subTitle="Set number of intervals in the model's detection window."
                          initialIsOpen={false}
                          isUsingDivider={true}>
                          
                          <EuiSpacer size="m" />
                          <EuiText size="xs">
                            <p>
                              The anomaly detector expects the single size to be between 1 and 60. The default shingle size
                              is 8. We recommend that you don't choose 1 unless you have 2 or more features. Smaller values 
                              might increase recall but also false positives. Larger values might be useful for ignoring 
                              noise in a signal. 
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
                          id='customResultIndex' 
                          title="Custom result index" 
                          subTitle="Store detector results to our own index."
                          initialIsOpen={false}
                          isUsingDivider={true}>
                
                          <EuiCallOut 
                            title="The custom result index can't be changed after the detector is created" 
                            color="warning" 
                            iconType="warning" />
                          <EuiSpacer size="xs" />
                          <EuiCheckbox
                            id="customerResultIndexCheckbox"
                            label="Enable custom result index"
                            checked={checked}
                            onChange={(e) => onCustomerResultIndexCheckboxChange(e)}
                          />
                        </MinimalAccordion>
                
                        <MinimalAccordion 
                          id='categoricalFields' 
                          title="Categorical fields" 
                          subTitle="Split a single time series into multiple time series based on categorical fields."
                          initialIsOpen={false}
                          isUsingDivider={true}>
                
                          <EuiText size="s">
                            <p>
                              The dashboard does not support high-cardinality detectors. 
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
                        id='modelFeatures'
                        title='Features'
                        isOpen={true}
                        onToggle={() => onAccordionToggle('modelFeatures')}
                        initialIsOpen={true}>
                
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
                                <EuiFormRow label="Find anomalies based on">
                                <EuiSelect
                                  id="featureAnomalies1"
                                  options={anomaliesOptions}
                                  value={anomaliesValue}
                                  onChange={(e) => anomaliesOnChange(e)}
                                />
                              </EuiFormRow>

                              <EuiSpacer size="s" />
                              <EuiFlexGroup alignItems={'flexStart'} gutterSize={'m'}>
                                  <EuiFlexItem grow={1}>
                                  <EuiFormRow label="Field">
                                    <EuiFieldText value={feature.field} />
                                  </EuiFormRow>
                                  </EuiFlexItem>

                                  <EuiFlexItem grow={1}>
                                    <EuiFormRow label="Aggregation method">
                                    <EuiSelect
                                      id="aggreationMethod"
                                      options={AGGREGATION_TYPES}
                                      value={feature.aggMethod}
                                      onChange={(e) => aggMethodOnChange(e)}
                                    />
                                    </EuiFormRow>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                            </MinimalAccordion>
                          )
                        })}
                        
                      </EnhancedAccordion>
                      <EuiSpacer size="m" />
                      <div className="minimal-accordion">
                        <EuiButton className="featureButton"
                          onClick={() => handleAddFeature()}
                          iconType="plusInCircle">
                          Add feature
                        </EuiButton>
                      </div>
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
                    onClick={formikProps.handleSubmit}>
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
