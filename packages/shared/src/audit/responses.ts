import type { PaginationMeta } from '../core/index.ts';
import type { AuditEntityType } from './actions.ts';

// The audit logs' answers (docs/api/api-contract.md › Audit log).

/**
 * Who acted: a person, named; `MASAHA`, the platform — to a space's owner, anyone with no link of any
 * state to the space, never named; or `SYSTEM`, a timed job.
 */
export type AuditActor =
  { kind: 'PERSON'; id: number; name: string } | { kind: 'MASAHA' } | { kind: 'SYSTEM' };

/**
 * What an entry is about: its type and id, its current name where it has one (a space's and a
 * lookup's in both languages; a person's, a customer's, a subscription's, a package's; a visit's
 * visitor or customer; a check-in's customer), and whether it is deleted (a space, an announcement).
 */
export interface AuditTarget {
  type: AuditEntityType;
  id: number | null;
  name: string | null;
  nameAr: string | null;
  deleted: boolean;
}

/** One entry, newest first: its action as stored, its time, who, what, and its values as stored. */
export interface AuditEntry {
  id: number;
  at: string;
  action: string;
  actor: AuditActor;
  target: AuditTarget;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/** A page's `meta`, with the period's actors under every filter but `actor` (at most 50). */
export type AuditMeta = PaginationMeta & { actors: AuditActor[] };
