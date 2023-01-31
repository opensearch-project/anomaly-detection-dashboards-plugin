import React, { useEffect, useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiAccordion,
  EuiSpacer
} from '@elastic/eui';
import './styles.scss';
import { EmbeddablePanel } from '../../../../../../src/plugins/embeddable/public';
import DetectorDetails from './DetectorDetails';
import Features from './Features';

const accordions = ['detectorDetails', 'features', 'categoricalFields', 'shingleSize', 'alerts', 'triggers'].reduce(
  (acc, cur) => ({ ...acc, [cur]: cur }),
  {}
);

function CreateAnomalyDetector({ embeddable }) {
  const [accordionOpen, setAccordionOpen] = useState(accordions.triggers);

  // useEffect(() => {
  //   async function createVisEmbeddable() {
  //     try {
  //       const getFactory = getEmbeddable().getEmbeddableFactory('visualization');

  //       // fetching the current context from the data plugin
  //       const contextInput = {
  //         filters: getQueryService().filterManager.getFilters(),
  //         query: getQueryService().queryString.getQuery(),
  //         timeRange: getQueryService().timefilter.timefilter.getTime(),
  //       };

  //       const embeddable = (await getFactory?.createFromSavedObject(
  //         props.savedObjectId,
  //         contextInput
  //       )) as IEmbeddable<EmbeddableInput, EmbeddableOutput> | ErrorEmbeddable;

  //       // updating the input so we don't auto-refresh
  //       embeddable.updateInput({
  //         // @ts-ignore
  //         refreshConfig: {
  //           value: 0,
  //           pause: true,
  //         },
  //       });

  //       setEmbeddableObj(embeddable);
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   }
  //   createVisEmbeddable();
  //   // TODO: add more if needed
  // }, [props.savedObjectId]);

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
                    <h6>Features</h6>
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
            <EuiAccordion
                id={accordions.shingleSize}
                buttonContent={
                  <EuiText>
                    <h6>Shingle Size</h6>
                  </EuiText>
                }
                initialIsOpen={false}
                // forceState={accordionOpen === accordions.detectorDetails ? 'open' : 'closed'}
                // onToggle={() =>
                //   setAccordionOpen(
                //     accordionOpen !== accordions.detectorDetails && accordions.detectorDetails
                //   )
                // }
              >
                {/* <Features /> */}
            </EuiAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </div>
  )
}
export default CreateAnomalyDetector;
