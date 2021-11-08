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
import { ConfirmModal } from '../ConfirmModal';

describe('<ConfirmModal /> spec', () => {
  const onClose = jest.fn();
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const component = <div>mock component</div>;
  describe('Confirm Modal', () => {
    test('renders component with callout', () => {
      const { container } = render(
        <ConfirmModal
          title="test confirm modal"
          description="this is a testing description"
          callout="test callout"
          confirmButtonText=""
          confirmButtonColor="primary"
          onClose={onClose}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      );
      expect(container).toMatchSnapshot();
    });

    test('renders component with empty callout', () => {
      const { container } = render(
        <ConfirmModal
          title="test confirm modal"
          description="this is a testing description"
          confirmButtonText=""
          confirmButtonColor="primary"
          onClose={onClose}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});
