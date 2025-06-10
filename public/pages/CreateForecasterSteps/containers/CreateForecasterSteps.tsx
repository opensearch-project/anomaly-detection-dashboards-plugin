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

import React, { Fragment, useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router';
import { EuiSteps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useHideSideNavBar } from '../../main/hooks/useHideSideNavBar';
import { INITIAL_MODEL_CONFIGURATION_VALUES } from '../../ConfigureForecastModel/utils/constants';
import { STEP_STATUS } from '../utils/constants';
import { DefineForecaster } from '../../DefineForecaster/containers/DefineForecaster';
import { ConfigureForecastModel } from '../../ConfigureForecastModel/containers/ConfigureForecastModel';
import { ForecasterDefinitionFormikValues } from '../../DefineForecaster/models/interfaces';
import { ModelConfigurationFormikValues } from '../../ConfigureForecastModel/models/interfaces';
import { MountPoint } from '../../../../../../src/core/public';
import { INITIAL_FORECASTER_DEFINITION_VALUES } from '../../DefineForecaster/utils/constants';

interface CreateForecasterStepsProps extends RouteComponentProps {
  setActionMenu: (menuMount: MountPoint | undefined) => void;
}

export const CreateForecasterSteps = (props: CreateForecasterStepsProps) => {
  useHideSideNavBar(true, false);

  const [step1DefineDataStatus, setStep1DefineDataStatus] =
    useState<STEP_STATUS>(undefined);
  const [step2ConfigureModelStatus, setStep2ConfigureModelStatus] =
    useState<STEP_STATUS>('disabled');

  const [step1DefineDataFields, setStep1DefineDataFields] =
    useState<ForecasterDefinitionFormikValues>(
      INITIAL_FORECASTER_DEFINITION_VALUES
    );
  const [step2ConfigureModelFields, setStep2ConfigureModelFields] =
    useState<ModelConfigurationFormikValues>(
      INITIAL_MODEL_CONFIGURATION_VALUES
    );

  const [curStep, setCurStep] = useState<number>(1);

  // Hook to update the progress of the steps - undefined = blue, disabled = grey
  useEffect(() => {
    switch (curStep) {
      case 1:
      default:
        setStep1DefineDataStatus(undefined);
        setStep2ConfigureModelStatus('disabled');
        break;
      case 2:
        setStep1DefineDataStatus(undefined);
        setStep2ConfigureModelStatus(undefined);
        break;
    }
  }, [curStep]);

  const createSteps = [
    {
      title: 'Define data source',
      status: step1DefineDataStatus,
      // EuiSteps requires a children prop, but we render the step content separately
      // in the adjacent EuiFlexItem based on curStep
      children: '',
    },
    {
      title: 'Add model parameters',
      status: step2ConfigureModelStatus,
      children: '',
    },
  ];

  return (
    <Fragment>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false}>
          <EuiSteps steps={createSteps} />
        </EuiFlexItem>
        <EuiFlexItem>
          {curStep === 1 ? (
            <DefineForecaster
              setStep={setCurStep}
              initialValues={step1DefineDataFields}
              setInitialValues={setStep1DefineDataFields}
              setModelConfigValues={setStep2ConfigureModelFields}
              {...props}
            />
          ) : curStep === 2 ? (
            <ConfigureForecastModel
              setStep={setCurStep}
              initialValues={step2ConfigureModelFields}
              setInitialValues={setStep2ConfigureModelFields}
              forecasterDefinitionValues={step1DefineDataFields}
              {...props}
            />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
