import type { AuditActor, AuditEntityType, AuditEntry } from '@masaha/shared/audit';

import type { ActorRow, AuditRow } from './audit.repository.ts';

/** An entry as the owner's log shows it: the platform's actor `MASAHA`, never named (S1). */
export function toAuditEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    at: row.createdAt.toISOString(),
    action: row.action,
    actor: toActor(row),
    target: {
      type: row.entityType as AuditEntityType,
      id: row.entityId,
      name: row.targetName,
      nameAr: row.targetNameAr,
      deleted: row.targetDeleted,
    },
    before: row.before,
    after: row.after,
  };
}

function toActor({ actorId, linked, actorName }: AuditRow): AuditActor {
  if (actorId === null) return { kind: 'SYSTEM' };
  if (!linked) return { kind: 'MASAHA' };
  return { kind: 'PERSON', id: actorId, name: actorName ?? '' };
}

/** An actor of `meta.actors`, as the contract's `AuditActor`. */
export function toAuditActor(row: ActorRow): AuditActor {
  return row.kind === 'PERSON'
    ? { kind: 'PERSON', id: row.id, name: row.name }
    : { kind: row.kind };
}
