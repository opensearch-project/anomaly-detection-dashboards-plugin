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

// Mock core server module that MDSEnabledClientService imports for types only.
jest.mock('../../../../../src/core/server', () => ({}), { virtual: true });

import { MDSEnabledClientService, WorkspaceAuthorizer } from '../MDSEnabledClientService';

// Concrete test subclass — the base class is abstract only in intent; tests
// need an instantiable class. We expose the protected helpers used by real
// handlers so tests can exercise them directly.
class TestService extends MDSEnabledClientService {
  // Promote protected helpers to public for testability.
  public async isUnsupportedEndpointPublic(context: any, request: any) {
    return this.isUnsupportedEndpoint(context, request);
  }
}

interface MockContext {
  core: {
    savedObjects: {
      client: { get: jest.Mock };
    };
  };
}

const createMockContext = (
  endpoint: string | undefined = 'https://col.us-west-2.aoss.amazonaws.com',
  { throwOnGet = false }: { throwOnGet?: boolean } = {}
): MockContext => ({
  core: {
    savedObjects: {
      client: {
        get: throwOnGet
          ? jest.fn().mockRejectedValue(new Error('saved object not found'))
          : jest.fn().mockResolvedValue({
              attributes: endpoint === undefined ? {} : { endpoint },
            }),
      },
    },
  },
});

const createMockReq = (
  overrides: { query?: any; params?: any } = {}
): any => ({
  query: { dataSourceId: 'ds-1', ...(overrides.query ?? {}) },
  params: { id: 'det-1', ...(overrides.params ?? {}) },
  body: {},
  headers: {},
});

const createMockRes = () => ({
  ok: jest.fn((payload: any) => payload),
  unauthorized: jest.fn((payload: any) => ({ unauthorized: true, ...payload })),
  custom: jest.fn((payload: any) => ({ custom: true, ...payload })),
});

// Helpers to construct a workspace authorizer stub.
const buildWorkspaceStart = (
  options: {
    authorized?: boolean;
    patterns?: string[];
    unauthorizedWorkspaces?: string[];
  } = {}
): WorkspaceAuthorizer & { authorizeWorkspace: jest.Mock } => {
  const {
    authorized = true,
    patterns = ['.aoss.amazonaws.com'],
    unauthorizedWorkspaces = [],
  } = options;
  return {
    authorizeWorkspace: jest
      .fn()
      .mockResolvedValue(
        authorized
          ? { authorized: true }
          : { authorized: false, unauthorizedWorkspaces }
      ),
    aclEnforceEndpointPatterns: patterns,
  };
};

const setupService = (
  options: {
    authorized?: boolean;
    patterns?: string[];
    workspaceId?: string | undefined;
    skipWorkspaceStart?: boolean;
  } = {}
) => {
  const service = new TestService(/* client */ {}, /* dataSourceEnabled */ true);
  const workspaceStart = buildWorkspaceStart({
    authorized: options.authorized,
    patterns: options.patterns,
  });
  if (!options.skipWorkspaceStart) {
    service.setWorkspaceStart(workspaceStart);
  }
  service.setWorkspaceIdGetter(() =>
    'workspaceId' in options ? options.workspaceId : 'ws-1'
  );
  return { service, workspaceStart };
};

