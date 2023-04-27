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
import { snakeCase } from 'lodash';
import { Formik, FormikHelpers } from 'formik';
import { formikToDetector, formikToFeatureAttributes } from 'public/pages/ReviewAndCreate/utils/helpers';
import { RouteComponentProps } from 'react-router';
import { createDetector, startDetector } from '../../../../public/redux/reducers/ad';
import { EmbeddablePanel } from '../../../../../../src/plugins/embeddable/public';
import './styles.scss';
import EnhancedAccordion from '../EnhancedAccordion';
import MinimalAccordion from '../MinimalAccordion';
import { Detector, UNITS, FeatureAttributes } from '../../../../public/models/interfaces';
import { AppState } from '../../../../public/redux/reducers';
import { render } from 'enzyme';

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
  const title = embeddable.getTitle();
  const intervalOptions = [
    { value: 'option_one', text: '10 minutes' },
    { value: 'option_two', text: '1 minutes' },
    { value: 'option_three', text: '5 minutes' },
  ];
  const [intervalValue, setIntervalalue] = useState(intervalOptions[0].value);
  const intervalOnChange = (e) => {
    setIntervalalue(e.target.value);
  };

  const delayOptions = [
    { value: 'option_one', text: '10 minutes' },
    { value: 'option_two', text: '1 minutes' },
    { value: 'option_three', text: '5 minutes' },
  ];
  const [delayValue, setDelayValue] = useState(delayOptions[0].value);
  const delayOnChange = (e) => {
    setDelayValue(e.target.value);
  };

  const detectorNameFromVis = embeddable.vis.title + ' anomaly detector 1';
  const aggList = embeddable.vis.data.aggs.aggs.filter((feature) => feature.schema == "metric");
  /**
   * [
  {
    "id": "1",
    "enabled": true,
    "type": "percentile_ranks",
    "params": {
      "field": "bytes",
      "values": [
        0
      ]
    },
    "schema": "metric"
  },
  {
    "id": "3",
    "enabled": true,
    "type": "max",
    "params": {
      "field": "bytes"
    },
    "schema": "metric"
  }
]
   */
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

  const aggMethodOptions = [
    { value: 'avg', text: 'AVG' },
    { value: 'sum', text: 'SUM' },
  ];
  const [aggMethodValue, setAggMethodValue] = useState(
    'SUM'
  );
  const aggMethodOnChange = (e) => {
    setAggMethodValue(e.target.value);
  };

  const [shingleSizeValue, setShingleSizeValue] = useState('');

  const shingleSizeOnChange = (e) => {
    setShingleSizeValue(e.target.value);
  };

  const [checked, setChecked] = useState(false);
  const onCustomerResultIndexCheckboxChange = (e) => {
    setChecked(e.target.checked);
  };


  const getFeatureNameFromParams = (id) => {
    console.log("hereeeee: ", JSON.stringify(embeddable.vis.params.seriesParams))
    return embeddable.vis.params.seriesParams.map((param) => {
      if (param.data.id == id) {
        return param.data.label;
      }
    });
  }

  let defaultFeatureList = []
  featureList.map((feature, index) => (
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
    const emptyFeatureComponenet = {
      id: '',
      featureName: '',
      field: '',
      aggMethod: ''
    }
    setFeatureListToRender(feautreListToRender.push(emptyFeatureComponenet))
  }


  const handleSubmit = (values) => {
    console.log("values: " + JSON.stringify(values))
    try {
      dispatch(createDetector(values)).then(async (response) => {
        console.log("detector id here: " + response.response.id)
        dispatch(startDetector(response.response.id)).then((startDetectorResponse) => {
          console.log("detector started");
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
        console.log('savedObject: ' + JSON.stringify(savedObject));
    
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
    name: 'max_byte_212',
    indices:  formikToIndicesArray(embeddable.vis.params.index_pattern),
    timeField: embeddable.vis.params.time_field,
    detectionInterval: {
      period: { interval: 10, unit: UNITS.MINUTES },
    },
    windowDelay: {
      period: { interval: 1, unit: UNITS.MINUTES },
    },
    shingleSize: 8,
    featureAttributes: formikToFeatureAttributes(featureList),
    filterQuery: { match_all: {} },
    description: '',
    resultIndex: undefined,
  }

  function formikToDetectorName(title) {
    const detectorName = title + "anomaly detector 1";
    detectorName.replace(/ /g, '_');
    detectorName.replace('[', '');
    detectorName.replace(']', '');
    return detectorName;
  }

  function formikToIndicesArray(indexString) {
    return [indexString];
  }

  function formikToFeatureAttributes(values) {
    //@ts-ignore
    return values.slice(0, values.length).map(function (value) {
      return {
        featureId: value.id,
        featureName: value.label,
        featureEnabled: true,
        importance: 1,
        aggregationQuery: formikToAggregation(value)
      };
    });
  }

  function formikToAggregation(value) {
    return {
      [snakeCase(value.label)]: {
        sum: { field: value.params.field },
      },
    }
  }
    

  return (
    <div className="add-anomaly-detector">
      <Formik initialValues={initialDetectorValue}
        onSubmit={handleSubmit}
        validateOnChange={false}>
          {(formikProps) => {
            return (
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
                        subTitle={
                          <EuiText size="m">
                            <p>
                              Detector interval: 10 minutes; Window delay: 1 minutesss
                            </p>
                          </EuiText>
                        }>
                        <EuiFormRow label="Detector name">
                          <EuiFieldText value={detectorNameFromVis} />
                        </EuiFormRow>
                      
                        <EuiFormRow label="Detector interval">
                          <EuiSelect
                            id="detectorIntervalSelection"
                            options={intervalOptions}
                            value={intervalValue}
                            onChange={(e) => intervalOnChange(e)}
                          />
                        </EuiFormRow>
                        <EuiFormRow label="Window delay">
                          <EuiSelect
                            id="windowDelaySelection"
                            options={delayOptions}
                            value={delayValue}
                            onChange={(e) => delayOnChange(e)}
                          />
                        </EuiFormRow>
                      </EnhancedAccordion>
                
                      <EuiSpacer size="m" />
                      
                      <EnhancedAccordion
                        id='advancedConfiguration'
                        title="Advanced Configuration"
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
                              //push(EMPTY_UI_FILTER);
                            }}
                          >
                            + Add data filter
                          </EuiButtonEmpty>
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
                            placeholder="8"
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
                                      options={aggMethodOptions}
                                      value={aggMethodValue}
                                      onChange={(e) => aggMethodOnChange(e)}
                                    />
                                    </EuiFormRow>
                                  </EuiFlexItem>
                                </EuiFlexGroup>
                            </MinimalAccordion>
                          )
                        })}
                        <EuiButton
                          onClick={() => handleAddFeature()}
                          iconType="plusInCircle">
                          Add feature
                        </EuiButton>
                        
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
                    onClick={formikProps.handleSubmit}>
                      {mode === 'existing' ? 'Associate' : 'Create'} detector
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
              </>
            )
          }}
      </Formik>
    </div>
  );
}

export default AddAnomalyDetector;
