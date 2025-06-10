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
import { IndexOption } from '../IndexOption';

describe('<IndexOptions /> spec', () => {
  test('renders the component', () => {
    const { container } = render(
      <IndexOption
        option={{ health: 'green', label: 'logstash-1234' }}
        searchValue=""
        contentClassName=""
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders with highlight', () => {
    const { container } = render(
      <IndexOption
        option={{ health: 'green', label: 'logstash-1234' }}
        searchValue="logs"
        contentClassName=""
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
