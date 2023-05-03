/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { shallow } from 'enzyme';
import EnhancedAccordion from './EnhancedAccordion';

describe('EnhancedAccordion', () => {
  test('renders', () => {
    const wrapper = shallow(<EnhancedAccordion />);
    expect(wrapper).toMatchSnapshot();
  });
});
