import type { AuditActor, AuditEntry, SpaceAuditQuery } from '@masaha/shared/audit';

import { toSkip } from '../../shared/http/index.ts';
import { toAuditActor, toAuditEntry } from './audit.mapper.ts';
import { createAuditRepository } from './audit.repository.ts';
import { auditPeriodStart } from './auditPeriod.ts';

interface Dependencies {
  /** The one clock (conventions §11). */
  now: () => Date;
}

/**
 * The audit logs' reader (docs/backend/conventions.md §6), a read model (R7): it reads the audit
 * table with its actors' and targets' names in its own queries, imports no module and writes nothing.
 * A log is history: it is read without a lock.
 */
export function createAuditService({ now }: Dependencies) {
  const repository = createAuditRepository();

  return {
    /**
     * A page of the space's log, the owner's: every entry of the space, newest first, the admin as
     * `MASAHA` (S1); filtered by period, target's name, actor and actions before the page is cut;
     * with the period's actors.
     */
    async spaceLog(
      spaceId: number,
      { period, q, actions, actor, page, limit }: SpaceAuditQuery,
    ): Promise<{ rows: AuditEntry[]; total: number; actors: AuditActor[] }> {
      const { rows, total, actors } = await repository.spaceLog(
        spaceId,
        { since: auditPeriodStart(period, now()), q, actions, actor },
        { skip: toSkip({ page, limit }), take: limit },
      );
      return { rows: rows.map(toAuditEntry), total, actors: actors.map(toAuditActor) };
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
