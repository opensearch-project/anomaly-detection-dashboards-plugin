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

import React, { useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSmallButton,
  EuiSmallButtonEmpty,
  EuiFormRow,
  EuiFieldNumber,
  EuiRadioGroup,
  EuiAccordion,
  EuiText,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { FormikProps } from 'formik';

import { suggestForecaster } from '../../../../redux/reducers/forecast';
import { ForecasterDefinitionFormikValues } from '../../../DefineForecaster/models/interfaces';
import { formikToForecasterForSuggestion } from '../../../DefineForecaster/utils/helpers';
import { Forecaster } from '../../../../models/interfaces';
import { ModelConfigurationFormikValues } from '../../models/interfaces';

interface SuggestParametersDialogProps {
  onClose: () => void;
  dataSourceId: string; 
  forecasterDefinitionValues: ForecasterDefinitionFormikValues;
  formikProps: FormikProps<ModelConfigurationFormikValues>;
}

type DialogStep = 'config' | 'loading' | 'error' | 'result';

export const SuggestParametersDialog: React.FC<SuggestParametersDialogProps> = ({
  onClose,
  dataSourceId,
  forecasterDefinitionValues,
  formikProps, // destructure the formik bag
}) => {
  const dispatch = useDispatch();

  const [suggestMode, setSuggestMode] = useState<'all' | 'provided'>('all');
  const [providedInterval, setProvidedInterval] = useState<number>(15);
  const [shingleSize, setShingleSize] = useState<number>(8);
  const [step, setStep] = useState<DialogStep>('config');
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  const [suggestedInterval, setSuggestedInterval] = useState<number | undefined>();
  const [suggestedHorizon, setSuggestedHorizon] = useState<number | undefined>();
  const [suggestedHistory, setSuggestedHistory] = useState<number | undefined>();
  const [suggestedWindowDelay, setSuggestedWindowDelay] = useState<number | undefined>();

  const radioOptions = [
    { id: 'all', label: 'Suggest interval, window delay, horizon, and history' },
    { id: 'provided', label: 'Suggest window delay, horizon, and history for the provided interval' },
  ];

  const onChangeRadio = (optionId: string) => {
    setSuggestMode(optionId as 'all' | 'provided');
  };

  const onGenerateSuggestions = async () => {
    setStep('loading');
    setErrorMsg(undefined);

    const intervalForForecaster =
      suggestMode === 'all' ? undefined : providedInterval;

    const forecasterBody: Forecaster = formikToForecasterForSuggestion(
      forecasterDefinitionValues,
      intervalForForecaster,
      shingleSize
    );

    const suggestionParams =
      suggestMode === 'all'
        ? 'forecast_interval,history,horizon,window_delay'
        : 'history,horizon,window_delay';

    try {
      const resp: any = await dispatch(
        suggestForecaster(forecasterBody, suggestionParams, dataSourceId) as any
      );

      if (!resp || !resp.response) {
        setErrorMsg('Empty response from suggestForecaster.');
        setStep('error');
      } else if (resp.response.exception) {
        setErrorMsg(resp.response.exception);
        setStep('error');
      } else {
        // Success: store suggested values in local state
        const intervalVal = resp.response?.interval?.period?.interval;
        setSuggestedInterval(typeof intervalVal === 'number' ? intervalVal : undefined);
        setSuggestedHorizon(resp.response.horizon);
        setSuggestedHistory(resp.response.history);
        const wDelay = resp.response.windowDelay?.period?.interval;
        setSuggestedWindowDelay(wDelay);

        setStep('result');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while suggesting parameters');
      setStep('error');
    }
  };

  // The key part: update form fields
  const onUseSuggestedParams = () => {
    if (suggestedInterval != null) {
        formikProps.setFieldValue('interval', suggestedInterval);
    }
    if (suggestedHorizon != null) {
        formikProps.setFieldValue('horizon', suggestedHorizon);
    }
    if (suggestedHistory != null) {
        formikProps.setFieldValue('history', suggestedHistory);
    }
    if (suggestedWindowDelay != null) {
        formikProps.setFieldValue('windowDelay', suggestedWindowDelay);
    }
    onClose();
  };

  const onBackToConfig = () => {
    setStep('config');
  };

  const isConfig = step === 'config';
  const isLoading = step === 'loading';
  const isError = step === 'error';
  const isResult = step === 'result';

  return (
    <EuiModal onClose={onClose} initialFocus="[name=radioGroup]">
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="suggestParametersDialogTitle">
          <h2>Suggest parameters</h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {isConfig && (
          <>
            <EuiText>
              <p>
                Based on your data source and advanced parameters, OpenSearch can
                recommend core parameters for the model.
              </p>
            </EuiText>
            <EuiSpacer size="m" />

            <EuiRadioGroup
              name="radioGroup"
              options={radioOptions}
              idSelected={suggestMode}
              onChange={onChangeRadio}
            />

            <EuiSpacer size="m" />

            {suggestMode === 'provided' && (
              <EuiFormRow
                label="Forecasting interval"
                helpText="A valid interval is from 1 to 60 minutes."
              >
                <EuiFieldNumber
                  min={1}
                  max={60}
                  value={providedInterval}
                  onChange={(e) => setProvidedInterval(Number(e.target.value))}
                  append="minutes"
                />
              </EuiFormRow>
            )}

            <EuiSpacer size="m" />

            <EuiAccordion
              id="advancedAccordion"
              buttonContent="Advanced"
              paddingSize="m"
            >
              <EuiFormRow label="Shingle size">
                <EuiFieldNumber
                  value={shingleSize}
                  onChange={(e) => setShingleSize(Number(e.target.value))}
                  min={1}
                  max={128}
                />
              </EuiFormRow>
            </EuiAccordion>
          </>
        )}

        {isLoading && (
          <>
            <EuiLoadingSpinner size="m" />
            <EuiText size="s">
              <p>Calculating model parameters...</p>
              <p>The calculation might take a few minutes. Do not close this window.</p>
            </EuiText>
          </>
        )}

        {isError && (
          <EuiCallOut title="Error" color="danger" iconType="alert">
            <p>{errorMsg}</p>
          </EuiCallOut>
        )}

        {isResult && (
          <>
            <EuiText data-test-subj="suggestedParametersResult">
              <p>Based on your inputs, the suggested parameters are:</p>
              <div className="eui-textLeft">
                {suggestedInterval !== undefined ? (
                  <span>• Interval: {suggestedInterval} minutes<br /></span>
                ) : (
                  <span style={{ color: '#BD271E' }}>• Interval: Unable to determine a suitable interval<br /></span>
                )}
                
                {suggestedHorizon !== undefined ? (
                  <span>
                    • Horizon: {suggestedHorizon} intervals
                    {suggestedInterval && (
                      <> (
                        {Math.floor((suggestedHorizon * suggestedInterval) / 60)} hours{' '}
                        {(suggestedHorizon * suggestedInterval) % 60} minutes)
                      </>
                    )}
                    <br />
                  </span>
                ) : (
                  <span style={{ color: '#BD271E' }}>• Horizon: Unable to determine a suitable horizon<br /></span>
                )}
                
                {suggestedHistory !== undefined ? (
                  <span>
                    • History: {suggestedHistory} intervals
                    {suggestedInterval && (
                      <> (
                        {Math.floor((suggestedHistory * suggestedInterval) / 60)} hours{' '}
                        {(suggestedHistory * suggestedInterval) % 60} minutes)
                      </>
                    )}
                    <br />
                  </span>
                ) : (
                  <span style={{ color: '#BD271E' }}>• History: Unable to determine a suitable history window<br /></span>
                )}
                
                {suggestedWindowDelay !== undefined ? (
                  <span>• Window delay: {suggestedWindowDelay} minutes</span>
                ) : (
                  <span style={{ color: '#BD271E' }}>• Window delay: Unable to determine a suitable delay</span>
                )}
              </div>
            </EuiText>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiSmallButtonEmpty onClick={onClose}>Cancel</EuiSmallButtonEmpty>

        {isConfig && (
          <EuiSmallButton
            fill
            iconType="arrowRight"
            iconSide="right"
            data-test-subj="generateSuggestionsButton"
            onClick={onGenerateSuggestions}
          >
            Generate suggestions
          </EuiSmallButton>
        )}

        {(isLoading || isError || isResult) && (
          <EuiSmallButton
            iconType="arrowLeft"
            onClick={onBackToConfig}
            style={{ border: '1px solid #d3dae6' }}
          >
            Back
          </EuiSmallButton>
        )}

        {isResult && (
          <EuiSmallButton fill color="primary" onClick={onUseSuggestedParams} data-test-subj="useSuggestedParametersButton">
            Use suggested parameters
          </EuiSmallButton>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};
