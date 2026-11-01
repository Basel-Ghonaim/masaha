import type { AuditRequest } from '../types/AuditRequest';

/**
 * The capability's keys, each under its audience's scope (docs/frontend/architecture.md §7): a
 * space's log under the space's, the platform's under the admin's.
 */
export const auditKeys = {
  /** One page of a space's log, by its whole query. */
  space: (spaceId: number, request: AuditRequest) => ['space', spaceId, 'audit', request] as const,
  /** One page of the platform's log, by its whole query. */
  platform: (request: AuditRequest) => ['admin', 'audit', request] as const,
};
