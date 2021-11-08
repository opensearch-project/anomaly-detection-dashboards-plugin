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


import { CREATE_AD } from '../../../utils/constants';
import { buildAdAppUrl } from '../../../utils/helpers';

context('Create detector', () => {
  it.skip('Create detector - from dashboard', () => {
    cy.mockSearchIndexOnAction('search_index_response.json', () => {
      cy.visit(buildAdAppUrl(CREATE_AD));
    });

    cy.contains('h1', 'Create detector');

    const detectorName = 'detector-name';
    cy.get('input[name="detectorName"]').type(detectorName, { force: true });

    cy.mockGetIndexMappingsOnAction('index_mapping_response.json', () => {
      cy.get('input[role="textbox"]').first().type('e2e-test-index{enter}', {
        force: true,
      });
    });

    cy.get('input[role="textbox"]').last().type('timestamp{enter}', {
      force: true,
    });

    cy.mockCreateDetectorOnAction('post_detector_response.json', () => {
      cy.get('[data-test-subj=createOrSaveDetectorButton]').click({
        force: true,
      });
    });

    cy.contains('h1', detectorName);
    cy.contains('h3', 'Detector configuration');
  });
});
