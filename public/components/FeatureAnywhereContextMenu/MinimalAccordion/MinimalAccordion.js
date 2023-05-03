import React from 'react';
import {
  EuiHorizontalRule,
  EuiTitle,
  EuiAccordion,
  EuiSpacer,
  EuiPanel,
  EuiTextColor,
  EuiText,
} from '@elastic/eui';
import './styles.scss';

function MinimalAccordion({
  id,
  title,
  subTitle,
  children,
  isUsingDivider,
  extraAction,
}) {
  return (
    <div className="minimal-accordion">
      {isUsingDivider && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiSpacer size="xs" />
        </>
      )}
      <EuiAccordion
        id={id}
        buttonContent={
          <>
            <EuiTitle size="xxs">
              <h5 className="minimal-accordion__title">{title}</h5>
            </EuiTitle>
            {subTitle && (
              <EuiText size="xs">
                <EuiTextColor color="subdued">{subTitle}</EuiTextColor>
              </EuiText>
            )}
          </>
        }
        extraAction={
          <div className="enhanced-accordion__extra">{extraAction}</div>
        }
      >
        <EuiPanel
          hasShadow={false}
          hasBorder={false}
          paddingSize="l"
          className="minimal-accordion__panel"
        >
          {children}
        </EuiPanel>
      </EuiAccordion>
    </div>
  );
}

export default MinimalAccordion;
