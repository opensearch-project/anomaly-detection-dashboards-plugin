import React, { useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiAccordion,
} from '@elastic/eui';
import './styles.scss';
import { EmbeddablePanel } from '../../../../../../src/plugins/embeddable/public';

const accordions = ['detectorDetails', 'features', 'categoricalFields', 'shingleSize', 'alerts', 'triggers'].reduce(
  (acc, cur) => ({ ...acc, [cur]: cur }),
  {}
);

function CreateAnomalyDetector({ embeddable }) {
  const [accordionOpen, setAccordionOpen] = useState(accordions.triggers);

  return (
    <div className="create-anomaly-detector">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id="create-anomaly-detector__title">Create anomaly detector</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <div className="create-anomaly-detector__vis">
              <EmbeddablePanel
                hideHeader
                embeddable={embeddable}
                getActions={() => Promise.resolve([])}
                getAllEmbeddableFactories={() => []}
                getEmbeddableFactory={() => null}
                notifications={{}}
                application={{}}
                overlays={{}}
                inspector={{ isAvailable: () => null }}
                SavedObjectFinder={() => null}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem className="create-anomaly-detector__aside">
            <EuiAccordion
              id={accordions.detectorDetails}
              buttonContent={
                <EuiText>
                  <h6>Detector Details</h6>
                  {/* {accordionOpen !== accordions.detectorDetails && (
                    <>
                      <EuiText size="s">{name.value}</EuiText>
                      <EuiText size="xs" color="subdued">
                        {anomalyDetectorText}
                      </EuiText>
                    </>
                  )} */}
                </EuiText>
              }
              forceState={accordionOpen === accordions.detectorDetails ? 'open' : 'closed'}
              onToggle={() =>
                setAccordionOpen(
                  accordionOpen !== accordions.detectorDetails && accordions.detectorDetails
                )
              }
            >
            </EuiAccordion>

          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </div>
  )
}
export default CreateAnomalyDetector;
