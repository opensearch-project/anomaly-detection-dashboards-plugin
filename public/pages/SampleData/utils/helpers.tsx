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

/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import React from 'react';
import { isEmpty, get } from 'lodash';
import { EuiDataGrid } from '@elastic/eui';
import { CatIndex } from '../../../../server/models/types';
import { Detector, DetectorListItem } from '../../../models/interfaces';
import { ANOMALY_DETECTORS_INDEX } from '../../../utils/constants';
import { SAMPLE_TYPE } from '../../../../server/utils/constants';
import {
  sampleHttpResponses,
  sampleEcommerce,
  sampleHostHealth,
} from './constants';

export const containsDetectorsIndex = (indices: CatIndex[]) => {
  if (isEmpty(indices)) {
    return false;
  }
  return indices.map((index) => index.index).includes(ANOMALY_DETECTORS_INDEX);
};

export const containsSampleIndex = (
  indices: CatIndex[],
  sampleType: SAMPLE_TYPE
) => {
  let indexName = '';
  let legacyIndexName = '';
  switch (sampleType) {
    case SAMPLE_TYPE.HTTP_RESPONSES: {
      indexName = sampleHttpResponses.indexName;
      legacyIndexName = sampleHttpResponses.legacyIndexName;
      break;
    }
    case SAMPLE_TYPE.ECOMMERCE: {
      indexName = sampleEcommerce.indexName;
      legacyIndexName = sampleEcommerce.legacyIndexName;
      break;
    }
    case SAMPLE_TYPE.HOST_HEALTH: {
      indexName = sampleHostHealth.indexName;
      legacyIndexName = sampleHostHealth.legacyIndexName;
      break;
    }
  }
  // Checking for legacy sample indices
  const indexNames = indices.map((index) => index.index);
  return indexNames.includes(indexName) || indexNames.includes(legacyIndexName);
};

export const getSampleDetector = (
  detectors: DetectorListItem[],
  sampleType: SAMPLE_TYPE
) => {
  let detectorName = '';
  let legacyDetectorName = '';
  switch (sampleType) {
    case SAMPLE_TYPE.HTTP_RESPONSES: {
      detectorName = sampleHttpResponses.detectorName;
      legacyDetectorName = sampleHttpResponses.legacyDetectorName;
      break;
    }
    case SAMPLE_TYPE.ECOMMERCE: {
      detectorName = sampleEcommerce.detectorName;
      legacyDetectorName = sampleEcommerce.legacyDetectorName;
      break;
    }
    case SAMPLE_TYPE.HOST_HEALTH: {
      detectorName = sampleHostHealth.detectorName;
      legacyDetectorName = sampleHostHealth.legacyDetectorName;
      break;
    }
  }
  // Checking for legacy sample detectors
  return get(
    detectors.filter(
      (detector) =>
        detector.name.includes(detectorName) ||
        detector.name.includes(legacyDetectorName)
    ),
    '0',
    undefined
  );
};

export const detectorIsSample = (detector: Detector) => {
  return (
    detector.name === sampleHttpResponses.detectorName ||
    detector.name === sampleHttpResponses.legacyDetectorName ||
    detector.name === sampleEcommerce.detectorName ||
    detector.name === sampleEcommerce.legacyDetectorName ||
    detector.name === sampleHostHealth.detectorName ||
    detector.name === sampleHostHealth.legacyDetectorName
  );
};

export const getDetectorId = (
  detectors: DetectorListItem[],
  detectorName: string,
  legacyDetectorName: string
) => {
  let detectorId = '';
  detectors.some((detector) => {
    if (
      detector.name === detectorName ||
      detector.name === legacyDetectorName
    ) {
      detectorId = detector.id;
      return true;
    }
    return false;
  });
  return detectorId;
};

const getFieldsAndTypesData = (fields: string[], types: string[]) => {
  let data = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const type = types[i];
    data.push({
      Field: field,
      Type: type,
    });
  }
  return data;
};

const getFeaturesAndAggsAndFieldsData = (
  features: string[],
  aggs: string[],
  fields: string[]
) => {
  let data = [];
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const agg = aggs[i];
    const field = fields[i];
    data.push({
      Feature: feature,
      Aggregation: agg,
      'Index field': field,
    });
  }
  return data;
};

export const getFieldsAndTypesGrid = (fields: string[], types: string[]) => {
  const gridData = getFieldsAndTypesData(fields, types);
  return (
    <EuiDataGrid
      aria-label="Index fields and types"
      columns={[
        {
          id: 'Field',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
        {
          id: 'Type',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
      ]}
      columnVisibility={{
        visibleColumns: ['Field', 'Type'],
        setVisibleColumns: () => {},
      }}
      rowCount={gridData.length}
      renderCellValue={({ rowIndex, columnId }) =>
        //@ts-ignore
        gridData[rowIndex][columnId]
      }
      gridStyle={{
        border: 'horizontal',
        header: 'shade',
        rowHover: 'highlight',
        stripes: true,
      }}
      toolbarVisibility={false}
    />
  );
};

export const getFeaturesAndAggsAndFieldsGrid = (
  features: string[],
  aggs: string[],
  fields: string[]
) => {
  const gridData = getFeaturesAndAggsAndFieldsData(features, aggs, fields);
  return (
    <EuiDataGrid
      aria-label="Feature details"
      columns={[
        {
          id: 'Feature',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
        {
          id: 'Aggregation',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
        {
          id: 'Index field',
          isResizable: false,
          isExpandable: false,
          isSortable: false,
        },
      ]}
      columnVisibility={{
        visibleColumns: ['Feature', 'Aggregation', 'Index field'],
        setVisibleColumns: () => {},
      }}
      rowCount={gridData.length}
      renderCellValue={({ rowIndex, columnId }) =>
        //@ts-ignore
        gridData[rowIndex][columnId]
      }
      gridStyle={{
        border: 'horizontal',
        header: 'shade',
        rowHover: 'highlight',
        stripes: true,
      }}
      toolbarVisibility={false}
    />
  );
};
