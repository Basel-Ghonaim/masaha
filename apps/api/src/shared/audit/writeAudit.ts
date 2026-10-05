import type { Tx } from '../../db/index.ts';

/** The values an entry records of its entity, before and after the change. */
export type AuditValues = Readonly<Record<string, string | number | boolean | null>>;

/** One audited action. The calling service names the action and the entity; the writer knows none. */
export interface AuditEntry {
  /** Null for the system (for example, auto check-out). */
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  spaceId?: number;
  before?: AuditValues;
  after?: AuditValues;
}

/** Appends an entry in the caller's transaction, so it commits or rolls back with its change. */
export type AuditWriter = (entry: AuditEntry, tx: Tx) => Promise<void>;

/**
 * The audit writer (docs/backend/conventions.md §6): the only writer of the audit table, and
 * append-only: it inserts, and nothing changes or removes an entry.
 */
export const writeAudit: AuditWriter = async (entry, tx) => {
  await tx.auditLog.create({ data: entry, select: { id: true } });
};
