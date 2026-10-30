import type { AuditEntry, AuditMeta, PlatformAuditEntry } from '@masaha/shared/audit';
import { api, type Page } from '@shared/api';
import type { AuditRequest } from '../types/AuditRequest';

/**
 * The audit logs on the server (docs/api/api-contract.md › Audit log): a space's, its owner's, with
 * the admin as Masaha; the platform's events, the admin's, each with the space it names.
 */
export interface AuditRepository {
  /** A page of the space's entries the query keeps, newest first, with the period's actors. */
  space(spaceId: number, request: AuditRequest): Promise<Page<AuditEntry[], AuditMeta>>;
  /** A page of the platform's events the query keeps, newest first, with the period's actors. */
  platform(request: AuditRequest): Promise<Page<PlatformAuditEntry[], AuditMeta>>;
}

export function createAuditRepository(): AuditRepository {
  return {
    space: (spaceId, request) =>
      api.getPage<AuditEntry[], AuditMeta>(`/manage/spaces/${String(spaceId)}/audit-log`, {
        params: request,
      }),
    platform: (request) =>
      api.getPage<PlatformAuditEntry[], AuditMeta>('/admin/audit-log', { params: request }),
  };
}
