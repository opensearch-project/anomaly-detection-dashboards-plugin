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

import { HttpSetup } from '../../../../src/core/public';

const httpClientMock = jest.fn() as any;

httpClientMock.delete = jest.fn();
httpClientMock.get = jest.fn();
httpClientMock.head = jest.fn();
httpClientMock.post = jest.fn();
httpClientMock.put = jest.fn();

export default httpClientMock as HttpSetup;