describe('MDSEnabledClientService', () => {
  let mockRes: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    mockRes = createMockRes();
  });

  describe('isUnsupportedEndpoint', () => {
    it('returns false when no dataSourceId is present', async () => {
      const { service } = setupService();
      const context = createMockContext();
      const req = createMockReq({ query: { dataSourceId: undefined } });

      expect(
        await service.isUnsupportedEndpointPublic(context, req)
      ).toBe(false);
    });

    it('returns false when endpoint does not match any ACL pattern', async () => {
      const { service } = setupService();
      const context = createMockContext(
        'https://search-domain.us-west-2.es.amazonaws.com'
      );
      const req = createMockReq();

      expect(
        await service.isUnsupportedEndpointPublic(context, req)
      ).toBe(false);
    });

    it('returns true when endpoint matches an ACL pattern (AOSS)', async () => {
      const { service } = setupService();
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      expect(
        await service.isUnsupportedEndpointPublic(context, req)
      ).toBe(true);
    });

    it('returns false when no ACL patterns are configured', async () => {
      const { service } = setupService({ patterns: [] });
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      expect(
        await service.isUnsupportedEndpointPublic(context, req)
      ).toBe(false);
    });

    it('returns false when workspaceStart is not injected (pre-workspaces OSD)', async () => {
      const { service } = setupService({ skipWorkspaceStart: true });
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      expect(
        await service.isUnsupportedEndpointPublic(context, req)
      ).toBe(false);
    });

    it('falls open (returns false) when saved object lookup throws', async () => {
      const { service } = setupService();
      const context = createMockContext(undefined, { throwOnGet: true });
      const req = createMockReq();

      expect(
        await service.isUnsupportedEndpointPublic(context, req)
      ).toBe(false);
    });

    it('reads dataSourceId from request.params when not in request.query', async () => {
      const { service } = setupService();
      const context = createMockContext();
      const req = createMockReq({
        query: { dataSourceId: undefined },
        params: { dataSourceId: 'ds-from-params' },
      });

      expect(
        await service.isUnsupportedEndpointPublic(context, req)
      ).toBe(true);
      expect(context.core.savedObjects.client.get).toHaveBeenCalledWith(
        'data-source',
        'ds-from-params'
      );
    });
  });

  describe('rejectIfUnsupported', () => {
    it('returns 501 when the endpoint is ACL-enforced', async () => {
      const { service } = setupService();
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      const result = await service.rejectIfUnsupported(
        context as any,
        req,
        mockRes as any
      );
      expect(mockRes.custom).toHaveBeenCalledWith({
        statusCode: 501,
        body: { message: 'This operation is not supported on this endpoint.' },
      });
      expect(result).toEqual(
        expect.objectContaining({ custom: true, statusCode: 501 })
      );
    });

    it('returns undefined when the endpoint is not ACL-enforced', async () => {
      const { service } = setupService();
      const context = createMockContext(
        'https://search-domain.us-west-2.es.amazonaws.com'
      );
      const req = createMockReq();

      const result = await service.rejectIfUnsupported(
        context as any,
        req,
        mockRes as any
      );
      expect(mockRes.custom).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('enforceWorkspaceAcl', () => {
    it('returns undefined (passes) when the endpoint is not ACL-enforced', async () => {
      const { service, workspaceStart } = setupService();
      const context = createMockContext(
        'https://search-domain.us-west-2.es.amazonaws.com'
      );
      const req = createMockReq();

      const result = await service.enforceWorkspaceAcl(
        context as any,
        req,
        mockRes as any,
        ['library_write']
      );
      expect(result).toBeUndefined();
      expect(workspaceStart.authorizeWorkspace).not.toHaveBeenCalled();
    });

    it('returns undefined (passes) when the request lacks a workspaceId', async () => {
      const { service, workspaceStart } = setupService({
        workspaceId: undefined,
      });
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      const result = await service.enforceWorkspaceAcl(
        context as any,
        req,
        mockRes as any,
        ['library_read']
      );
      expect(result).toBeUndefined();
      expect(workspaceStart.authorizeWorkspace).not.toHaveBeenCalled();
    });

    it('returns undefined when authorizeWorkspace says authorized', async () => {
      const { service, workspaceStart } = setupService({ authorized: true });
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      const result = await service.enforceWorkspaceAcl(
        context as any,
        req,
        mockRes as any,
        ['library_write']
      );
      expect(result).toBeUndefined();
      expect(workspaceStart.authorizeWorkspace).toHaveBeenCalledWith(
        req,
        ['ws-1'],
        ['library_write']
      );
    });

    it('returns 401 unauthorized when authorizeWorkspace says not authorized', async () => {
      const { service, workspaceStart } = setupService({ authorized: false });
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      const result = await service.enforceWorkspaceAcl(
        context as any,
        req,
        mockRes as any,
        ['library_write']
      );
      expect(workspaceStart.authorizeWorkspace).toHaveBeenCalled();
      expect(mockRes.unauthorized).toHaveBeenCalledWith({
        body: { message: 'Workspace ACL check failed: unauthorized' },
      });
      expect(result).toEqual(
        expect.objectContaining({ unauthorized: true })
      );
    });

    it('defaults permissionModes to ["read"] when omitted', async () => {
      const { service, workspaceStart } = setupService({ authorized: true });
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      await service.enforceWorkspaceAcl(context as any, req, mockRes as any);
      expect(workspaceStart.authorizeWorkspace).toHaveBeenCalledWith(
        req,
        ['ws-1'],
        ['read']
      );
    });

    it('returns undefined when workspaceStart is not injected', async () => {
      const { service } = setupService({ skipWorkspaceStart: true });
      const context = createMockContext(
        'https://col.us-west-2.aoss.amazonaws.com'
      );
      const req = createMockReq();

      const result = await service.enforceWorkspaceAcl(
        context as any,
        req,
        mockRes as any,
        ['library_write']
      );
      expect(result).toBeUndefined();
      expect(mockRes.unauthorized).not.toHaveBeenCalled();
    });
  });
});
