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

import React from 'react';
import { render } from '@testing-library/react';
import ContentPanel from './ContentPanel';

describe('<ContentPanel /> spec', () => {
  test('renders the component', () => {
    const { container } = render(
      <ContentPanel
        title="Testing"
        actions={[<div>Hello</div>, <div>World</div>]}
      >
        <div>Testing ContentPanel</div>
      </ContentPanel>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders actions', () => {
    const { getByText } = render(
      <ContentPanel
        title="Testing"
        actions={[<div>Hello</div>, <div>World</div>]}
      >
        <div>Testing ContentPanel</div>
      </ContentPanel>
    );
    getByText('Hello');
    getByText('World');
  });

  test('renders array title', () => {
    const { getByText } = render(
      <ContentPanel
        title={['testing-1', 'testing-2']}
        actions={[<div>Hello</div>, <div>World</div>]}
      >
        <div>Testing ContentPanel</div>
      </ContentPanel>
    );
    getByText('testing-1');
    getByText('testing-2');
  });
  test('renders array subtitle', () => {
    const { getByText } = render(
      <ContentPanel
        title="Testing"
        subTitle={['testing-1', 'testing-2']}
        actions={[<div>Hello</div>, <div>World</div>]}
      >
        <div>Testing ContentPanel</div>
      </ContentPanel>
    );
    getByText('testing-1');
    getByText('testing-2');
  });
});
