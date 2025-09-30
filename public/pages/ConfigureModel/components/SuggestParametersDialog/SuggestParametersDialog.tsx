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
  EuiText,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { FormikProps } from 'formik';

import { suggestDetector } from '../../../../redux/reducers/ad';
import { DetectorDefinitionFormikValues } from '../../../DefineDetector/models/interfaces';
import { ModelConfigurationFormikValues } from '../../models/interfaces';
import { Detector, UNITS } from '../../../../models/interfaces';
import {
  formikToFeatureAttributes,
  featuresToUIMetadata,
  formikToFilterQuery,
  formikToIndices,
} from '../../../ReviewAndCreate/utils/helpers';
import { formikToImputationOption } from '../../utils/helpers';

interface SuggestParametersDialogProps {
  onClose: () => void;
  dataSourceId: string;
  detectorDefinitionValues: DetectorDefinitionFormikValues;
  formikProps: FormikProps<ModelConfigurationFormikValues>;
}

type DialogStep = 'config' | 'loading' | 'error' | 'result';

const buildDetectorForSuggestion = (
  definitionValues: DetectorDefinitionFormikValues,
  modelValues: ModelConfigurationFormikValues,
  intervalOverride?: number
): Detector => {
  const detectionInterval =
    intervalOverride !== undefined
      ? {
          period: { interval: intervalOverride, unit: UNITS.MINUTES },
        }
      : undefined;

  const categoryField =
    modelValues.categoryFieldEnabled && modelValues.categoryField.length > 0
      ? modelValues.categoryField
      : undefined;

  return {
    name: definitionValues.name,
    description: definitionValues.description,
    indices: formikToIndices(definitionValues.index),
    filterQuery: formikToFilterQuery(definitionValues),
    timeField: definitionValues.timeField,
    featureAttributes: formikToFeatureAttributes(modelValues.featureList),
    uiMetadata: {
      features: { ...featuresToUIMetadata(modelValues.featureList) },
      filters: definitionValues.filters,
    },
    categoryField,
    shingleSize: modelValues.shingleSize,
    ...(detectionInterval && { detectionInterval }),
    imputationOption: formikToImputationOption(modelValues.imputationOption),
  } as Detector;
};

export const SuggestParametersDialog: React.FC<SuggestParametersDialogProps> = ({
  onClose,
  dataSourceId,
  detectorDefinitionValues,
  formikProps,
}) => {
  const dispatch = useDispatch();

  const [suggestMode, setSuggestMode] = useState<'all' | 'provided'>('all');
  const [providedInterval, setProvidedInterval] = useState<string>(
    String(formikProps.values.interval ?? 10)
  );
  const [step, setStep] = useState<DialogStep>('config');
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  const [suggestedInterval, setSuggestedInterval] = useState<number | undefined>();
  const [suggestedHistory, setSuggestedHistory] = useState<number | undefined>();
  const [suggestedWindowDelay, setSuggestedWindowDelay] = useState<number | undefined>();

  const radioOptions = [
    {
      id: 'all',
      label: 'Suggest detection interval, frequency, history, and window delay',
    },
    {
      id: 'provided',
      label: 'Suggest frequency, history, and window delay for the provided interval',
    },
  ];

  const onChangeRadio = (optionId: string) => {
    setSuggestMode(optionId as 'all' | 'provided');
  };

  const onGenerateSuggestions = async () => {
    setStep('loading');
    setErrorMsg(undefined);

    setSuggestedInterval(undefined);
    setSuggestedHistory(undefined);
    setSuggestedWindowDelay(undefined);

    const parsedInterval = Number(providedInterval);
    const intervalForSuggestion =
      suggestMode === 'all' || Number.isNaN(parsedInterval)
        ? undefined
        : parsedInterval;

    const detectorBody: Detector = buildDetectorForSuggestion(
      detectorDefinitionValues,
      formikProps.values,
      intervalForSuggestion
    );

    // frequency is the same as detection_interval, no need to ask suggest API for frequency
    const suggestionParams =
      suggestMode === 'all'
        ? 'detection_interval,history,window_delay'
        : 'history,window_delay';

    try {
      const resp: any = await dispatch(
        suggestDetector(detectorBody, suggestionParams, dataSourceId) as any
      );

      if (!resp || !resp.response) {
        setErrorMsg('Empty response from suggestDetector.');
        setStep('error');
      } else if (resp.response.exception) {
        setErrorMsg(resp.response.exception);
        setStep('error');
      } else {
        const intervalVal =
          resp.response?.detectionInterval?.period?.interval ??
          resp.response?.interval?.period?.interval;
        const frequencyVal = resp.response?.frequency?.period?.interval;
        const derivedInterval =
          typeof intervalVal === 'number'
            ? intervalVal
            : typeof frequencyVal === 'number'
            ? frequencyVal
            : 10; // Default to 10 minutes if no interval is suggested
        setSuggestedInterval(derivedInterval);

        const historyVal = resp.response?.history;
        setSuggestedHistory(
          typeof historyVal === 'number' ? historyVal : 40 // Default to 40 intervals if no history is suggested
        );

        const windowDelayVal = resp.response?.windowDelay?.period?.interval;
        setSuggestedWindowDelay(
          typeof windowDelayVal === 'number' ? windowDelayVal : 1 // Default to 1 minutes if no window delay is suggested
        );

        setStep('result');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while suggesting parameters');
      setStep('error');
    }
  };

  const onUseSuggestedParams = () => {
    // Always set interval and frequency (using defaults if API didn't provide suggestions)
    const intervalToUse = suggestedInterval || 10;
    formikProps.setFieldValue('interval', intervalToUse);
    formikProps.setFieldValue('frequency', intervalToUse);
    
    // Always set history (using default if API didn't provide suggestion)
    const historyToUse = suggestedHistory || 40;
    formikProps.setFieldValue('history', historyToUse);
    
    // Set window delay (using default if API didn't provide suggestion)
    const windowDelayToUse =
      suggestedWindowDelay !== undefined && suggestedWindowDelay !== null
        ? suggestedWindowDelay
        : 1;
    formikProps.setFieldValue('windowDelay', windowDelayToUse);
    
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
                Based on your data source and current configuration, OpenSearch can
                recommend core parameters for your detector.
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
                label="Detection interval"
                helpText="A valid interval is from 1 minute to 30 days."
              >
                <EuiFieldNumber
                  min={1}
                  max={43200}
                  value={providedInterval}
                  onChange={(e) => setProvidedInterval(e.target.value)}
                  append="minutes"
                />
              </EuiFormRow>
            )}
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
                  <>
                    <span>
                      • Detection interval: {suggestedInterval} minutes<br />
                    </span>
                    <span>
                      • Frequency: {suggestedInterval} minutes<br />
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#BD271E' }}>
                      • Detection interval: Unable to determine a suitable interval<br />
                    </span>
                    <span style={{ color: '#BD271E' }}>
                      • Frequency: Unable to determine a suitable frequency<br />
                    </span>
                  </>
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
          <EuiSmallButton
            fill
            color="primary"
            onClick={onUseSuggestedParams}
            data-test-subj="useSuggestedParametersButton"
          >
            Use suggested parameters
          </EuiSmallButton>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};
