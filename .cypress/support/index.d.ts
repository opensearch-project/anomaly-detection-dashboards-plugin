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

declare namespace Cypress {
  interface Chainable<Subject> {
    mockGetDetectorOnAction(
      fixtureFileName: string,
      funcMockedOn: VoidFunction
    ): Chainable<any>;
    mockCreateDetectorOnAction(
      fixtureFileName: string,
      funcMockedOn: VoidFunction
    ): Chainable<any>;
    mockSearchIndexOnAction(
      fixtureFileName: string,
      funcMockedOn: VoidFunction
    ): Chainable<any>;
    mockSearchOnAction(
      fixtureFileName: string,
      funcMockedOn: VoidFunction
    ): Chainable<any>;
    mockGetIndexMappingsOnAction(
      fixtureFileName: string,
      funcMockedOn: VoidFunction
    ): Chainable<any>;
    mockStartDetectorOnAction(
      fixtureFileName: string,
      detectorId: string,
      funcMockedOn: VoidFunction
    ): Chainable<any>;
    mockStopDetectorOnAction(
      fixtureFileName: string,
      detectorId: string,
      funcMockedOn: VoidFunction
    ): Chainable<any>;
    mockDeleteDetectorOnAction(
      fixtureFileName: string,
      detectorId: string,
      funcMockedOn: VoidFunction
    ): Chainable<any>;
  }
}
