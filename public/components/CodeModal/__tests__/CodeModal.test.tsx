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
import { CodeModal } from '../CodeModal';

describe('CodeMOdal spec', () => {
  const onVisibilityChange = jest.fn(() => true);
  const onCloseModal = jest.fn();

  test('renders the component', () => {
    const { container } = render(
      <CodeModal
        code="xyz"
        title="123"
        subtitle="abc"
        getModalVisibilityChange={onVisibilityChange}
        closeModal={onCloseModal}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
