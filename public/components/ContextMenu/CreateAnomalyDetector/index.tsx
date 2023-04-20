import React from 'react';
import {
  EuiLink,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiPanel,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
} from '@elastic/eui';
import { useField, useFormikContext } from 'formik';
import Notifications from '../Notifications';
import FormikWrapper from '../../../utils/contextMenu/FormikWrapper';
import './styles.scss';
import { toMountPoint } from '../../../../../../src/plugins/opensearch_dashboards_react/public';

export const CreateAnomalyDetector = (props) => {
  const { overlays, closeMenu } = props;
  const { values } = useFormikContext();
  const [name] = useField('name');

  const onOpenAdvanced = () => {
    // Prepare advanced flyout with new formik provider of current values
    const getFormikOptions = () => ({
      initialValues: values,
      onSubmit: (values) => {
        console.log(values);
      },
    });

    const flyout = overlays.openFlyout(
      toMountPoint(
        <FormikWrapper {...{ getFormikOptions }}>
          <CreateAnomalyDetectorExpanded
            {...{ ...props, onClose: () => flyout.close() }}
          />
        </FormikWrapper>
      )
    );

    // Close context menu
    closeMenu();
  };

  return (
    <>
      <EuiPanel hasBorder={false} hasShadow={false}>
        <EuiText size="s">
          <strong>{name.value}</strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="xs">
          Detector interval: 10 minutes; Window delay: 1 minute
        </EuiText>
        <EuiSpacer />

        {/* not sure about the select features part */}

        <Notifications />
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiPanel hasBorder={false} hasShadow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiText size="s">
              <EuiLink onClick={onOpenAdvanced}>
                <EuiIcon type="menuLeft" /> Advanced settings
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              type="submit"
              data-test-subj="createDetectorButtonFlyout"
              className="create-anomaly-detector__create"
              fill={true}
              size="s"
              isLoading={formikProps.isSubmitting}
              //@ts-ignore
              onClick={formikProps.handleSubmit}
            >
              Create
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};