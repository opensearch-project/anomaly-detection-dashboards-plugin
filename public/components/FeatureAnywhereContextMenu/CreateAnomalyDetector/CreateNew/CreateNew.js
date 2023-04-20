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
  EuiLoadingSpinner,
  EuiPanel,
  EuiAccordion,
  EuiFormRow,
  EuiFieldText,
  EuiCheckbox,
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiCallOut
 } from '@elastic/eui';
import { EmbeddablePanel } from '../../../../../../../src/plugins/embeddable/public';
import './styles.scss';
import EnhancedAccordion from '../../EnhancedAccordion';

function CreateNew({ embeddable, closeFlyout, core, services, index }) {
  const [isShowVis, setIsShowVis] = useState(false);
  const title = embeddable.getTitle();
  const history = {
    location: { pathname: '/create-detector', search: '', hash: '', state: undefined },
    push: (value) => console.log('pushed', value),
    goBack: closeFlyout,
  };
  const createMonitorProps = {
    ...history,
    history,
    httpClient: core.http,
    // This is not expected to be used
    setFlyout: () => null,
    notifications: core.notifications,
    isDarkMode: core.isDarkMode,
    notificationService: services.notificationService,
    edit: false,
    updateMonitor: () => null,
    staticContext: undefined,
    isMinimal: true,
    defaultName: `${title} anomaly detector 1`,
    defaultIndex: index,
    defaultTimeField: embeddable.vis.params.time_field,
    isDefaultTriggerEnabled: true,
  };

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

  const detectorDetailsOnToggle = (isOpen) => {
    setIsOpen(isOpen ? 'open' : 'closed');
  };

  const [isOpen, setIsOpen] = useState('open');

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

        {/* <EnhancedAccordion
          id='detectorDetails'
          title={detectorNameFromVis}
          // onToggle={detectorDetailsOnToggle}
          isOpen={isOpen}
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

        </EnhancedAccordion> */}
        <EuiPanel hasBorder={true} hasShadow={true}>
          <EuiAccordion id='detectorDetails' buttonContent={detectorNameFromVis}>
            <EuiPanel hasBorder={true} hasShadow={true}>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                Detector interval: 10 minutes; Window delay: 1 minute
              </EuiText>

            <EuiSpacer size="m" />
            <EuiFormRow label="Detector name">
              <EuiFieldText value={detectorNameFromVis} />
            </EuiFormRow>
          
            <EuiFormRow label="Detector interval">
              <EuiFieldNumber
                placeholder="10"
                value={intervalValue}
                onChange={(e) => intervalOnChange(e)}
              />
            </EuiFormRow>
            <EuiFormRow label="Window delay">
              <EuiFieldNumber
                  placeholder="1"
                  value={delayValue}
                  onChange={(e) => delayOnChange(e)}
              />
            </EuiFormRow>
          </EuiPanel>
          </EuiAccordion>
        </EuiPanel>

     

      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true} hasShadow={true}>
        <EuiAccordion id='advancedConfiguration' buttonContent="Advanced Configuration">

        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true} hasShadow={true}>
          <EuiAccordion id='shingleSize' buttonContent="Shingle size" initialIsOpen={false}>
          <EuiSpacer size="s" />
            <EuiText size="xs">
              <p>
                Set number of intervals in the model's detection window.
              </p>
            </EuiText>
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

          </EuiAccordion>
        </EuiPanel>

        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true} hasShadow={true}>
          <EuiAccordion id='customResultIndex' buttonContent="Custom result index" initialIsOpen={false}>
            <EuiText size="xs">
              <p>
                Store detector results to our own index.
              </p>
            </EuiText>
            <EuiSpacer size="xs" />
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
          </EuiAccordion>
        </EuiPanel>

        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true} hasShadow={true}>
          <EuiAccordion id='categoricalFields' buttonContent="Categorical fields" initialIsOpen={false}>
            <EuiText size="xs">
              <p>
                Split a single time series into multiple time series based on categorical fields.
              </p>
            </EuiText>
            <EuiSpacer size="xs" />
            
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
          </EuiAccordion>
        </EuiPanel>


        </EuiAccordion>
      </EuiPanel>


      <EuiSpacer size="l" />
      <EuiTitle size="s">
          <h3>Model Features </h3>
        </EuiTitle>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true} hasShadow={true}>

        <EuiSpacer size="s" />
        <EuiAccordion id='modelFeatures' buttonContent="Features" initialIsOpen={true}>
        <EuiSpacer size="m" />

          <EuiPanel hasBorder={true} hasShadow={true}>
          <EuiAccordion id='feature0' buttonContent={featureList[0].label} initialIsOpen={false}>
            <EuiFormRow label="Feature name">
              <EuiFieldText value={featureList[0].label} />
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
                <EuiFieldText value={featureList[0].metrics[0].field} />
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
          
          </EuiAccordion>
          <EuiSpacer size="" />
          <EuiText size="xs">
            <p>
             Field: {featureList[0].metrics[0].field}, Aggregation method: {featureList[0].metrics[0].type}
            </p>
          </EuiText>
          </EuiPanel>

          <EuiSpacer size="s" />
          <EuiPanel hasBorder={true} hasShadow={true}>
            <EuiAccordion id='feature1' buttonContent={featureList[1].label} initialIsOpen={false}>
              <EuiFormRow label="Feature name">
                <EuiFieldText value={featureList[1].label} />
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
                  <EuiFieldText value={featureList[1].metrics[0].field} />
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
            
            </EuiAccordion>

            <EuiSpacer size="" />
            <EuiText size="xs">
              <p>
              Field: {featureList[1].metrics[0].field}, Aggregation method: {featureList[1].metrics[0].type}
              </p>
            </EuiText>
          </EuiPanel>

          <EuiSpacer size="s" />
          <EuiPanel hasBorder={true} hasShadow={true}>
            <EuiAccordion id='feature2' buttonContent={featureList[2].label} initialIsOpen={false}>
              <EuiFormRow label="Feature name">
                <EuiFieldText value={featureList[2].label} />
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
                  <EuiFieldText value={featureList[2].metrics[0].field} />
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
            
            </EuiAccordion>

            <EuiSpacer size="" />
            <EuiText size="xs">
              <p>
              Field: {featureList[2].metrics[0].field}, Aggregation method: {featureList[2].metrics[0].type}
              </p>
            </EuiText>
          </EuiPanel>

        </EuiAccordion>
      </EuiPanel>      
    </div>
  );
}

export default CreateNew;
