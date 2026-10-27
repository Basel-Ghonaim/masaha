import type {
  AuditActor,
  AuditEntry,
  PlatformAuditEntry,
  PlatformAuditQuery,
  SpaceAuditQuery,
} from '@masaha/shared/audit';

import { toSkip } from '../../shared/http/index.ts';
import { toAuditActor, toAuditEntry, toPlatformAuditEntry } from './audit.mapper.ts';
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

    /**
     * A page of the admin's log: the platform's events only, by the default-deny list
     * (`platformEvents.ts`), of every space and of none, each with its space; filtered as the
     * owner's, the actor a person's id; with the period's actors.
     */
    async platformLog({ period, q, actions, actor, page, limit }: PlatformAuditQuery): Promise<{
      rows: PlatformAuditEntry[];
      total: number;
      actors: AuditActor[];
    }> {
      const { rows, total, actors } = await repository.platformLog(
        { since: auditPeriodStart(period, now()), q, actions, actor },
        { skip: toSkip({ page, limit }), take: limit },
      );
      return { rows: rows.map(toPlatformAuditEntry), total, actors: actors.map(toAuditActor) };
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
