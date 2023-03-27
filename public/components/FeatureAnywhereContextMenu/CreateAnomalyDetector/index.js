import React, { useEffect, useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiCheckableCard,
  EuiSpacer,
  EuiFlyout,
} from '@elastic/eui';
// import {
//   OuiCheckableCard
// } from '@elastic/eui';
import './styles.scss';
import { EmbeddablePanel } from '../../../../../../src/plugins/embeddable/public';
import DetectorDetails from './DetectorDetails';
import Features from './Features';

const accordions = [
  'detectorDetails',
  'features',
  'shingleSize',
  'alerts',
  'triggers',
].reduce((acc, cur) => ({ ...acc, [cur]: cur }), {});

function CreateAnomalyDetector({ embeddable }) {
  const [radio, setRadio] = useState('createRadio');
  const [accordionOpen, setAccordionOpen] = useState(accordions.triggers);

  return (
    <div className="create-anomaly-detector">
      <EuiFlyout>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            <h2 id="create-anomaly-detector__title">Add anomaly detector</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCheckableCard
                id="createNewDetector"
                label="Create new detector"
                value="createRadio"
                checked={radio === 'createRadio'}
                onChange={() => setRadio('createRadio')}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCheckableCard
                id="associateExistingDetector"
                label="Associate existing detector"
                value="associateRadio"
                checked={radio === 'associateRadio'}
                onChange={() => setRadio('associateRadio')}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <small>
            This is a short description of the feature to get users exicted.
            Learn more in the documentation.
          </small>

          {/* <EuiFlexGroup>
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
                    <h6>DETECTOR DETAILS</h6>
                  </EuiText>
                }
                initialIsOpen={true}
                forceState={accordionOpen === accordions.detectorDetails ? 'open' : 'closed'}
                onToggle={() =>
                  setAccordionOpen(
                    accordionOpen !== accordions.detectorDetails && accordions.detectorDetails
                  )
                }
              >
                <EuiSpacer />
                <DetectorDetails />
              </EuiAccordion>
              <EuiHorizontalRule margin="s" />
              <EuiAccordion
                  id={accordions.features}
                  buttonContent={
                    <EuiText>
                      <h6>FEATURES</h6>
                    </EuiText>
                  }
                  initialIsOpen={true}
                  // forceState={accordionOpen === accordions.detectorDetails ? 'open' : 'closed'}
                  // onToggle={() =>
                  //   setAccordionOpen(
                  //     accordionOpen !== accordions.detectorDetails && accordions.detectorDetails
                  //   )
                  // }
                >
                  <Features />
              </EuiAccordion>
              <EuiHorizontalRule margin="s" />
            </EuiFlexItem>
          </EuiFlexGroup>  */}
        </EuiFlyoutBody>
      </EuiFlyout>
    </div>
  );
}
export default CreateAnomalyDetector;
