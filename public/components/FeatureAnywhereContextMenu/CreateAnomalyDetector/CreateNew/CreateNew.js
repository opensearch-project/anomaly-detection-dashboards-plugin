/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  EuiTitle, 
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
import { EmbeddablePanel } from '../../../../../../../src/plugins/embeddable/public';
import './styles.scss';
import EnhancedAccordion from '../../EnhancedAccordion';
import MinimalAccordion from '../../MinimalAccordion';
import { feature } from 'topojson-client';

function CreateNew({ embeddable, closeFlyout, core, services, index }) {
  const [isShowVis, setIsShowVis] = useState(false);
  const title = embeddable.getTitle();
  const history = {
    location: { pathname: '/create-detector', search: '', hash: '', state: undefined },
    push: (value) => console.log('pushed', value),
    goBack: closeFlyout,
  };

  // const createDetectorProps = {
  //   ...history,
  //   history,
  //   httpClient: core.http,
  //   // This is not expected to be used
  //   setFlyout: () => null,
  //   notifications: core.notifications,
  //   isDarkMode: core.isDarkMode,
  //   notificationService: services.notificationService,
  //   edit: false,
  //   updateMonitor: () => null,
  //   staticContext: undefined,
  //   isMinimal: true,
  //   defaultName: `${title} anomaly detector 1`,
  //   defaultIndex: index,
  //   defaultTimeField: embeddable.vis.params.time_field,
  //   isDefaultTriggerEnabled: true,
  // };

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
  const featureList = embeddable.vis.params.series;
  console.log("feature list: " + featureList)
  console.log("feature name: " + featureList[0].label)

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
    featureList[0].metrics[0].type
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

  const renderFeatureList = featureList.map((feature, index) => (
    index < 5 &&
    <MinimalAccordion 
      id={feature.label} 
      title={feature.label} 
      subTitle={`Field: ${feature.metrics[0].field}, Aggregation method: ${feature.metrics[0].type}`}
      initialIsOpen={false}
      isUsingDivider={index == 0 ? false : true}
      extraAction={
        <EuiButtonIcon
          iconType="trash"
          color="text"
          aria-label={`Delete ${feature.label}`}
          //onClick={() => featureListHelpers(renderFeatureList, index)}
        />
      }
      >
        <EuiFormRow label="Feature name">
          <EuiFieldText value={feature.label} />
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
            <EuiFieldText value={feature.metrics[0].field} />
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
  ));


  return (
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
              push(EMPTY_UI_FILTER);
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

        {renderFeatureList}
        <EnhancedAccordion
          {...{
            id: 'addFeature',
            isButton: true,
            iconType: 'plusInCircle',
            title: 'Add feature',
          }}
        >
        </EnhancedAccordion>
      </EnhancedAccordion>
    </div>
  );
}

export default CreateNew;
