import type { AuditPeriod } from '@masaha/shared/audit';
import type { AuditActorKey } from './AuditActorKey';

/**
 * A log's query as sent (docs/api/api-contract.md › Audit log): `actions` a comma list, as the
 * server reads it.
 */
export type AuditRequest = {
  period: AuditPeriod;
  q?: string;
  actions?: string;
  actor?: AuditActorKey;
  page: number;
  limit: number;
};
