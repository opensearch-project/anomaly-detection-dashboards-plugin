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

import '@testing-library/jest-dom/extend-expect';
import { configure } from '@testing-library/react';

configure({ testIdAttribute: 'data-test-subj' });

jest.mock(
  '@elastic/eui/lib/components/form/form_row/make_id',
  () => () => 'random_id'
);

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => {
    return () => 'random_html_id';
  },
}));

// address issue: https://github.com/opensearch-project/anomaly-detection-dashboards-plugin/issues/832
jest.mock('@osd/monaco', () => ({}));

//for mocking window.scroll(0,0)
const noop = () => {};
Object.defineProperty(window, 'scroll', { value: noop, writable: true });

// for Plotly
//@ts-ignore
window.URL.createObjectURL = function () {};
