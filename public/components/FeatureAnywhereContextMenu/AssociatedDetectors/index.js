import React, { useCallback, useMemo } from 'react';
import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiInMemoryTable,
  EuiFlyoutBody,
  EuiEmptyPrompt,
  EuiButton,
  EuiFlyout,
} from '@elastic/eui';
import uuidv4 from 'uuid/v4';
import './styles.scss';
import { getColumns, search } from './helpers';
const closeFlyout = () => setIsFlyoutVisible(false);

const AssociatedDetectors = ({ embeddable, closeFlyout }) => {
  const title = embeddable.getTitle();
  const onUnlink = useCallback(
    (item) => {
      console.log('onUnlink', item);
      closeFlyout();
    },
    [closeFlyout]
  );
  const onView = useCallback(
    (item) => {
      console.log('onView', item);
      closeFlyout();
    },
    [closeFlyout]
  );
  const columns = useMemo(() => getColumns({ onUnlink, onView }), [
    onUnlink,
  ]);
  const detectors = [
    { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
    // { name: 'CPU_Usage_Detector_2', state: 'initializing', occurance: 3, id: uuidv4() },
  ];


  const empty = (
    <EuiEmptyPrompt
      title={<h3>No anomaly detectors to display</h3>}
      titleSize="s"
      body={`There are no anomaly detectors associated with ${title} visualization. 
      You will need to add a detector to the visualization to be able to list it here`}
      actions={
        <EuiButton fill onClick={() => setPanel('add')}>
          Add anomaly detector
        </EuiButton>
      }
    />
  );
  const tableProps = {
    items: detectors,
    columns,
    search: {
      box: {
        disabled: detectors.length === 0,
        incremental: true,
        schema: true,
      },
    },
    hasActions: true,
    pagination: true,
    sorting: true,
    message: empty,
  };



  return (
    //<div className="associated-detectors">
    <EuiFlyout
      ownFocus
      size="m"
      onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="associated-detectors__title">
            Associated detectors {detectors.length > 0 ? `(${detectors.length})` : ''}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <h4>{title}</h4>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiInMemoryTable {...tableProps} />
      </EuiFlyoutBody>
    </EuiFlyout>

    //</div>
  );
};

export default AssociatedDetectors;
